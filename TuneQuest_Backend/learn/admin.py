from django.contrib import admin
from .models import Lesson, LessonProgress


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('slug', 'title', 'category', 'difficulty', 'duration_minutes', 'order')
    list_filter = ('category', 'difficulty')
    search_fields = ('slug', 'title')
    ordering = ('order',)


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'lesson', 'completed_at')
    list_filter = ('lesson__category',)
    search_fields = ('user__email', 'lesson__title')
    ordering = ('-completed_at',)
