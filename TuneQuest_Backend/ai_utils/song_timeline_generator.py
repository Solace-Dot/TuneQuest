import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"

# ─── Songs the AI knows confidently (verified accuracy) ──────────────────────
VERIFIED_SONGS = {
    "ode to joy", "twinkle twinkle little star", "mary had a little lamb",
    "happy birthday", "jingle bells", "amazing grace", "greensleeves",
    "house of the rising sun", "smoke on the water", "seven nation army",
    "wonderwall", "knockin on heavens door", "knocking on heaven's door",
    "hotel california", "stairway to heaven", "wish you were here",
    "nothing else matters", "tears in heaven", "hallelujah", "blackbird",
    "yesterday", "let it be", "hey jude", "canon in d", "fur elise",
    "la vie en rose", "scarborough fair",
}

# ─── Level-locked constraints ─────────────────────────────────────────────────
CONSTRAINTS = {
    "beginner": {
        "note_range": (
            "ONLY use notes playable in the first 3 frets on strings 1 (high E) and 2 (B). "
            "String 1 (E4) first 3 frets: E4, F4, F#4, G4. "
            "String 2 (B3) first 3 frets: B3, C4, C#4, D4. "
            "Do NOT use notes on strings 3-6 or beyond fret 3."
        ),
        "chord_set": (
            "ONLY use these beginner open chords: C, Am, G, Em, D. "
            "Do NOT use any barre chords or jazz chords."
        ),
        "rhythm": (
            "Use ONLY quarter notes (duration: 1.0) and half notes (duration: 2.0). "
            "No dotted rhythms, no 8th notes, no 16th notes."
        ),
        "max_beats": 32,
        "max_events": 24,
        "bpm_range": "50–80",
    },
    "intermediate": {
        "note_range": (
            "Use notes across all 6 strings. Maximum fret is 7. "
            "Use full note labels like 'E2', 'A3', 'D4', 'G3', 'B4', 'E4'."
        ),
        "chord_set": (
            "Use any chord including barre chords (Bm, F, B7, Dm, A, E, Am7, Fmaj7, etc.)."
        ),
        "rhythm": (
            "Quarter notes (1.0), dotted quarter (1.5), eighth notes (0.5), "
            "and half notes (2.0) are all allowed."
        ),
        "max_beats": 64,
        "max_events": 48,
        "bpm_range": "70–130",
    },
}

TIMELINE_FUNCTION = {
    "name": "create_song_timeline",
    "description": "Create a guitar rhythm-game timeline for a specific song, arranged for the student's skill level",
    "parameters": {
        "type": "object",
        "properties": {
            "bpm": {
                "type": "number",
                "description": "Tempo in beats per minute",
            },
            "arrangement_title": {
                "type": "string",
                "description": "Descriptive title e.g. 'Ode to Joy – Beginner Arrangement'",
            },
            "is_verified": {
                "type": "boolean",
                "description": (
                    "True if this is a well-known song the AI can transcribe accurately. "
                    "False if the AI is creating an original inspired arrangement."
                ),
            },
            "timeline": {
                "type": "array",
                "description": "Ordered note/chord events for the rhythm game",
                "items": {
                    "type": "object",
                    "properties": {
                        "beat": {
                            "type": "number",
                            "description": "Beat position, 1-indexed, increases monotonically",
                        },
                        "type": {
                            "type": "string",
                            "enum": ["note", "chord"],
                        },
                        "value": {
                            "type": "string",
                            "description": "Note label like 'E4' or chord label like 'Am'",
                        },
                        "duration": {
                            "type": "number",
                            "description": "Duration in beats: 0.5=eighth, 1.0=quarter, 2.0=half",
                        },
                    },
                    "required": ["beat", "type", "value", "duration"],
                },
            },
        },
        "required": ["bpm", "arrangement_title", "is_verified", "timeline"],
    },
}


class SongTimelineGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        self.client = genai.Client(api_key=api_key)

    def _is_verified(self, song_title: str) -> bool:
        return song_title.lower().strip() in VERIFIED_SONGS

    def generate(
        self,
        song_title: str,
        skill_level: str,
        instrument: str = "Guitar",
        practice_card_title: str = "",
        practice_card_description: str = "",
        practice_card_category: str = "",
        generation_intent: str = "",
    ) -> dict:
        """
        Call Gemini to produce a level-locked song timeline.

        Returns a dict with keys:
            bpm, arrangement_title, is_verified, is_ai_composed,
            skill_level, song_title, timeline
        """
        level_key = "beginner" if skill_level.lower() == "beginner" else "intermediate"
        c = CONSTRAINTS[level_key]
        subject_title = song_title.strip() or practice_card_title.strip() or "Custom Practice Study"
        verified = self._is_verified(subject_title)
        has_card_context = bool(practice_card_title.strip() or practice_card_description.strip())

        composer_note = "" if verified else (
            "\nIMPORTANT: This song may not be in your training data. "
            "Create an original inspired arrangement that captures the song's mood and key. "
            "Do NOT attempt exact transcription — focus on a singable, recognisable melody fragment."
        )

        card_context_block = ""
        if has_card_context:
            card_context_block = f"""

PRACTICE CARD CONTEXT (MANDATORY ALIGNMENT):
- Card Title: {practice_card_title or subject_title}
- Card Category: {practice_card_category or "General"}
- Card Description: {practice_card_description or "No description provided."}
- Generation Intent: {generation_intent or "practice_card"}

CARD ALIGNMENT RULES:
- The timeline MUST directly reflect the card title and description.
- Prioritise technique goals from the description over generic song ideas.
- If card asks for warm-up, use slower tempos, repetitive motifs, and fluid motion patterns.
- If card asks for fretting-hand focus, include stepwise melodic movement and manageable fingering.
- If card asks for strumming/picking focus, include rhythmic chord events that reinforce that pattern.
- Arrangement title should clearly reference the card title.
"""

        prompt = f"""You are a music game content creator for a guitar learning app.
Generate a rhythm-game timeline for the following song, adapted for the student's level.

Song: {subject_title}
Instrument: {instrument}
Skill Level: {skill_level}
{composer_note}
{card_context_block}

STRICT LEVEL RULES — you MUST follow these exactly:
1. Note range: {c['note_range']}
2. Chord set: {c['chord_set']}
3. Rhythm: {c['rhythm']}
4. Max total beats in timeline: {c['max_beats']}
5. Max number of events (notes + chords combined): {c['max_events']}
6. BPM must be in the range {c['bpm_range']}.

GENERAL RULES:
- Beat positions must start at 1 and increase monotonically.
- Mix notes for melody and chords for harmony naturally.
- Note values must be in the format "E4", "F#3", "Bb2" (letter, optional accidental, octave digit).
- Chord values must be simple guitar chord names: "Am", "C", "G", "Em", "D", "Bm", "F".
- All events must have all 4 fields: beat, type, value, duration.
- Keep the arrangement musical and representative of the song's character."""

        tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=TIMELINE_FUNCTION["name"],
                    description=TIMELINE_FUNCTION["description"],
                    parameters=TIMELINE_FUNCTION["parameters"],
                )
            ]
        )

        response = self.client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[tool]),
        )

        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    args = dict(part.function_call.args)
                    timeline = []
                    for raw_event in list(args.get("timeline", [])):
                        e = dict(raw_event)
                        timeline.append({
                            "beat":     float(e.get("beat", 1)),
                            "type":     str(e.get("type", "note")),
                            "value":    str(e.get("value", "E4")),
                            "duration": float(e.get("duration", 1.0)),
                        })

                    is_verified_flag = bool(args.get("is_verified", verified))
                    return {
                        "bpm":               float(args.get("bpm", 70)),
                        "arrangement_title": str(args.get("arrangement_title", subject_title)),
                        "is_verified":       is_verified_flag,
                        "is_ai_composed":    not is_verified_flag,
                        "skill_level":       skill_level,
                        "song_title":        subject_title,
                        "timeline":          timeline,
                    }

        raise ValueError("Gemini did not return a structured song timeline")
