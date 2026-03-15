from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models

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
        # Return: global lessons (non-AI) + lessons created for this specific user
        # EXCLUDE orphaned global AI lessons (user=NULL with slug starting with "ai-")
        qs = Lesson.objects.filter(
            (models.Q(user__isnull=True) & ~models.Q(slug__startswith="ai-")) |  # Global non-AI lessons
            models.Q(user=self.request.user)  # User's AI-generated lessons
        )
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

    # ── clear AI-generated lessons ──────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='clear_ai_lessons')
    def clear_ai_lessons(self, request):
        """Delete all AI-generated lessons for the current user."""
        from learn.models import LessonProgress
        
        # Get all user-scoped lessons
        user_lessons = Lesson.objects.filter(user=request.user)
        user_count = user_lessons.count()
        print(f"[CLEAR API] User {request.user.id}: {user_count} user-scoped lessons")
        
        # ALSO get global lessons that are AI-generated (slug starts with "ai-")
        # These are leftover from before the user parameter was fixed
        global_ai_lessons = Lesson.objects.filter(user__isnull=True, slug__startswith="ai-")
        global_count = global_ai_lessons.count()
        print(f"[CLEAR API] Found {global_count} orphaned global AI lessons (will NOT delete)")
        
        # Delete progress records for user lessons
        progress_count, _ = LessonProgress.objects.filter(lesson__in=user_lessons).delete()
        print(f"[CLEAR API] Deleted {progress_count} progress records")
        
        # Delete user-scoped lessons only
        deleted_count, _ = user_lessons.delete()
        print(f"[CLEAR API] Deleted {deleted_count} user-scoped lessons for user {request.user.id}")
        
        # Verify deletion
        remaining_user = Lesson.objects.filter(user=request.user).count()
        print(f"[CLEAR API] After deletion - User {request.user.id}: {remaining_user} user lessons, {global_count} global AI lessons")
        
        return Response({
            'success': True,
            'cleared_count': deleted_count,
            'orphaned_count': global_count,
            'remaining_count': remaining_user,
            'message': f'Deleted {deleted_count} AI-generated lessons. Found {global_count} orphaned lessons from old migrations.'
        }, status=status.HTTP_200_OK)

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
