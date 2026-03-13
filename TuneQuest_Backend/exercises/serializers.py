from rest_framework import serializers
from .models import ExerciseObject, ExerciseHistoryLog, DailyPlan


class ExerciseObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseObject
        fields = '__all__'
        read_only_fields = ('id', 'user', 'route_to', 'created_at')


class ExerciseHistoryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExerciseHistoryLog
        fields = '__all__'
        read_only_fields = ('id', 'user', 'archived_at')


class DailyPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyPlan
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

