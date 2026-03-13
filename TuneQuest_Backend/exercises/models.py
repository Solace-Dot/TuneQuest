import uuid
from django.db import models

# ─── Routing map ────────────────────────────────────────────
CATEGORY_TO_ROUTE = {
    'Quizzes': 'QuizPage',
    'Knowledge': 'QuizPage',
    'Ear Training': 'QuizPage',
    'Technique': 'SongManager',
    'Rhythm': 'SongManager',
    'Repertoire': 'SongManager',
}

CATEGORY_CHOICES = [(k, k) for k in CATEGORY_TO_ROUTE]

STATUS_CHOICES = [
    ('Not Started', 'Not Started'),
    ('In Progress', 'In Progress'),
    ('Completed', 'Completed'),
]

SKILL_LEVEL_CHOICES = [
    ('Beginner', 'Beginner'),
    ('Intermediate', 'Intermediate'),
    ('Advanced', 'Advanced'),
]


class ExerciseObject(models.Model):
    """
    The primary exercise card. `technical_payload` is a flexible JSON "box":
            - SongManager exercises: {bpm, pattern, chords}
      - QuizPage exercises:    {question, options, audioUrl, correctAns}
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='exercise_objects'
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    route_to = models.CharField(max_length=20, editable=False)
    skill_level = models.CharField(
        max_length=50, choices=SKILL_LEVEL_CHOICES, default='Beginner'
    )
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default='Not Started'
    )
    lore_description = models.TextField(blank=True)
    technical_payload = models.JSONField(default=dict)
    best_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    accuracy = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    avg_completion_time = models.FloatField(null=True, blank=True)  # seconds
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        self.route_to = CATEGORY_TO_ROUTE.get(self.category, 'QuizPage')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.category}) — {self.user.email}"


class ExerciseHistoryLog(models.Model):
    """
    Lightweight record kept after an ExerciseObject is archived once the
    completed-slot limit is reached. The heavy payload is discarded; only
    the title, scores, and category are preserved for the Profile view.
    """
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='exercise_history'
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    skill_level = models.CharField(max_length=50)
    best_score = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    accuracy = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    archived_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[Archived] {self.title} — {self.user.email}"


class DailyPlan(models.Model):
    """
    AI-generated daily practice plan. Links multiple ExerciseObjects in sequence.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='daily_plans'
    )
    title = models.CharField(max_length=255, default='Today\'s Practice')
    focus = models.CharField(max_length=255, blank=True)
    duration_goal = models.IntegerField()  # minutes
    difficulty = models.CharField(
        max_length=20,
        choices=[('chill', 'Chill'), ('balanced', 'Balanced'), ('push', 'Push')],
        default='balanced',
    )
    wish = models.TextField(blank=True)
    focus_areas = models.JSONField(default=list)  # list of category strings
    exercise_ids = models.JSONField(default=list)  # list of ExerciseObject UUIDs in order
    plan_json = models.JSONField(default=dict, blank=True)  # full raw AI plan for restoration
    skill_level = models.CharField(max_length=50, blank=True, default='Beginner')
    instrument = models.CharField(max_length=100, blank=True, default='Guitar')
    recommended_lesson_slugs = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} — {self.user.email} ({self.created_at.strftime('%Y-%m-%d')})"

    class Meta:
        ordering = ['-created_at']


# ─── Legacy models (kept for existing migrations / foreign keys) ─────────────

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