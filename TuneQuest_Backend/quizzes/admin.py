from django.contrib import admin
from .models import Quiz, Question, UserQuizAttempt

admin.site.register(Quiz)
admin.site.register(Question)
admin.site.register(UserQuizAttempt)