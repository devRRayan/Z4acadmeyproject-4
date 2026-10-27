from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import subprocess
import json
import random
import urllib.request
import urllib.error
from .models import Course, LearningStep, Quiz, UserProgress, ChatMessage, SavedChat, Exercise


def home(request):
    return render(request, 'index.html')


def chat(request):
    return render(request, 'chat.html')


def learn_python(request):
    return render(request, 'learn_python.html')


def practice(request):
    return render(request, 'practice.html')


def practice_quiz(request):
    return render(request, 'quiz.html')


def practice_exercise(request):
    return render(request, 'exercise.html')


def about(request):
    return render(request, 'about.html')


# ============================================
# HELPERS
# ============================================

def _get_session_key(request):
    if not request.session.session_key:
        request.session.save()
    return request.session.session_key


def _save_progress(request, course, completed_steps=None, quiz_score=None, quiz_total=None):
    try:
        sk = _get_session_key(request)
        prog, _ = UserProgress.objects.get_or_create(session_key=sk, course=course)
        if completed_steps is not None and completed_steps > prog.completed_steps:
            prog.completed_steps = completed_steps
        if quiz_score is not None:
            prog.quiz_score = quiz_score
        if quiz_total is not None:
            prog.quiz_total = quiz_total
        prog.save()
    except Exception as e:
        print("progress error:", e)


def _step_to_json(step, index, total):
    options = []
    if step.has_exercise:
        options.append({'label': '✍️ تاقی بکەرەوە', 'action': 'exercise'})

    # does THIS lesson have its own quiz?
    has_lesson_quiz = step.quizzes.exists()
    if has_lesson_quiz:
        options.append({'label': '📝 تاقیکردنەوەی ئەم وانەیە', 'action': 'lesson_quiz'})

    if index < total - 1:
        options.append({'label': '▶ وانەی داهاتوو', 'action': 'next'})
        options.append({'label': '📋 لیستی وانەکان', 'action': 'topics'})
    else:
        options.append({'label': '🎉 تەواوکردن', 'action': 'finish'})
        options.append({'label': '📋 لیستی وانەکان', 'action': 'topics'})

    return {
        'title': step.title,
        'message': step.message,
        'youtube': step.youtube_link or '',
        'code': step.code_example or '',
        'has_exercise': step.has_exercise,
        'exercise_prompt': step.exercise_prompt or '',
        'starter_code': step.starter_code or '',
        'has_quiz': has_lesson_quiz,
        'step_id': step.id,
        'options': options,
        'step_index': index,
        'total': total,
    }


def _ask_gemini(user_text):
    """Call Google Gemini API using built-in urllib (no pip install needed)."""
    api_key = getattr(settings, 'GEMINI_API_KEY', '').strip()
    if not api_key:
        return 'ببورە، ئامێری AI هێشتا ڕێکنەخراوە. (Gemini API key نییە)'

    system = ("You are ZAI, a friendly coding teacher for Zagros Academy. "
              "Answer in Kurdish (Sorani) when possible. Keep answers short and clear. "
              "User question: ")

    body = json.dumps({
        "contents": [{"parts": [{"text": system + user_text}]}]
    }).encode('utf-8')

    # Try several model names (Google changes these over time)
    models = [
        'gemini-2.5-flash',
    ]

    last_err = ''
    for model in models:
        url = ('https://generativelanguage.googleapis.com/v1beta/models/'
               + model + ':generateContent?key=' + api_key)
        req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                result = json.loads(resp.read().decode('utf-8'))
            return result['candidates'][0]['content']['parts'][0]['text']
        except urllib.error.HTTPError as e:
            last_err = 'HTTP ' + str(e.code)
            # 404 = this model not found, try the next one. Other errors: stop.
            if e.code == 404:
                continue
            if e.code == 429:
                return 'AI ئێستا قەرەباڵغە ✋ تکایە چەند خولەکێک چاوەڕێ بکە و دووبارە هەوڵبدەرەوە.'
            try:
                detail = e.read().decode('utf-8')[:200]
            except Exception:
                detail = ''
            return 'هەڵەی Gemini: ' + str(e.code) + ' ' + detail
        except Exception as e:
            last_err = str(e)
            continue

    return 'هەڵە لە AI (هیچ مۆدێلێک کارینەکرد): ' + last_err


# ============================================
# CHATBOT API
# ============================================

