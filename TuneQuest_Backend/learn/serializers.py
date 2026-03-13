from rest_framework import serializers
from .models import Lesson, LessonProgress


class LessonSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'slug', 'title', 'category', 'difficulty',
            'duration_minutes', 'description', 'content',
            'order', 'is_completed',
        ]

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return LessonProgress.objects.filter(
                user=request.user, lesson=obj
            ).exists()
        return False


class LessonProgressSerializer(serializers.ModelSerializer):
    lesson_slug = serializers.CharField(source='lesson.slug', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonProgress
        fields = ['id', 'lesson_slug', 'lesson_title', 'completed_at']
        read_only_fields = fields
