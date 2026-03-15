"""
ai_app/views.py
────────────────
DRF API views for TuneQuest's AI features.

Endpoints
---------
POST /api/ai/quiz/generate/          – generate a music quiz
POST /api/ai/plan/generate/          – generate a practice plan
POST /api/ai/progress/analyze/       – analyze practice progress
GET  /api/ai/health/                 – sanity check (no auth required)
"""

import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    ProgressAnalyzeSerializer,
    PracticePlanSerializer,
    QuizGenerateSerializer,
)

from .utils.quiz_generator import generate_quiz
from .utils.project_plan_generator import generate_practice_plan
from .utils.progress_analyzer import analyze_progress

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────

def _is_premium(user) -> bool:
    """
    Check whether the authenticated user has an active premium subscription.
    Adjust this to match your actual subscription model field.
    """
    try:
        return user.subscription.is_active and user.subscription.tier == "premium"
    except AttributeError:
        return False


def _error_response(message: str, code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"success": False, "error": message}, status=code)


# ──────────────────────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    """Public endpoint — used by Render health checks and frontend ping."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "success": True,
                "service": "TuneQuest AI",
                "status":  "online",
            }
        )


# ──────────────────────────────────────────────────────────────
# QUIZ GENERATION
# ──────────────────────────────────────────────────────────────

class QuizGenerateView(APIView):
    """
    POST /api/ai/quiz/generate/

    Body (JSON):
        instrument    : str   – e.g. "guitar"
        skill_level   : str   – "beginner" | "intermediate" | "advanced"
        quiz_type     : str   – "theory" | "listening" | "both"
        num_questions : int   – 1–10  (free: max 5, premium: max 10)
        topic         : str?  – optional focus, e.g. "chord inversions"

    Free vs Premium:
        Free users are limited to 5 questions.
        Premium users can request up to 10 + harder questions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuizGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error_response(serializer.errors, status.HTTP_422_UNPROCESSABLE_ENTITY)

        data = serializer.validated_data
        is_premium = _is_premium(request.user)

        # Cap free users at 5 questions
        if not is_premium and data["num_questions"] > 5:
            data["num_questions"] = 5

        logger.info(
            "Quiz requested by user=%s  instrument=%s  level=%s  premium=%s",
            request.user.username, data["instrument"], data["skill_level"], is_premium,
        )

        try:
            result = generate_quiz(
                instrument=data["instrument"],
                skill_level=data["skill_level"],
                quiz_type=data["quiz_type"],
                num_questions=data["num_questions"],
                topic=data.get("topic") or None,
                is_premium=is_premium,
            )
        except RuntimeError as exc:
            logger.error("Quiz generation failed: %s", exc)
            return _error_response(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return _error_response(str(exc))

        return Response({"success": True, "data": result}, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# PRACTICE PLAN GENERATION
# ──────────────────────────────────────────────────────────────

class PracticePlanGenerateView(APIView):
    """
    POST /api/ai/plan/generate/

    Body (JSON):
        instrument    : str  – e.g. "piano"
        skill_level   : str  – "beginner" | "intermediate" | "advanced"
        goal          : str? – e.g. "improve chord transitions"
        num_weeks     : int  – 1–12 (free tier locked to 1)
        daily_minutes : int  – minutes per day  (default 30)

    This is the main "AI Practice Plan" feature.
    Example user prompt: "Make me a 3-week plan to improve my guitar skills."
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PracticePlanSerializer(data=request.data)
        if not serializer.is_valid():
            return _error_response(serializer.errors, status.HTTP_422_UNPROCESSABLE_ENTITY)

        data = serializer.validated_data
        is_premium = _is_premium(request.user)

        logger.info(
            "Practice plan requested by user=%s  instrument=%s  goal='%s'  weeks=%s  premium=%s",
            request.user.username, data["instrument"],
            data.get("goal", ""), data["num_weeks"], is_premium,
        )

        try:
            result = generate_practice_plan(
                instrument=data["instrument"],
                skill_level=data["skill_level"],
                goal=data.get("goal", ""),
                num_weeks=data["num_weeks"],
                daily_minutes=data["daily_minutes"],
                is_premium=is_premium,
            )
        except RuntimeError as exc:
            logger.error("Practice plan generation failed: %s", exc)
            return _error_response(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return _error_response(str(exc))

        return Response({"success": True, "data": result}, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# PROGRESS ANALYSIS
# ──────────────────────────────────────────────────────────────

class ProgressAnalyzeView(APIView):
    """
    POST /api/ai/progress/analyze/

    Body (JSON):
        instrument    : str
        skill_level   : str
        learning_goal : str?
        streak_days   : int  – consecutive days practiced
        sessions      : [
            {
                date, instrument, duration_minutes,
                exercises_done, accuracy_score (0.0–1.0)
            }
        ]
        quiz_results  : [
            { date, topic, score, total, percentage }
        ]

    Free vs Premium:
        Free  → brief 2-sentence summary only.
        Premium → full breakdown with strengths, areas to improve, next steps.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProgressAnalyzeSerializer(data=request.data)
        if not serializer.is_valid():
            return _error_response(serializer.errors, status.HTTP_422_UNPROCESSABLE_ENTITY)

        data = serializer.validated_data
        is_premium = _is_premium(request.user)

        logger.info(
            "Progress analysis requested by user=%s  instrument=%s  premium=%s  sessions=%d",
            request.user.username, data["instrument"],
            is_premium, len(data["sessions"]),
        )

        # Convert date objects to ISO strings for the util function
        sessions = [
            {**s, "date": str(s["date"])}
            for s in data["sessions"]
        ]
        quiz_results = [
            {**q, "date": str(q["date"])}
            for q in data.get("quiz_results", [])
        ]

        try:
            result = analyze_progress(
                username=request.user.username,
                instrument=data["instrument"],
                skill_level=data["skill_level"],
                learning_goal=data.get("learning_goal", ""),
                sessions=sessions,
                quiz_results=quiz_results,
                streak_days=data["streak_days"],
                is_premium=is_premium,
            )
        except RuntimeError as exc:
            logger.error("Progress analysis failed: %s", exc)
            return _error_response(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
        except ValueError as exc:
            return _error_response(str(exc))

        return Response({"success": True, "data": result}, status=status.HTTP_200_OK)
