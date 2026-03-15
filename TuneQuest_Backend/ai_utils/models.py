from django.db import models
from django.conf import settings


class AIToken(models.Model):
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='ai_token',
    )
    tokens_remaining = models.PositiveIntegerField(default=10)
    tokens_used = models.PositiveIntegerField(default=0)
    tokens_limit = models.PositiveIntegerField(default=10, help_text="Max tokens capacity: 10 for free, 50 for premium")

    def __str__(self):
        return f"{self.user.email} — {self.tokens_remaining}/{self.tokens_limit}"


class AIGeneratedQuiz(models.Model):
    SKILL_LEVELS = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_quizzes',
    )
    # Link to practice step/exercise (stores the step_id from the practice plan)
    practice_step_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    title = models.CharField(max_length=255)
    topic = models.CharField(max_length=100)
    instrument = models.CharField(max_length=100, default='guitar')
    skill_level = models.CharField(max_length=20, choices=SKILL_LEVELS, default='beginner')
    category = models.CharField(max_length=100, default='Music Theory')
    lore_description = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='Not Started')
    best_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_completion_time = models.FloatField(null=True, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    last_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def question_count(self):
        return self.questions.count()


class AIQuizQuestion(models.Model):
    quiz = models.ForeignKey(AIGeneratedQuiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    options = models.JSONField()
    correct_answer = models.CharField(max_length=500)
    explanation = models.TextField(blank=True)
    audio_meta = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order + 1}: {self.question_text[:50]}"


class AIGeneratedSong(models.Model):
    SKILL_LEVELS = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ai_songs',
    )
    # Link to practice step/exercise (stores the step_id from the practice plan)
    practice_step_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    song_title = models.CharField(max_length=255)
    arrangement_title = models.CharField(max_length=255)
    instrument = models.CharField(max_length=100, default='guitar')
    skill_level = models.CharField(max_length=20, choices=SKILL_LEVELS, default='beginner')
    bpm = models.PositiveIntegerField()
    is_verified = models.BooleanField(default=False)
    is_ai_composed = models.BooleanField(default=True)
    status = models.CharField(max_length=20, default='Not Started')
    best_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    avg_completion_time = models.FloatField(null=True, blank=True)
    attempt_count = models.PositiveIntegerField(default=0)
    last_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.arrangement_title} ({self.skill_level})"

    @property
    def event_count(self):
        return self.timeline_events.count()


class AITimelineEvent(models.Model):
    EVENT_TYPES = [
        ('note', 'Note'),
        ('chord', 'Chord'),
    ]

    song = models.ForeignKey(AIGeneratedSong, on_delete=models.CASCADE, related_name='timeline_events')
    beat = models.FloatField()
    event_type = models.CharField(max_length=10, choices=EVENT_TYPES)
    value = models.CharField(max_length=100)  # Note label (e.g., 'E4') or chord name (e.g., 'Am')
    duration = models.FloatField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Beat {self.beat}: {self.value} ({self.duration})"
