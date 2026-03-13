from django.contrib import admin
from .models import AIToken, AIGeneratedQuiz, AIQuizQuestion, AIGeneratedSong, AITimelineEvent

admin.site.register(AIToken)
admin.site.register(AIGeneratedQuiz)
admin.site.register(AIQuizQuestion)
admin.site.register(AIGeneratedSong)
admin.site.register(AITimelineEvent)
