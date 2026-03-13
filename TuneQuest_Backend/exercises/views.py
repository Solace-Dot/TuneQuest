from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ExerciseObject, ExerciseHistoryLog, DailyPlan
from .serializers import ExerciseObjectSerializer, ExerciseHistoryLogSerializer, DailyPlanSerializer

FREE_TIER_LIMIT = 5
PREMIUM_TIER_LIMIT = 15


def _get_completed_limit(user):
    """Return the completed-slot limit based on the user's active subscription."""
    from payments.models import Subscription
    active_sub = (
        Subscription.objects.filter(user=user, subscription_status__iexact='active')
        .order_by('-start_date')
        .first()
    )
    if active_sub and active_sub.plan_type.lower() == 'premium':
        return PREMIUM_TIER_LIMIT
    return FREE_TIER_LIMIT


def _archive_oldest_if_over_limit(user, limit):
    """
    If the user's completed ExerciseObjects exceed `limit`, archive the oldest
    one into ExerciseHistoryLog, stripping out the heavy payload, then delete it.
    """
    completed_qs = ExerciseObject.objects.filter(
        user=user, status='Completed'
    ).order_by('completed_at')

    while completed_qs.count() > limit:
        oldest = completed_qs.first()
        ExerciseHistoryLog.objects.create(
            user=user,
            title=oldest.title,
            category=oldest.category,
            skill_level=oldest.skill_level,
            best_score=oldest.best_score,
            accuracy=oldest.accuracy,
        )
        oldest.delete()
        # Refresh queryset count
        completed_qs = ExerciseObject.objects.filter(
            user=user, status='Completed'
        ).order_by('completed_at')


class ExerciseObjectViewSet(viewsets.ModelViewSet):
    """
    CRUD for a user's ExerciseObjects plus custom actions:
      POST /objects/{id}/complete/  — mark complete, run archival check
      GET  /objects/history/        — fetch archived history logs
    """
    serializer_class = ExerciseObjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ExerciseObject.objects.filter(user=self.request.user)

        category = self.request.query_params.get('category')
        status_filter = self.request.query_params.get('status')
        skill_level = self.request.query_params.get('skill_level')
        route_to = self.request.query_params.get('route_to')

        if category:
            qs = qs.filter(category=category)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if skill_level:
            qs = qs.filter(skill_level=skill_level)
        if route_to:
            qs = qs.filter(route_to=route_to)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """
        Mark an exercise as Completed and record stats. Triggers the
        archival rule if the user has exceeded their tier limit.
        """
        exercise = self.get_object()
        exercise.status = 'Completed'
        exercise.completed_at = timezone.now()

        if 'best_score' in request.data:
            exercise.best_score = request.data['best_score']
        if 'accuracy' in request.data:
            exercise.accuracy = request.data['accuracy']
        if 'avg_completion_time' in request.data:
            exercise.avg_completion_time = request.data['avg_completion_time']

        exercise.save()

        limit = _get_completed_limit(request.user)
        _archive_oldest_if_over_limit(request.user, limit)

        return Response(ExerciseObjectSerializer(exercise).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """Return all archived history log entries for the current user."""
        logs = ExerciseHistoryLog.objects.filter(
            user=request.user
        ).order_by('-archived_at')
        serializer = ExerciseHistoryLogSerializer(logs, many=True)
        return Response(serializer.data)


class DailyPlanViewSet(viewsets.ModelViewSet):
    """
    CRUD for daily plans plus custom generation:
      POST /plans/generate/  — AI-generated plan from form data
      GET  /plans/today/     — fetch today's active plan
    """
    serializer_class = DailyPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DailyPlan.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        AI generates a daily plan based on form inputs:
        {
            duration_goal: int,
            focus_areas: [str],
            difficulty: str,
            wish: str
        }
        
        For now, returns a simple demo. In production, call an AI service.
        """
        duration_goal = request.data.get('duration_goal', 30)
        focus_areas = request.data.get('focus_areas', [])
        difficulty = request.data.get('difficulty', 'balanced')
        wish = request.data.get('wish', '')

        # Demo: Create 3-4 mock exercises for the plan
        exercises = []
        for i in range(3):
            ex = ExerciseObject.objects.create(
                user=request.user,
                title=f"Demo Exercise {i+1}",
                category=focus_areas[i % len(focus_areas)] if focus_areas else 'Technique',
                skill_level='Beginner',
                status='In Progress',
                lore_description=f"Exercise focused on your goal: {wish}",
                technical_payload={'bpm': 60 + i*10, 'pattern': '4/4'},
                duration_minutes=max(5, (duration_goal // (3 + (1 if i == 0 else 0)))),
            )
            exercises.append(str(ex.id))

        plan = DailyPlan.objects.create(
            user=request.user,
            title='Today\'s Practice',
            focus=', '.join(focus_areas[:2]) if focus_areas else 'General',
            duration_goal=duration_goal,
            difficulty=difficulty,
            wish=wish,
            focus_areas=focus_areas,
            exercise_ids=exercises,
        )

        serializer = DailyPlanSerializer(plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='today')
    def today(self, request):
        """Return today's active plan (most recently created), including AI plan JSON."""
        plan = DailyPlan.objects.filter(user=request.user).order_by('-created_at').first()
        if not plan:
            # Return 200 with empty plan instead of 404 to avoid console errors
            return Response({
                'plan_json': None,
                'id': None,
                'exercise_ids': [],
            }, status=status.HTTP_200_OK)
        serializer = DailyPlanSerializer(plan)
        data = serializer.data
        # Include the raw AI plan JSON so the frontend can restore Redux state
        data['plan_json'] = plan.plan_json
        data['skill_level'] = plan.skill_level
        data['instrument'] = plan.instrument
        data['recommended_lesson_slugs'] = plan.recommended_lesson_slugs
        return Response(data)

