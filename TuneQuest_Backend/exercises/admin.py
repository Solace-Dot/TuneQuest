from django.contrib import admin
from .models import Exercise, UserExerciseLog

admin.site.register(Exercise)
admin.site.register(UserExerciseLog)