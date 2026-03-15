from django.urls import path
from .views import (
    HealthCheckView,
    QuizGenerateView,
    PracticePlanGenerateView,
    ProgressAnalyzeView,
)

app_name = "ai"

urlpatterns = [
    # ── Health ─────────────────────────────────────────────
    path(
        "health/",
        HealthCheckView.as_view(),
        name="health-check",
    ),

    # ── Quiz ───────────────────────────────────────────────
    path(
        "quiz/generate/",
        QuizGenerateView.as_view(),
        name="quiz-generate",
    ),

    # ── Practice Plan ──────────────────────────────────────
    path(
        "plan/generate/",
        PracticePlanGenerateView.as_view(),
        name="plan-generate",
    ),

    # ── Progress Analysis ──────────────────────────────────
    path(
        "progress/analyze/",
        ProgressAnalyzeView.as_view(),
        name="progress-analyze",
    ),
]
