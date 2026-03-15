from django.db import models

class Session(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    session_id = models.CharField(max_length=255, unique=True)
    plan = models.ForeignKey('payments.Plan', on_delete=models.SET_NULL, null=True, blank=True)
    exercise_ids = models.TextField()  # JSON field to store list of exercise IDs
    audio_file = models.ForeignKey('exercises.FileUpload', on_delete=models.SET_NULL, null=True, blank=True)
    detected_notes = models.TextField(blank=True, null=True)
    accuracy_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    score = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    duration_minutes = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.email} - Session {self.session_id}"

class Progress(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    skill = models.ForeignKey('exercises.Skill', on_delete=models.CASCADE)
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    date_id = models.DateField(auto_now_add=True)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)
    streak_days = models.IntegerField(default=0)
    mastery_level = models.CharField(max_length=50, default='Beginner')

    def __str__(self):
        return f"{self.user.email} - {self.skill.name} Progress"

