import json
import logging
import re
from typing import Literal

from ai.gemini.client import get_model

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ──────────────────────────────────────────────────────────────


def generate_quiz(
    instrument: str,
    skill_level: Literal["beginner", "intermediate", "advanced"] = "beginner",
    quiz_type: Literal["theory", "listening", "both"] = "both",
    num_questions: int = 5,
    topic: str | None = None,
    is_premium: bool = False,
) -> dict:
    """
    Generate a quiz tailored to the user's instrument and level.

    Returns
    -------
    dict with keys:
        quiz_title   : str
        instrument   : str
        skill_level  : str
        quiz_type    : str
        questions    : list[dict]  (see _parse_quiz_json for schema)
        is_premium   : bool
    """
    num_questions = min(num_questions, 10 if is_premium else 5)
    prompt = _build_prompt(instrument, skill_level,
                           quiz_type, num_questions, topic, is_premium)

    try:
        model = get_model("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw_text = response.text
        logger.debug("Gemini raw response (quiz):\n%s", raw_text)
    except Exception as exc:
        logger.error("Gemini API error in quiz_generator: %s", exc)
        raise RuntimeError(f"Failed to generate quiz: {exc}") from exc

    questions = _parse_quiz_json(raw_text)

    return {
        "quiz_title":  _make_title(instrument, skill_level, topic),
        "instrument":  instrument,
        "skill_level": skill_level,
        "quiz_type":   quiz_type,
        "questions":   questions,
        "is_premium":  is_premium,
    }


# ──────────────────────────────────────────────────────────────
# PROMPT BUILDER
# ──────────────────────────────────────────────────────────────

def _build_prompt(
    instrument: str,
    skill_level: str,
    quiz_type: str,
    num_questions: int,
    topic: str | None,
    is_premium: bool,
) -> str:
    topic_clause = f"Focus specifically on the topic: **{topic}**." if topic else ""
    premium_note = (
        "The user has a premium subscription — include some advanced-difficulty "
        "questions and audio-context clues where relevant."
        if is_premium
        else "Keep all questions appropriate for free-tier users (basic to moderate difficulty)."
    )

    quiz_type_instructions = {
        "theory": (
            "Generate ONLY music-theory multiple-choice questions. "
            "Do NOT include listening exercises."
        ),
        "listening": (
            "Generate ONLY listening-identification questions where the user "
            "must identify a note, chord, interval, or rhythm pattern by ear. "
            "Since this is text-based, describe the sound scenario clearly "
            "(e.g., 'You hear two notes played together: C and G. What interval is this?')."
        ),
        "both": (
            "Mix music-theory multiple-choice questions AND listening-identification "
            "questions roughly 50/50."
        ),
    }[quiz_type]

    return f"""
You are TuneQuest AI, a music education assistant.

Generate a quiz for a {skill_level} {instrument} student.
{topic_clause}
{quiz_type_instructions}
{premium_note}

Rules:
- Generate exactly {num_questions} questions.
- Each question must have exactly 4 answer options (A, B, C, D).
- Mark the single correct answer.
- Provide a short explanation for the correct answer.
- Keep language simple and encouraging.

Respond ONLY with valid JSON — no markdown fences, no preamble — in this exact schema:
[
  {{
    "id": 1,
    "type": "theory" | "listening",
    "question": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "correct_answer": "A" | "B" | "C" | "D",
    "explanation": "..."
  }}
]
""".strip()


# ──────────────────────────────────────────────────────────────
# RESPONSE PARSER
# ──────────────────────────────────────────────────────────────

def _parse_quiz_json(raw_text: str) -> list[dict]:
    """
    Extract and validate the JSON array from Gemini's response.
    Strips markdown fences if present.
    """
    # Remove ```json ... ``` fences if the model adds them anyway
    cleaned = re.sub(r"```(?:json)?|```", "", raw_text).strip()

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse quiz JSON: %s\nRaw: %s", exc, cleaned)
        raise ValueError("AI returned malformed JSON for quiz.") from exc

    if not isinstance(questions, list):
        raise ValueError("Expected a JSON array of questions.")

    # Light validation
    for i, q in enumerate(questions):
        required = {"id", "type", "question",
                    "options", "correct_answer", "explanation"}
        missing = required - q.keys()
        if missing:
            raise ValueError(f"Question {i+1} is missing fields: {missing}")

    return questions


# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────

def _make_title(instrument: str, skill_level: str, topic: str | None) -> str:
    base = f"{skill_level.capitalize()} {instrument.capitalize()} Quiz"
    return f"{base}: {topic.title()}" if topic else base
