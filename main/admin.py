from django.contrib import admin
from .models import (
    Lesson, LessonContent, Course, LearningStep,
    Quiz, UserProgress, ChatMessage, SavedChat, Exercise
)


class LessonContentInline(admin.TabularInline):
    model = LessonContent
    extra = 1
    fields = ('order', 'text', 'code', 'image_url', 'video_link')


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'order')
    inlines = [LessonContentInline]


@admin.register(LessonContent)
class LessonContentAdmin(admin.ModelAdmin):
    list_display = ('lesson', 'order', 'text')


# ============================================
# GUIDED LEARNING ADMIN
# ============================================

class LearningStepInline(admin.StackedInline):
    model = LearningStep
    extra = 1
    fields = (
        'order', 'title', 'message',
        'youtube_link', 'code_example',
        'has_exercise', 'exercise_prompt', 'starter_code',
    )


class QuizInline(admin.StackedInline):
    model = Quiz
    extra = 1
    fields = ('order', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'explanation')


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'key', 'order', 'quiz_limit')
    prepopulated_fields = {'key': ('name',)}
    inlines = [LearningStepInline, QuizInline]


@admin.register(LearningStep)
class LearningStepAdmin(admin.ModelAdmin):
    list_display = ('course', 'order', 'title', 'has_exercise')
    list_filter = ('course', 'has_exercise')
    search_fields = ('title', 'message')


# ============================================
# QUIZ ADMIN
# ============================================

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('course', 'step', 'order', 'question', 'correct')
    list_filter = ('course', 'step')
    search_fields = ('question',)
    fieldsets = (
        ('Question', {'fields': ('course', 'step', 'order', 'question', 'code')}),
        ('Options', {'fields': ('option_a', 'option_b', 'option_c', 'option_d')}),
        ('Answer', {'fields': ('correct', 'explanation')}),
    )


# ============================================
# PROGRESS ADMIN
# ============================================

@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ('course', 'session_key', 'completed_steps', 'quiz_score', 'quiz_total', 'updated_at')
    list_filter = ('course',)
    readonly_fields = ('session_key', 'course', 'completed_steps', 'quiz_score', 'quiz_total', 'updated_at')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'course', 'text', 'session_key', 'created_at')
    list_filter = ('sender', 'course')
    search_fields = ('text',)
    readonly_fields = ('session_key', 'course', 'sender', 'text', 'created_at')


@admin.register(SavedChat)
class SavedChatAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'session_key', 'created_at')
    list_filter = ('course',)
    search_fields = ('title',)


# ============================================
# EXERCISE ADMIN
# ============================================

@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = ('course', 'step', 'order', 'title')
    list_filter = ('course', 'step')
    search_fields = ('title', 'prompt')
    fieldsets = (
        ('Exercise', {'fields': ('course', 'step', 'order', 'title', 'prompt')}),
        ('Code', {'fields': ('starter_code', 'solution')}),
    )