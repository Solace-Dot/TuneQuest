from django.contrib import admin
from .models import Exercise, UserExerciseLog, ExerciseObject, ExerciseHistoryLog, DailyPlan

admin.site.register(Exercise)
admin.site.register(UserExerciseLog)


@admin.register(ExerciseObject)
class ExerciseObjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'route_to', 'skill_level', 'status', 'user', 'created_at')
    list_filter = ('category', 'route_to', 'skill_level', 'status')
    search_fields = ('title', 'user__email')
    readonly_fields = ('id', 'route_to', 'created_at')


@admin.register(ExerciseHistoryLog)
class ExerciseHistoryLogAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'skill_level', 'best_score', 'accuracy', 'user', 'archived_at')
    list_filter = ('category', 'skill_level')
    search_fields = ('title', 'user__email')
    readonly_fields = ('archived_at',)


@admin.register(DailyPlan)
class DailyPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'focus', 'duration_goal', 'difficulty', 'user', 'created_at')
    list_filter = ('difficulty', 'created_at')
    search_fields = ('title', 'focus', 'user__email')
    readonly_fields = ('id', 'created_at')
