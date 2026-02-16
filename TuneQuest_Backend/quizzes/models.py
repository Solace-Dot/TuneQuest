from django.db import models

class Quiz(models.Model):
    skill = models.ForeignKey('exercises.Skill', on_delete=models.CASCADE,  null=True, blank=True)
    quiz_type = models.CharField(max_length=50, null=True, blank=True)
    difficulty_level = models.CharField(max_length=50, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    is_premium = models.BooleanField(default=False)
    quiz_category = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return f"{self.skill.name} - {self.quiz_category}"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()

    def __str__(self):
        return f"Question for {self.quiz}"

class UserQuizAttempt(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    score = models.IntegerField()
    attempted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.quiz} (Score: {self.score})"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()

class UserQuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    score = models.IntegerField()