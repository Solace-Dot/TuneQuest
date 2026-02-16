from django.db import models

class Exercise(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()

class UserExerciseLog(models.Model):
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    logged_at = models.DateTimeField(auto_now_add=True)

class Instrument(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return self.name

class Skill(models.Model):
    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField()

    def __str__(self):
        return self.name

class ListeningExercise(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    instrument = models.ForeignKey(Instrument, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    expected_notes = models.TextField()
    accuracy_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    recorded_file = models.ForeignKey('FileUpload', on_delete=models.SET_NULL, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_premium = models.BooleanField(default=False)
    difficulty_level = models.CharField(max_length=50)
    exercise_type = models.CharField(max_length=50)

    def __str__(self):
        return self.title

class FileUpload(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.BigIntegerField()
    c3_key = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_name

class ExerciseAttempt(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    exercise = models.ForeignKey(Exercise, on_delete=models.CASCADE)
    audio_file = models.ForeignKey(FileUpload, on_delete=models.SET_NULL, null=True, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    accuracy_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback_text = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.email} - {self.exercise.title}"

class AIActivityLog(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    file = models.ForeignKey(FileUpload, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=255)
    input_summary = models.TextField(blank=True, null=True)
    output_summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    prompt_tokens = models.IntegerField(default=0)
    completion_tokens = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.email} - {self.action_type}"