@csrf_exempt
def chat_send(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'method not allowed'}, status=405)

    try:
        data = json.loads(request.body)
        action = data.get('action', 'message')
        course_key = data.get('course', '')
        current_step = data.get('current_step', 0)
        goto_index = data.get('goto_index', 0)
        user_message = data.get('message', '').strip()

        course = None
        if course_key:
            course = Course.objects.filter(key=course_key).first()

        if action == 'list_courses':
            courses = Course.objects.all()
            course_list = [{'key': c.key, 'name': c.name, 'icon': c.icon} for c in courses]
            return JsonResponse({'success': True, 'type': 'course_list',
                                 'reply': 'بەخێربێیت! 👋 کام زمان دەتەوێت فێربیت؟',
                                 'courses': course_list})

        if action == 'topics':
            if not course:
                return JsonResponse({'success': False, 'error': 'خول نەدۆزرایەوە'})
            steps = list(course.steps.all())
            topic_list = [{'index': i, 'title': s.title} for i, s in enumerate(steps)]
            return JsonResponse({'success': True, 'type': 'topic_list',
                                 'reply': 'باشە! کام وانە دەتەوێت؟ هەڵیبژێرە 👇',
                                 'topics': topic_list})

        if action == 'start':
            if not course:
                return JsonResponse({'success': False, 'error': 'ئەم خولە نەدۆزرایەوە'})
            steps = list(course.steps.all())
            total = len(steps)
            if total == 0:
                return JsonResponse({'success': True, 'type': 'intro', 'reply': course.intro, 'no_steps': True})
            first = _step_to_json(steps[0], 0, total)
            _save_progress(request, course, completed_steps=1)
            return JsonResponse({'success': True, 'type': 'intro', 'intro': course.intro,
                                 'course_name': course.name, 'step': first})

        if action == 'goto':
            if not course:
                return JsonResponse({'success': False, 'error': 'خول نەدۆزرایەوە'})
            steps = list(course.steps.all())
            total = len(steps)
            if goto_index < 0 or goto_index >= total:
                return JsonResponse({'success': False, 'error': 'وانە نەدۆزرایەوە'})
            step = _step_to_json(steps[goto_index], goto_index, total)
            return JsonResponse({'success': True, 'type': 'step', 'step': step})

        if action == 'next':
            if not course:
                return JsonResponse({'success': False, 'error': 'خول نەدۆزرایەوە'})
            steps = list(course.steps.all())
            total = len(steps)
            next_index = current_step + 1
            if next_index >= total:
                return JsonResponse({'success': True, 'type': 'finished',
                                     'reply': '🎉 پیرۆزە! خولەکەت تەواوکرد. زۆر باش بوو!'})
            step = _step_to_json(steps[next_index], next_index, total)
            _save_progress(request, course, completed_steps=next_index + 1)
            return JsonResponse({'success': True, 'type': 'step', 'step': step})

        # ---- QUIZ (course-wide OR per-lesson) ----
        if action == 'quiz' or action == 'lesson_quiz':
            if not course:
                return JsonResponse({'success': False, 'error': 'خول نەدۆزرایەوە'})

            if action == 'lesson_quiz':
                # quiz for a specific lesson
                step_id = data.get('step_id')
                quizzes = list(Quiz.objects.filter(course=course, step_id=step_id))
            else:
                # course-wide quiz (questions with no specific lesson)
                quizzes = list(course.quizzes.all())

            if not quizzes:
                return JsonResponse({'success': True, 'type': 'no_quiz',
                                     'reply': 'ئەم وانەیە هێشتا تاقیکردنەوەی نییە.'})

            # limit the number of questions (random pick), default 5
            limit = getattr(course, 'quiz_limit', 5) or 5
            if len(quizzes) > limit:
                quizzes = random.sample(quizzes, limit)

            qlist = []
            for q in quizzes:
                opts = [{'key': 'a', 'text': q.option_a}, {'key': 'b', 'text': q.option_b}]
                if q.option_c:
                    opts.append({'key': 'c', 'text': q.option_c})
                if q.option_d:
                    opts.append({'key': 'd', 'text': q.option_d})
                qlist.append({'id': q.id, 'question': q.question, 'code': q.code or '', 'options': opts,
                              'correct': q.correct, 'explanation': q.explanation})
            return JsonResponse({'success': True, 'type': 'quiz',
                                 'reply': '📝 تاقیکردنەوە! وەڵامی ڕاست هەڵبژێرە:',
                                 'quizzes': qlist})

        if action == 'quiz_done':
            score = data.get('score', 0)
            total = data.get('total', 0)
            if course:
                _save_progress(request, course, quiz_score=score, quiz_total=total)
            return JsonResponse({'success': True})

        if action == 'progress':
            sk = _get_session_key(request)
            progs = UserProgress.objects.filter(session_key=sk)
            plist = [{'course': p.course.name, 'steps': p.completed_steps,
                      'score': p.quiz_score, 'total': p.quiz_total} for p in progs]
            return JsonResponse({'success': True, 'type': 'progress', 'progress': plist})

        # ---- LIST EXERCISES for a course ----
        if action == 'list_exercises':
            if not course:
                return JsonResponse({'success': False, 'error': 'خول نەدۆزرایەوە'})
            step_id = data.get('step_id')   # optional: exercises for one lesson
            elist = []
            # 1) new Exercise model (many per course)
            ex_qs = course.exercises.all()
            if step_id:
                ex_qs = ex_qs.filter(step_id=step_id)
            for ex in ex_qs:
                elist.append({
                    'title': ex.title,
                    'prompt': ex.prompt or '',
                    'starter': ex.starter_code or '',
                    'solution': ex.solution or '',
                    'code': '',
                })
            # 2) fallback: old lesson-based exercises (only when not filtering by step)
            if not elist and not step_id:
                for s in course.steps.filter(has_exercise=True):
                    elist.append({
                        'title': s.title,
                        'prompt': s.exercise_prompt or '',
                        'starter': s.starter_code or '',
                        'solution': '',
                        'code': s.code_example or '',
                    })
            return JsonResponse({'success': True, 'exercises': elist})

        # ---- SAVE / LOAD / CLEAR CHAT MESSAGES ----
        if action == 'save_msg':
            sk = _get_session_key(request)
            sender = data.get('sender', 'bot')
            text = data.get('text', '')
            if text:
                ChatMessage.objects.create(session_key=sk, course=course_key, sender=sender, text=text)
            return JsonResponse({'success': True})

        if action == 'load_msgs':
            sk = _get_session_key(request)
            msgs = ChatMessage.objects.filter(session_key=sk)
            if course_key:
                msgs = msgs.filter(course=course_key)
            mlist = [{'sender': m.sender, 'text': m.text} for m in msgs]
            return JsonResponse({'success': True, 'type': 'history', 'messages': mlist})

        if action == 'clear_msgs':
            sk = _get_session_key(request)
            ChatMessage.objects.filter(session_key=sk).delete()
            return JsonResponse({'success': True})

        # ---- SAVED CHATS (sidebar) ----
        if action == 'save_chat':
            sk = _get_session_key(request)
            title = data.get('title', 'چات')
            messages = data.get('messages', [])
            SavedChat.objects.create(
                session_key=sk, title=title, course=course_key,
                messages_json=json.dumps(messages)
            )
            return JsonResponse({'success': True})

        if action == 'list_saved':
            sk = _get_session_key(request)
            chats = SavedChat.objects.filter(session_key=sk)
            clist = [{'id': c.id, 'title': c.title, 'course': c.course} for c in chats]
            return JsonResponse({'success': True, 'saved': clist})

        if action == 'open_saved':
            sk = _get_session_key(request)
            cid = data.get('id')
            chat = SavedChat.objects.filter(session_key=sk, id=cid).first()
            if not chat:
                return JsonResponse({'success': False, 'error': 'نەدۆزرایەوە'})
            try:
                msgs = json.loads(chat.messages_json)
            except Exception:
                msgs = []
            return JsonResponse({'success': True, 'messages': msgs, 'title': chat.title})

        if action == 'delete_saved':
            sk = _get_session_key(request)
            cid = data.get('id')
            SavedChat.objects.filter(session_key=sk, id=cid).delete()
            return JsonResponse({'success': True})

        # ---- FREE MESSAGE -> GEMINI AI ----
        if action == 'message':
            if not user_message:
                return JsonResponse({'success': True, 'reply': 'تکایە پرسیارێک بنووسە.'})
            answer = _ask_gemini(user_message)
            return JsonResponse({'success': True, 'type': 'ai', 'reply': answer})

        return JsonResponse({'success': True, 'type': 'message',
                             'reply': 'تکایە یەکێک لە دوگمەکان هەڵبژێرە 👇'})

    except Exception as e:
        print("Error:", str(e))
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def run_code(request):
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        if not code.strip():
            return JsonResponse({'success': False, 'error': 'کۆدێک بنووسە'})

        # Force UTF-8 so Kurdish/Arabic text prints correctly on Windows
        import os
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONUTF8'] = '1'

        result = subprocess.run(
            ['python', '-X', 'utf8', '-c', code],
            capture_output=True,
            text=True,
            timeout=5,
            encoding='utf-8',
            env=env,
        )
        if result.returncode != 0:
            return JsonResponse({'success': False, 'error': result.stderr})
        return JsonResponse({'success': True, 'output': result.stdout})
    except subprocess.TimeoutExpired:
        return JsonResponse({'success': False, 'error': 'کات تەواوبوو (٥ چرکە)'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})