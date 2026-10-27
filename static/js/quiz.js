var course = '';
var quizzes = [];
var idx = 0;
var score = 0;

document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    course = params.get('course') || '';
    document.getElementById('q-course-name').textContent = course;
    loadQuiz();
});

function loadQuiz() {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'quiz', course: course })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var wrap = document.getElementById('q-wrap');
            if (!data.success || data.type === 'no_quiz' || !data.quizzes || !data.quizzes.length) {
                wrap.innerHTML = '<div class="q-result">ئەم خولە هێشتا تاقیکردنەوەی نییە 🙁</div>';
                return;
            }
            quizzes = data.quizzes;
            idx = 0;
            score = 0;
            showQuestion();
        });
}

function showQuestion() {
    var wrap = document.getElementById('q-wrap');
    if (idx >= quizzes.length) {
        var pct = Math.round((score / quizzes.length) * 100);
        var grade = gradeFor(pct);
        wrap.innerHTML = '<div class="q-result">🏆 تەواوبوو!<div class="score">' + score + ' / ' + quizzes.length + '</div>ڕێژە: ' + pct + '%<br>پلە: ' + grade + '<br><button class="q-restart" onclick="location.reload()">دووبارە</button></div>';
        return;
    }
    var q = quizzes[idx];
    var codeHtml = '';
    if (q.code) {
        var escCode = q.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        codeHtml = '<pre style="background:#0d1117;color:#e6edf3;border-radius:8px;padding:12px;margin:10px 0;font-family:Courier New,monospace;font-size:13px;line-height:1.6;direction:ltr;text-align:left;unicode-bidi:plaintext;overflow-x:auto;white-space:pre-wrap;">' + escCode + '</pre>';
    }
    var html = '<div class="q-card"><div class="q-question">❓ (' + (idx + 1) + ' لە ' + quizzes.length + ') ' + q.question + '</div>' + codeHtml + '<div id="q-opts"></div></div>';
    wrap.innerHTML = html;
    var optsDiv = document.getElementById('q-opts');
    q.options.forEach(function(o) {
        var btn = document.createElement('button');
        btn.className = 'q-opt';
        btn.textContent = o.key.toUpperCase() + ') ' + o.text;
        btn.onclick = function() { answer(o.key, q, btn, optsDiv); };
        optsDiv.appendChild(btn);
    });
}

function answer(chosen, q, btn, optsDiv) {
    var btns = optsDiv.querySelectorAll('button');
    btns.forEach(function(b) { b.disabled = true; });
    if (chosen === q.correct) {
        score++;
        btn.classList.add('correct');
    } else {
        btn.classList.add('wrong');
        // highlight the correct one
        btns.forEach(function(b) {
            if (b.textContent.charAt(0).toLowerCase() === q.correct) b.classList.add('correct');
        });
    }
    idx++;
    setTimeout(showQuestion, 1100);
}

function gradeFor(pct) {
    if (pct >= 90) return '🌟 نایاب (A)';
    if (pct >= 80) return '😃 زۆر باش (B)';
    if (pct >= 70) return '🙂 باش (C)';
    if (pct >= 50) return '😐 ناوەند (D)';
    return '😞 پێویستی بە دووبارەکردنەوە هەیە (F)';
}