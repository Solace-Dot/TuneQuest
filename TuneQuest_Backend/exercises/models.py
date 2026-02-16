from django.db import models

class Exercise(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()

class UserExerciseLog(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    logged_at = models.DateTimeField(auto_now_add=True)