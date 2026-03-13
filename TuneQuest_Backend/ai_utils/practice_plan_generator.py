import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

MODEL_NAME = "gemini-2.5-flash"

CATEGORY_TO_ROUTE = {
    "Technique": "SongManager",
    "Rhythm": "SongManager",
    "Repertoire": "SongManager",
    "Knowledge": "QuizPage",
    "Ear Training": "QuizPage",
    "Quizzes": "QuizPage",
}

ALIAS_TO_CATEGORY = {
    "technique": "Technique",
    "rhythm": "Rhythm",
    "knowledge": "Knowledge",
    "repertoire": "Repertoire",
    "ear training": "Ear Training",
    "ear-training": "Ear Training",
    "ear": "Ear Training",
    "quiz": "Quizzes",
    "quizzes": "Quizzes",
}

PLAN_FUNCTION = {
    "name": "create_practice_plan",
    "description": "Create a structured music practice plan with phases and exercises",
    "parameters": {
        "type": "object",
        "properties": {
            "plan_title": {
                "type": "string",
                "description": "Creative title for the practice plan",
            },
            "focus_summary": {
                "type": "string",
                "description": "Short 2-4 word focus summary, e.g. 'Rhythm & Technique'",
            },
            "steps": {
                "type": "array",
                "description": "Ordered practice steps",
                "items": {
                    "type": "object",
                    "properties": {
                        "phase": {
                            "type": "string",
                            "enum": ["Warm-up", "Core Work", "Challenge", "Cool Down"],
                        },
                        "title": {
                            "type": "string",
                            "description": "Creative, evocative name for this exercise",
                        },
                        "category": {
                            "type": "string",
                            "enum": [
                                "Technique",
                                "Rhythm",
                                "Knowledge",
                                "Repertoire",
                                "Ear Training",
                                "Quizzes",
                            ],
                        },
                        "route_to": {
                            "type": "string",
                            "enum": ["SongManager", "QuizPage"],
                            "description": "SongManager for generated-song playing/performance; QuizPage for theory or ear training quizzes",
                        },
                        "duration_minutes": {
                            "type": "integer",
                            "description": "Minutes for this step",
                        },
                        "description": {
                            "type": "string",
                            "description": "What the student should practise and why",
                        },
                    },
                    "required": [
                        "phase",
                        "title",
                        "category",
                        "route_to",
                        "duration_minutes",
                        "description",
                    ],
                },
            },
        },
        "required": ["plan_title", "focus_summary", "steps"],
    },
}


class PracticePlanGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")
        self.client = genai.Client(api_key=api_key)

    def generate(self, practice_data: dict) -> dict:
        """Call Gemini to generate a structured practice plan."""
        uc = practice_data.get("user_context", {})
        tg = practice_data.get("training_goals", {})
        sched = practice_data.get("schedule", {})
        pain = practice_data.get("pain_points", {})

        instrument = uc.get("instrument", "Guitar")
        instrument_type = uc.get("instrument_type", "")
        skill_level = uc.get("skill_level", "Beginner")
        has_metronome = uc.get("has_metronome", True)
        primary_path = tg.get("primary_path", "General improvement")
        focus_areas = ", ".join(tg.get("focus_areas", ["Technique"]))
        current_song = tg.get("current_song") or "None specified"
        time_available = sched.get("time_available_minutes", 30)
        frequency = sched.get("frequency_per_week", 3)
        frustration = pain.get("frustration_text") or "None specified"

        prompt = f"""Create a personalised music practice plan for this student:

Instrument: {instrument} {f"({instrument_type})" if instrument_type else ""}
Skill Level: {skill_level}
Has Metronome: {"Yes" if has_metronome else "No"}
Learning Goal: {primary_path}
Focus Areas: {focus_areas}
Current Song: {current_song}
Time Available: {time_available} minutes per session
Frequency: {frequency} times per week
Challenges/Frustrations: {frustration}

Rules:
- Create 3-5 steps that fit within {time_available} total minutes.
- Organise steps into phases: Warm-up → Core Work → Challenge → Cool Down.
- Use "SongManager" route_to for playing/performance exercises.
- Use "QuizPage" route_to for theory or ear-training quizzes.
- Category/route mapping is strict and must always match:
    Technique, Rhythm, Repertoire -> SongManager
    Knowledge, Ear Training, Quizzes -> QuizPage
- CATEGORY BEHAVIOR GUIDE (must match title + description):
        Knowledge:
            - Study phase; introduce concepts with maps/diagrams/instrument guides.
            - Core task: recognition of note/chord locations and theory facts.
            - Goal: prep for practical application without timer pressure.
        Quizzes:
            - Validation phase; test theory comprehension.
            - Core task: multiple-choice, matching, scale-degree or term identification.
            - Goal: produce measurable accuracy data and gate harder content.
        Ear Training:
            - Ear-to-instrument connection.
            - Core task: listen to an audio target (interval/chord quality/note ID) and identify it.
            - Goal: build play-by-ear and chord-quality recognition.
        Technique:
            - Physical dexterity/finger mechanics.
            - Core task: short looping drills (spider walks, scale runs, alternate picking).
            - Goal: mechanical finger control independent of full-song context.
        Rhythm:
            - Timing and strumming precision.
            - Core task: hit timing patterns with simple notes/percussive hits; rhythm-first focus.
            - Goal: stable beat control before layering complex changes.
        Repertoire:
            - Full musical application phase.
            - Core task: full song or substantial section with mixed notes/chords/holds.
            - Goal: integrate Knowledge, Technique, and Rhythm for mastery.
- Give each exercise a creative, evocative name that makes practise feel like an adventure.
- Descriptions should be instructional and specific to the student's instrument and level.
"""

        tool = types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=PLAN_FUNCTION["name"],
                    description=PLAN_FUNCTION["description"],
                    parameters=PLAN_FUNCTION["parameters"],
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
                    steps = list(args.get("steps", []))
                    for i, step in enumerate(steps):
                        category = self._normalize_category(step)
                        step["category"] = category
                        step["route_to"] = CATEGORY_TO_ROUTE[category]
                        step["id"] = f"ai_step_{i}"
                        step["status"] = "Not Started"
                        step["skill_level"] = skill_level
                    args["steps"] = steps
                    return args

        raise ValueError("AI did not return a structured plan")

    def _normalize_category(self, step: dict) -> str:
        raw = str(step.get("category", "")).strip()
        if raw in CATEGORY_TO_ROUTE:
            return raw

        lower_raw = raw.lower()
        if lower_raw in ALIAS_TO_CATEGORY:
            return ALIAS_TO_CATEGORY[lower_raw]

        combined = (
            f"{step.get('title', '')} {step.get('description', '')}"
        ).lower()

        if any(k in combined for k in ("ear", "listen", "interval", "identify by ear", "dictation")):
            return "Ear Training"
        if any(k in combined for k in ("theory", "key signature", "scale formula", "notation", "quiz")):
            return "Knowledge"
        if any(k in combined for k in ("rhythm", "metronome", "timing", "groove", "strumming pattern")):
            return "Rhythm"
        if any(k in combined for k in ("song", "repertoire", "arrangement", "performance piece")):
            return "Repertoire"

        route = str(step.get("route_to", "")).strip()
        if route == "QuizPage":
            return "Quizzes"

        return "Technique"
