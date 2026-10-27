from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('chat/', views.chat, name='chat'),
    path('chat/send/', views.chat_send, name='chat_send'),
    path('learn/python/', views.learn_python, name='learn_python'),
    path('api/run-code/', views.run_code, name='run_code'),

    # Practice section (Exercises & Quizzes)
    path('practice/', views.practice, name='practice'),
    path('practice/quiz/', views.practice_quiz, name='practice_quiz'),
    path('practice/exercise/', views.practice_exercise, name='practice_exercise'),
    path('about/', views.about, name='about'),
]