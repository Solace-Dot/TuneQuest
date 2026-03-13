from django.urls import path
from .views import ask_gemini, quiz_generator, project_plan_generator, progress_analyzer

urlpatterns = [
    path("ask/", ask_gemini),

    path('quiz_generator/', quiz_generator),
    path('project_plan_generator/', project_plan_generator),
    path('progress_analyzer/', progress_analyzer),
]
