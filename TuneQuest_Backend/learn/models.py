from django.db import models


CATEGORY_CHOICES = [
    ('Music Theory', 'Music Theory'),
    ('Scales', 'Scales'),
    ('Chords', 'Chords'),
    ('Rhythm', 'Rhythm'),
    ('Ear Training', 'Ear Training'),
]

DIFFICULTY_CHOICES = [
    ('Beginner', 'Beginner'),
    ('Intermediate', 'Intermediate'),
    ('Advanced', 'Advanced'),
]


class Lesson(models.Model):
    """
    A single learn-page lesson card. `slug` (e.g. "l-001") is the primary key
    so the frontend IDs are stable and seedable by management command.
    `content` is a list of block dicts understood by the frontend renderer.
    """
    slug = models.SlugField(primary_key=True, max_length=20)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    duration_minutes = models.PositiveSmallIntegerField()
    description = models.TextField()
    content = models.JSONField(default=list)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.slug}] {self.title}"


class LessonProgress(models.Model):
    """
    Records that a specific user has completed a specific lesson.
    One row per (user, lesson) pair — toggling deletes the row.
    """
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='lesson_progress',
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name='progress',
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"{self.user.email} — {self.lesson.slug}"
