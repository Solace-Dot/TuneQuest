from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_token_refresh_date = models.DateField(null=True, blank=True, help_text="Last date (PT) when token was refreshed at midnight")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    skill = models.ForeignKey('exercises.Skill', on_delete=models.SET_NULL, null=True, blank=True)
    instrument = models.ForeignKey('exercises.Instrument', on_delete=models.SET_NULL, null=True, blank=True)
    learning_goal_text = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    practice_streak = models.IntegerField(default=0)
    last_practice_date = models.DateTimeField(null=True, blank=True)
    total_practice_minutes = models.IntegerField(default=0)
    # Temporary string fields for MVP (will migrate to FK lookups later)
    skill_level = models.CharField(max_length=50, default='Beginner', blank=True)
    instrument_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.user.email} Profile"


class ProfileCompletion(models.Model):
    """
    Tracks whether a user has completed their profile setup.
    Persists across page refreshes and sessions.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile_completion')
    is_completed = models.BooleanField(default=False, help_text="Whether profile setup is complete")
    instrument_name = models.CharField(max_length=100, blank=True, help_text="User's instrument")
    skill_level = models.CharField(max_length=50, blank=True, help_text="User's skill level")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When profile was completed")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Profile {'Completed' if self.is_completed else 'Incomplete'}"
