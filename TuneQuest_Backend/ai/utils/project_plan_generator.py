import json
import logging
import re
from typing import Literal

from ai.gemini.client import get_model

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ──────────────────────────────────────────────────────────────


def generate_practice_plan(
    instrument: str,
    skill_level: Literal["beginner", "intermediate", "advanced"] = "beginner",
    goal: str = "",
    num_weeks: int = 1,
    daily_minutes: int = 30,
    is_premium: bool = False,
) -> dict:
    """
    Generate a structured practice plan.

    Parameters
    ----------
    instrument    : e.g. "guitar", "piano"
    skill_level   : "beginner" | "intermediate" | "advanced"
    goal          : Free-text goal, e.g. "improve chord transitions"
    num_weeks     : How many weeks to plan (premium only allows >1)
    daily_minutes : Target practice time per day in minutes
    is_premium    : Unlocks longer plans and deeper explanations

    Returns
    -------
    dict with keys:
        plan_title       : str
        instrument       : str
        skill_level      : str
        goal             : str
        num_weeks        : int
        daily_minutes    : int
        is_premium       : bool
        weeks            : list[dict]  – see _parse_plan_json for schema
        motivational_tip : str
    """
    # Free tier is capped at 1 week
    if not is_premium:
        num_weeks = 1

    num_weeks = max(1, min(num_weeks, 12))  # hard cap at 12 weeks

    prompt = _build_prompt(instrument, skill_level, goal,
                           num_weeks, daily_minutes, is_premium)

    try:
        # Use flash for short plans, pro for longer premium plans
        model_name = "gemini-1.5-pro" if (is_premium and num_weeks >
                                          4) else "gemini-1.5-flash"
        model = get_model(model_name)
        response = model.generate_content(prompt)
        raw_text = response.text
        logger.debug("Gemini raw response (practice_plan):\n%s", raw_text)
    except Exception as exc:
        logger.error("Gemini API error in practice_plan_generator: %s", exc)
        raise RuntimeError(f"Failed to generate practice plan: {exc}") from exc

    parsed = _parse_plan_json(raw_text)

    return {
        "plan_title":       _make_title(instrument, goal, num_weeks),
        "instrument":       instrument,
        "skill_level":      skill_level,
        "goal":             goal,
        "num_weeks":        num_weeks,
        "daily_minutes":    daily_minutes,
        "is_premium":       is_premium,
        "weeks":            parsed["weeks"],
        "motivational_tip": parsed.get("motivational_tip", ""),
    }


# ──────────────────────────────────────────────────────────────
# PROMPT BUILDER
# ──────────────────────────────────────────────────────────────

def _build_prompt(
    instrument: str,
    skill_level: str,
    goal: str,
    num_weeks: int,
    daily_minutes: int,
    is_premium: bool,
) -> str:
    goal_clause = (
        f"The student's specific goal is: **{goal}**."
        if goal
        else f"Create a general improvement plan for a {skill_level} {instrument} student."
    )

    premium_note = (
        "This is a PREMIUM plan. Provide detailed, personalised daily exercises, "
        "progressive difficulty, specific techniques (e.g., bpm targets, finger patterns), "
        "and an AI-written explanation for WHY each exercise matters."
        if is_premium
        else
        "This is a FREE plan. Provide concise, general guidance. "
        "Hint that a premium plan offers more detail."
    )

    week_word = "week" if num_weeks == 1 else f"{num_weeks} weeks"

    return f"""
You are TuneQuest AI, a friendly and expert music coach.

Create a {week_word} practice plan for a {skill_level} {instrument} student.
{goal_clause}
Available practice time: {daily_minutes} minutes per day.
{premium_note}

Rules:
- For each week, include 5 practice days (Mon–Fri). Weekends are rest/review.
- Each day has 2–4 exercises with a name, duration in minutes, and clear instructions.
- Include a "week_focus" summary and a "weekly_tip" for each week.
- Add one top-level "motivational_tip" at the end.
- Keep language encouraging and jargon-free where possible.

Respond ONLY with valid JSON — no markdown fences, no preamble — using this schema:
{{
  "weeks": [
    {{
      "week_number": 1,
      "week_focus": "...",
      "weekly_tip": "...",
      "days": [
        {{
          "day": "Monday",
          "exercises": [
            {{
              "name": "...",
              "duration_minutes": 10,
              "instructions": "...",
              "why_it_helps": "..."
            }}
          ]
        }}
      ]
    }}
  ],
  "motivational_tip": "..."
}}
""".strip()


# ──────────────────────────────────────────────────────────────
# RESPONSE PARSER
# ──────────────────────────────────────────────────────────────

def _parse_plan_json(raw_text: str) -> dict:
    """Parse and lightly validate the JSON plan from Gemini."""
    cleaned = re.sub(r"```(?:json)?|```", "", raw_text).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse plan JSON: %s\nRaw: %s", exc, cleaned)
        raise ValueError(
            "AI returned malformed JSON for practice plan.") from exc

    if "weeks" not in data or not isinstance(data["weeks"], list):
        raise ValueError("Practice plan JSON must contain a 'weeks' list.")

    for week in data["weeks"]:
        if "days" not in week:
            raise ValueError(
                f"Week {week.get('week_number')} is missing 'days'.")

    return data


# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────

def _make_title(instrument: str, goal: str, num_weeks: int) -> str:
    week_label = "1-Week" if num_weeks == 1 else f"{num_weeks}-Week"
    goal_label = goal.title() if goal else "Improvement"
    return f"{week_label} {instrument.capitalize()} Practice Plan: {goal_label}"
