# ai_utils/urls.py
from django.urls import path
from .views import (
    generate_quiz, create_quiz, get_token_balance,
    generate_practice_plan, list_ai_quizzes, delete_quiz, get_quiz_for_step,
    generate_song_timeline, get_song_for_step,
    generate_detailed_progress_summary,
    complete_practice_session,
)

urlpatterns = [
    path('quiz/generate/', generate_quiz, name='generate_quiz'),
    path('quiz/create/', create_quiz, name='create_quiz'),
    path('quiz/list/', list_ai_quizzes, name='list_ai_quizzes'),
    path('quiz/<int:quiz_id>/delete/', delete_quiz, name='delete_quiz'),
    path('quiz/for-step/<str:step_id>/', get_quiz_for_step, name='get_quiz_for_step'),
    path('tokens/', get_token_balance, name='get_token_balance'),
    path('generate-practice-plan/', generate_practice_plan, name='generate_practice_plan'),
    path('generate-song-timeline/', generate_song_timeline, name='generate_song_timeline'),
    path('song/for-step/<str:step_id>/', get_song_for_step, name='get_song_for_step'),
    path('progress/detailed-summary/', generate_detailed_progress_summary, name='generate_detailed_progress_summary'),
    path('complete-practice-session/', complete_practice_session, name='complete_practice_session'),
]