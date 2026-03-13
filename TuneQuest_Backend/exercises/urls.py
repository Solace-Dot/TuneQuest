from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExerciseObjectViewSet, DailyPlanViewSet

router = DefaultRouter()
router.register(r'objects', ExerciseObjectViewSet, basename='exercise-object')
router.register(r'plans', DailyPlanViewSet, basename='daily-plan')

urlpatterns = [
    path('', include(router.urls)),
]
