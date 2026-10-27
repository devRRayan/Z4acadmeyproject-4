var course = '';
var exercises = [];
var activeIndex = 0;

document.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    course = params.get('course') || '';
    document.getElementById('e-course-name').textContent = course;

    document.getElementById('e-run').onclick = runCode;
    document.getElementById('e-editor').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') runCode();
    });

    // dark / light theme toggle
    var themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
        themeBtn.onclick = function() {
            document.body.classList.toggle('light');
            var isLight = document.body.classList.contains('light');
            themeBtn.textContent = isLight ? '☀️' : '🌙';
        };
    }

    loadExercises();
});

function loadExercises() {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_exercises', course: course })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success || !data.exercises || !data.exercises.length) {
                document.getElementById('e-prompt').textContent = 'ئەم خولە هێشتا ڕاهێنانی نییە 🙁';
                document.getElementById('e-editor').value = '';
                return;
            }
            exercises = data.exercises;
            renderTabs();
            selectExercise(0);
        });
}

function renderTabs() {
    var tabs = document.getElementById('e-tabs');
    tabs.innerHTML = '';
    exercises.forEach(function(ex, i) {
        var btn = document.createElement('button');
        btn.className = 'e-tab' + (i === 0 ? ' active' : '');
        btn.textContent = (i + 1) + '. ' + ex.title;
        btn.onclick = function() { selectExercise(i); };
        tabs.appendChild(btn);
    });
}

function selectExercise(i) {
    activeIndex = i;
    var ex = exercises[i];

    // highlight active tab
    var allTabs = document.querySelectorAll('.e-tab');
    allTabs.forEach(function(t, ti) { t.classList.toggle('active', ti === i); });

    var promptEl = document.getElementById('e-prompt');
    if (ex.prompt) {
        promptEl.innerHTML = '<div style="color:#04AA6D;font-size:13px;margin-bottom:6px;font-weight:700;">❓ پرسیار / ئەرک</div>' +
            '<div style="font-size:17px;line-height:1.8;color:#fff;">' + escapeHtml(ex.prompt) + '</div>';
        promptEl.style.cssText = 'background:#16233a;border-right:4px solid #04AA6D;padding:16px 20px;margin:0;direction:rtl;text-align:right;unicode-bidi:plaintext;display:block;';
    } else {
        promptEl.innerHTML = '';
        promptEl.style.display = 'none';
    }
    document.getElementById('e-editor').value = ex.starter || ex.code || "print('سڵاو')";
    document.getElementById('e-output').textContent = 'ئەنجام لێرە دەردەکەوێت...';
    document.getElementById('e-output').style.color = '#888';
}

function runCode() {
    var code = document.getElementById('e-editor').value;
    var out = document.getElementById('e-output');
    var ex = exercises[activeIndex];
    out.style.color = '#fbbf24';
    out.textContent = '⏳ چاوەڕێبە...';
    fetch('/api/run-code/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.success) {
                out.style.color = '#fff';
                var output = d.output || '';
                out.textContent = output || '✓ سەرکەوتوو بوو (هیچ ئەنجامێک نییە)';

                // check against solution if there is one
                if (ex && ex.solution && ex.solution.trim()) {
                    checkSolution(code, output, ex.solution, out);
                }
            } else { out.style.color = '#ff6b6b';
                out.textContent = d.error; }
        })
        .catch(function(e) { out.style.color = '#ff6b6b';
            out.textContent = e.message; });
}

// compare the user's code OR output against the solution
function checkSolution(userCode, userOutput, solution, out) {
    var norm = function(s) { return (s || '').replace(/\s+/g, ' ').trim(); };
    var sol = norm(solution);
    var ok = (norm(userCode) === sol) || (norm(userOutput) === sol);

    // also run the solution and compare outputs
    if (!ok) {
        fetch('/api/run-code/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: solution })
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var solOut = d.success ? norm(d.output) : '';
                var match = solOut && solOut === norm(userOutput);
                showCheck(out, match);
            })
            .catch(function() { showCheck(out, false); });
    } else {
        showCheck(out, true);
    }
}

function showCheck(out, ok) {
    var badge = document.createElement('div');
    badge.style.cssText = 'margin-top:10px;padding:8px 12px;border-radius:8px;font-family:inherit;font-weight:700;direction:rtl;';
    if (ok) {
        badge.style.background = '#16a34a';
        badge.style.color = '#fff';
        badge.textContent = '✅ تەواو ڕاستە! وەڵامەکەت دروستە';
    } else {
        badge.style.background = '#dc2626';
        badge.style.color = '#fff';
        badge.textContent = '❌ هێشتا ڕاست نییە، دووبارە هەوڵبدە';
    }
    out.appendChild(document.createElement('br'));
    out.appendChild(badge);
}

function escapeHtml(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}