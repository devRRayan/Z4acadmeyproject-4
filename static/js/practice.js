var chosenCourse = '';

document.addEventListener('DOMContentLoaded', function() {
    loadCourses();
});

function loadCourses() {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_courses' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) return;
            var grid = document.getElementById('p-grid');
            grid.innerHTML = '';
            data.courses.forEach(function(c) {
                var card = document.createElement('div');
                card.className = 'p-card';
                card.innerHTML = '<div class="ic">' + (c.icon || '📘') + '</div><h3>' + c.name + '</h3>';
                card.onclick = function() { openChoice(c.key, c.name); };
                grid.appendChild(card);
            });
        });
}

function openChoice(key, name) {
    chosenCourse = key;
    document.getElementById('choice-title').textContent = name;
    document.getElementById('overlay').classList.add('open');
}

function closeChoice() {
    document.getElementById('overlay').classList.remove('open');
}

function goExercise() {
    window.location.href = '/practice/exercise/?course=' + chosenCourse;
}

function goQuiz() {
    window.location.href = '/practice/quiz/?course=' + chosenCourse;
}