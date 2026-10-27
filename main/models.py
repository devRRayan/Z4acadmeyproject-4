from django.db import models


class Lesson(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    order = models.IntegerField()

    def __str__(self):
        return self.title


class LessonContent(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    code = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    video_link = models.URLField(blank=True)
    order = models.IntegerField()

    def __str__(self):
        return f"{self.lesson.title} - Content {self.order}"


# ============================================
# GUIDED LEARNING CHATBOT
# ============================================

class Course(models.Model):
    key = models.SlugField(max_length=50, unique=True, help_text="e.g. python, html, css")
    name = models.CharField(max_length=100, help_text="e.g. Python")
    icon = models.CharField(max_length=10, blank=True, help_text="e.g. 🐍")
    intro = models.TextField(help_text="First message about this course (Kurdish)")
    order = models.IntegerField(default=0)
    quiz_limit = models.IntegerField(default=5, help_text="How many quiz questions to show (random). Default 5.")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.icon} {self.name}"


class LearningStep(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='steps')
    order = models.IntegerField(help_text="Step order: 1, 2, 3...")
    title = models.CharField(max_length=200)
    message = models.TextField(help_text="What the bot says (Kurdish)")
    youtube_link = models.URLField(blank=True)
    code_example = models.TextField(blank=True)
    has_exercise = models.BooleanField(default=False)
    exercise_prompt = models.TextField(blank=True)
    starter_code = models.TextField(blank=True)

    class Meta:
        ordering = ['course', 'order']

    def __str__(self):
        return f"{self.course.name} - Step {self.order}: {self.title}"


# ============================================
# QUIZ
# ============================================

class Quiz(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='quizzes')
    step = models.ForeignKey(
        LearningStep, on_delete=models.CASCADE, related_name='quizzes',
        null=True, blank=True,
        help_text="Which lesson is this quiz for? (leave empty = end-of-course quiz)"
    )
    order = models.FloatField(default=0, help_text="Question order (e.g. 1, 2, 3.1, 3.2)")
    question = models.TextField(help_text="The quiz question (Kurdish)")
    option_a = models.CharField(max_length=255, help_text="Option A")
    option_b = models.CharField(max_length=255, help_text="Option B")
    option_c = models.CharField(max_length=255, blank=True, help_text="Option C (optional)")
    option_d = models.CharField(max_length=255, blank=True, help_text="Option D (optional)")
    correct = models.CharField(
        max_length=1,
        choices=[('a', 'A'), ('b', 'B'), ('c', 'C'), ('d', 'D')],
        help_text="Which option is correct?"
    )
    explanation = models.TextField(blank=True, help_text="Shown after answering (optional)")
    code = models.TextField(blank=True, help_text="Optional code snippet shown above the question")

    class Meta:
        ordering = ['course', 'order']
        verbose_name_plural = "Quizzes"

    def __str__(self):
        return f"{self.course.name} - Q{self.order}: {self.question[:40]}"


# ============================================
# PROGRESS TRACKING
# ============================================

class UserProgress(models.Model):
    session_key = models.CharField(max_length=100, db_index=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    completed_steps = models.IntegerField(default=0)
    quiz_score = models.IntegerField(default=0)
    quiz_total = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session_key', 'course')
        verbose_name_plural = "User Progress"

    def __str__(self):
        return f"{self.course.name} - {self.session_key[:8]} ({self.completed_steps} steps)"


# ============================================
# SAVED CHAT MESSAGES
# ============================================

class ChatMessage(models.Model):
    session_key = models.CharField(max_length=100, db_index=True)
    course = models.CharField(max_length=50, blank=True)
    sender = models.CharField(max_length=10)  # 'bot' or 'user'
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender}: {self.text[:40]}"


# ============================================
# SAVED CHATS (shown in sidebar)
# ============================================

class SavedChat(models.Model):
    session_key = models.CharField(max_length=100, db_index=True)
    title = models.CharField(max_length=200)
    course = models.CharField(max_length=50, blank=True)
    messages_json = models.TextField(blank=True)  # the whole chat as JSON
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


# ============================================
# EXERCISES (many per course/lesson)
# ============================================

class Exercise(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='exercises')
    step = models.ForeignKey(
        LearningStep, on_delete=models.CASCADE, related_name='exercises',
        null=True, blank=True,
        help_text="Which lesson is this exercise for? (optional)"
    )
    order = models.FloatField(default=0, help_text="Exercise order (e.g. 1, 2, 3.1)")
    title = models.CharField(max_length=200, help_text="Short title (Kurdish)")
    prompt = models.TextField(help_text="The task / instruction (Kurdish)")
    starter_code = models.TextField(blank=True, help_text="Code that appears in the editor")
    solution = models.TextField(blank=True, help_text="The expected correct code/output (to check)")

    class Meta:
        ordering = ['course', 'order']

    def __str__(self):
        return f"{self.course.name} - {self.title}"