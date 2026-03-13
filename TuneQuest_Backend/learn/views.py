from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Lesson, LessonProgress
from .serializers import LessonSerializer, LessonProgressSerializer


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/learn/lessons/                  — list all lessons (with is_completed per user)
    GET  /api/learn/lessons/?category=Chords  — filter by category
    GET  /api/learn/lessons/?difficulty=Beginner
    GET  /api/learn/lessons/{slug}/           — lesson detail with full content
    POST /api/learn/lessons/{slug}/toggle/    — mark/unmark complete; returns {is_completed}
    GET  /api/learn/lessons/my_progress/      — summary + list of completed slugs
    """
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Lesson.objects.all()
        category = self.request.query_params.get('category')
        difficulty = self.request.query_params.get('difficulty')
        if category:
            qs = qs.filter(category=category)
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        return qs

    # ── toggle complete ─────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle(self, request, slug=None):
        lesson = self.get_object()
        progress, created = LessonProgress.objects.get_or_create(
            user=request.user, lesson=lesson
        )
        if not created:
            progress.delete()
            return Response({'is_completed': False}, status=status.HTTP_200_OK)
        return Response({'is_completed': True}, status=status.HTTP_200_OK)

    # ── progress summary ────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='my_progress')
    def my_progress(self, request):
        total = Lesson.objects.count()
        completed_qs = LessonProgress.objects.filter(user=request.user).select_related('lesson')
        completed_count = completed_qs.count()
        completed_slugs = list(completed_qs.values_list('lesson__slug', flat=True))
        progress_details = LessonProgressSerializer(completed_qs, many=True).data
        return Response({
            'total_lessons': total,
            'completed_count': completed_count,
            'completed_slugs': completed_slugs,
            'progress': progress_details,
        })
