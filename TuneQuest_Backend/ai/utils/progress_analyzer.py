import json
import logging
import re
from datetime import date
from typing import TypedDict

from ai.gemini.client import get_model

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# TYPED HELPERS  (match your Django model data)
# ──────────────────────────────────────────────────────────────


class SessionData(TypedDict):
    date:             str   # ISO date e.g. "2025-12-10"
    instrument:       str
    duration_minutes: int
    exercises_done:   int
    accuracy_score:   float  # 0.0 – 1.0


class QuizResult(TypedDict):
    date:       str
    topic:      str
    score:      int   # number correct
    total:      int   # total questions
    percentage: float


# ──────────────────────────────────────────────────────────────
# PUBLIC ENTRY POINT
# ──────────────────────────────────────────────────────────────

def analyze_progress(
    username: str,
    instrument: str,
    skill_level: str,
    learning_goal: str,
    sessions: list[SessionData],
    quiz_results: list[QuizResult],
    streak_days: int = 0,
    is_premium: bool = False,
) -> dict:
    """
    Analyse a user's recent activity and return an AI-generated progress report.

    Parameters
    ----------
    username      : displayed in the report for personalisation
    instrument    : user's selected instrument
    skill_level   : "beginner" | "intermediate" | "advanced"
    learning_goal : e.g. "master chord transitions"
    sessions      : list of recent practice sessions (last 30 days recommended)
    quiz_results  : list of quiz attempts
    streak_days   : consecutive days practiced
    is_premium    : unlocks detailed breakdown

    Returns
    -------
    dict:
        summary          : str  – overall narrative
        strengths        : list[str]  (premium only, else [])
        areas_to_improve : list[str]  (premium only, else [])
        next_steps       : list[str]  (premium only, else [])
        stats            : dict – computed metrics (always returned)
        is_premium       : bool
    """
    stats = _compute_stats(sessions, quiz_results, streak_days)
    prompt = _build_prompt(
        username, instrument, skill_level, learning_goal,
        stats, is_premium,
    )

    try:
        model = get_model("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw_text = response.text
        logger.debug("Gemini raw response (progress_analyzer):\n%s", raw_text)
    except Exception as exc:
        logger.error("Gemini API error in progress_analyzer: %s", exc)
        raise RuntimeError(f"Failed to analyze progress: {exc}") from exc

    parsed = _parse_analysis_json(raw_text)

    return {
        **parsed,
        "stats":      stats,
        "is_premium": is_premium,
    }


# ──────────────────────────────────────────────────────────────
# STATS COMPUTATION  (pure Python — no AI needed)
# ──────────────────────────────────────────────────────────────

def _compute_stats(
    sessions: list[SessionData],
    quiz_results: list[QuizResult],
    streak_days: int,
) -> dict:
    """Derive numeric metrics from raw session/quiz data."""
    total_minutes = sum(s["duration_minutes"] for s in sessions)
    total_sessions = len(sessions)
    avg_accuracy = (
        round(sum(s["accuracy_score"] for s in sessions) / total_sessions, 2)
        if total_sessions else 0.0
    )
    total_exercises = sum(s["exercises_done"] for s in sessions)

    quiz_scores = [q["percentage"] for q in quiz_results]
    avg_quiz_score = round(
        sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else 0.0
    best_quiz_topic = (
        max(quiz_results, key=lambda q: q["percentage"])["topic"]
        if quiz_results else "N/A"
    )
    worst_quiz_topic = (
        min(quiz_results, key=lambda q: q["percentage"])["topic"]
        if quiz_results else "N/A"
    )

    return {
        "total_practice_minutes": total_minutes,
        "total_sessions":         total_sessions,
        "total_exercises_done":   total_exercises,
        "average_accuracy":       avg_accuracy,       # 0.0 – 1.0
        "average_quiz_score_pct": avg_quiz_score,     # 0 – 100
        "best_quiz_topic":        best_quiz_topic,
        "weakest_quiz_topic":     worst_quiz_topic,
        "streak_days":            streak_days,
        "report_generated_on":    date.today().isoformat(),
    }


# ──────────────────────────────────────────────────────────────
# PROMPT BUILDER
# ──────────────────────────────────────────────────────────────

def _build_prompt(
    username: str,
    instrument: str,
    skill_level: str,
    learning_goal: str,
    stats: dict,
    is_premium: bool,
) -> str:
    premium_note = (
        "This user has a PREMIUM subscription. Provide:\n"
        "1. A detailed narrative summary (3–4 sentences)\n"
        "2. 2–3 specific STRENGTHS based on the data\n"
        "3. 2–3 specific AREAS TO IMPROVE\n"
        "4. 3 concrete NEXT STEPS (actionable recommendations)"
        if is_premium else
        "This is a FREE tier summary. Provide:\n"
        "1. A brief encouraging summary (2 sentences)\n"
        "2. Leave strengths, areas_to_improve, and next_steps as empty lists\n"
        "3. Gently hint that a premium subscription unlocks full analysis."
    )

    return f"""
You are TuneQuest AI, a warm and expert music coach reviewing a student's progress.

Student profile:
- Name:          {username}
- Instrument:    {instrument}
- Skill level:   {skill_level}
- Learning goal: {learning_goal}

Recent activity stats:
- Total practice time:   {stats['total_practice_minutes']} minutes
- Total sessions:        {stats['total_sessions']}
- Exercises completed:   {stats['total_exercises_done']}
- Average accuracy:      {round(stats['average_accuracy'] * 100, 1)}%
- Average quiz score:    {stats['average_quiz_score_pct']}%
- Best quiz topic:       {stats['best_quiz_topic']}
- Weakest quiz topic:    {stats['weakest_quiz_topic']}
- Current streak:        {stats['streak_days']} day(s)

{premium_note}

Respond ONLY with valid JSON — no markdown fences, no preamble:
{{
  "summary":          "...",
  "strengths":        ["...", "..."],
  "areas_to_improve": ["...", "..."],
  "next_steps":       ["...", "...", "..."]
}}
""".strip()


# ──────────────────────────────────────────────────────────────
# RESPONSE PARSER
# ──────────────────────────────────────────────────────────────

def _parse_analysis_json(raw_text: str) -> dict:
    cleaned = re.sub(r"```(?:json)?|```", "", raw_text).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error(
            "Failed to parse analysis JSON: %s\nRaw: %s", exc, cleaned)
        raise ValueError(
            "AI returned malformed JSON for progress analysis.") from exc

    # Ensure all expected keys exist
    for key in ("summary", "strengths", "areas_to_improve", "next_steps"):
        if key not in data:
            data[key] = "" if key == "summary" else []

    return data
