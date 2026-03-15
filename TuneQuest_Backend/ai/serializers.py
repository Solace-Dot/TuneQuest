from rest_framework import serializers


# ──────────────────────────────────────────────────────────────
# SHARED CHOICES
# ──────────────────────────────────────────────────────────────

SKILL_LEVELS = ["beginner", "intermediate", "advanced"]
QUIZ_TYPES = ["theory", "listening", "both"]


# ──────────────────────────────────────────────────────────────
# QUIZ
# ──────────────────────────────────────────────────────────────

class QuizGenerateSerializer(serializers.Serializer):
    instrument = serializers.CharField(max_length=100)
    skill_level = serializers.ChoiceField(
        choices=SKILL_LEVELS, default="beginner")
    quiz_type = serializers.ChoiceField(choices=QUIZ_TYPES,   default="both")
    num_questions = serializers.IntegerField(
        min_value=1, max_value=10, default=5)
    topic = serializers.CharField(
        max_length=200, required=False, allow_blank=True)

    def validate_instrument(self, value):
        return value.lower().strip()


# ──────────────────────────────────────────────────────────────
# PRACTICE PLAN
# ──────────────────────────────────────────────────────────────

class PracticePlanSerializer(serializers.Serializer):
    instrument = serializers.CharField(max_length=100)
    skill_level = serializers.ChoiceField(
        choices=SKILL_LEVELS, default="beginner")
    goal = serializers.CharField(
        max_length=500, required=False, allow_blank=True)
    num_weeks = serializers.IntegerField(min_value=1, max_value=12, default=1)
    daily_minutes = serializers.IntegerField(
        min_value=5, max_value=180, default=30)

    def validate_instrument(self, value):
        return value.lower().strip()

    def validate(self, data):
        # Free users cannot request >1 week (enforced again in the view via is_premium flag)
        return data


# ──────────────────────────────────────────────────────────────
# PROGRESS ANALYSIS
# ──────────────────────────────────────────────────────────────

class SessionDataSerializer(serializers.Serializer):
    date = serializers.DateField()
    instrument = serializers.CharField(max_length=100)
    duration_minutes = serializers.IntegerField(min_value=0)
    exercises_done = serializers.IntegerField(min_value=0)
    accuracy_score = serializers.FloatField(min_value=0.0, max_value=1.0)


class QuizResultSerializer(serializers.Serializer):
    date = serializers.DateField()
    topic = serializers.CharField(max_length=200)
    score = serializers.IntegerField(min_value=0)
    total = serializers.IntegerField(min_value=1)
    percentage = serializers.FloatField(min_value=0.0, max_value=100.0)


class ProgressAnalyzeSerializer(serializers.Serializer):
    instrument = serializers.CharField(max_length=100)
    skill_level = serializers.ChoiceField(
        choices=SKILL_LEVELS, default="beginner")
    learning_goal = serializers.CharField(
        max_length=500, required=False, allow_blank=True)
    sessions = SessionDataSerializer(many=True)
    quiz_results = QuizResultSerializer(
        many=True, required=False, default=list)
    streak_days = serializers.IntegerField(min_value=0, default=0)

    def validate_sessions(self, value):
        if len(value) > 90:
            raise serializers.ValidationError(
                "Send at most 90 sessions for analysis.")
        return value
