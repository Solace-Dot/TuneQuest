from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    failed_login_attempts = models.IntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)

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

    def __str__(self):
        return f"{self.user.email} Profile"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"
    
