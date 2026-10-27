// ============================================
// STATE
// ============================================
var currentCourse = '';
var currentStep = 0;
var lastStep = null;

// message queue so messages type one-by-one (not all at once)
var botQueue = [];
var botBusy = false;
var activeTyping = null; // current typewriter timer (for stop button)

// ============================================
// ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    injectStopButton();
    loadSidebarChats();
    var params = new URLSearchParams(window.location.search);
    var course = params.get('course');
    if (course) {
        currentCourse = course;
        setBadge(course);
        removeWelcome();
        // try to load saved chat first; if none, start fresh
        loadHistory(course, function(hadHistory) {
            if (!hadHistory) startCourse(course);
        });
    }
});

// save a message to the database
function saveMsg(sender, text) {
    fetch('/chat/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({ action: 'save_msg', course: currentCourse, sender: sender, text: text })
    }).catch(function() {});
}

// load saved chat from database
function loadHistory(course, done) {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ action: 'load_msgs', course: course })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success && data.messages && data.messages.length) {
                var m = document.getElementById('chat-messages');
                data.messages.forEach(function(msg) {
                    if (msg.sender === 'user') {
                        renderSavedUser(msg.text);
                    } else {
                        renderSavedBot(msg.text);
                    }
                });
                // add a small note + continue button
                var note = document.createElement('div');
                note.style.cssText = 'align-self:center;color:#999;font-size:12px;margin:8px;';
                note.textContent = '— چاتی پاشەکەوتکراو —';
                m.appendChild(note);
                scrollDown();
                done(true);
            } else {
                done(false);
            }
        })
        .catch(function() { done(false); });
}

// render saved messages instantly (no typing effect)
function renderSavedBot(text) {
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.className = 'message ai-message';
    wrap.innerHTML = '<div class="msg-avatar">Z</div><div class="msg-bubble"></div>';
    wrap.querySelector('.msg-bubble').textContent = text;
    m.appendChild(wrap);
}

function renderSavedUser(text) {
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.className = 'message user-message';
    wrap.innerHTML = '<div class="msg-avatar">U</div><div class="msg-bubble"></div>';
    wrap.querySelector('.msg-bubble').textContent = text;
    m.appendChild(wrap);
}

// Add a STOP button next to the send button
function injectStopButton() {
    var sendBtn = document.getElementById('send-btn');
    if (!sendBtn) return;

    // STOP button
    var stop = document.createElement('button');
    stop.id = 'stop-btn';
    stop.title = 'وەستاندن';
    stop.textContent = '⏹';
    stop.style.cssText = 'background:#dc2626;border:none;color:#fff;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:16px;flex-shrink:0;margin-left:6px;';
    stop.onclick = function() { stopTyping(); };
    sendBtn.parentNode.insertBefore(stop, sendBtn);
}

// Manually save the whole chat into the sidebar list
function saveAllChat() {
    var m = document.getElementById('chat-messages');
    // collect all messages on screen
    var msgs = [];
    m.querySelectorAll('.message').forEach(function(el) {
        var bubble = el.querySelector('.msg-bubble');
        if (!bubble) return;
        var sender = el.classList.contains('user-message') ? 'user' : 'bot';
        msgs.push({ sender: sender, text: bubble.textContent });
    });
    if (msgs.length === 0) { return; }

    var title = (currentCourse ? currentCourse : 'چات') + ' - ' + new Date().toLocaleString();

    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ action: 'save_chat', course: currentCourse, title: title, messages: msgs })
        })
        .then(function(r) { return r.json(); })
        .then(function() {
            var note = document.createElement('div');
            note.style.cssText = 'align-self:center;color:#16a34a;font-size:13px;margin:6px;font-weight:600;';
            note.textContent = '💾 چاتەکە پاشەکەوتکرا و چووە لیستەکە';
            m.appendChild(note);
            scrollDown();
            loadSidebarChats();
        })
        .catch(function() {});
}

// Load saved chats into the sidebar
function loadSidebarChats() {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ action: 'list_saved' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) return;
            renderSidebarChats(data.saved);
        })
        .catch(function() {});
}

function renderSidebarChats(saved) {
    var menu = document.querySelector('.sidebar-menu');
    if (!menu) return;

    // remove old saved-chat container if present
    var oldBox = document.getElementById('saved-chats-box');
    if (oldBox) oldBox.remove();

    var box = document.createElement('div');
    box.id = 'saved-chats-box';
    box.style.cssText = 'margin-top:10px;border-top:1px solid #eee;padding-top:8px;';

    var heading = document.createElement('div');
    heading.textContent = '💾 چاتە پاشەکەوتکراوەکان';
    heading.style.cssText = 'font-size:12px;color:#888;padding:6px 12px;';
    box.appendChild(heading);

    if (!saved || saved.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = 'هیچ نییە';
        empty.style.cssText = 'font-size:12px;color:#bbb;padding:4px 12px;';
        box.appendChild(empty);
    } else {
        saved.forEach(function(c) {
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:#555;';
            row.onmouseover = function() { row.style.background = '#f5f5f5'; };
            row.onmouseout = function() { row.style.background = 'transparent'; };

            var label = document.createElement('span');
            label.textContent = '💬 ' + c.title;
            label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            label.onclick = function() { openSavedChat(c.id); };

            var del = document.createElement('button');
            del.textContent = '🗑️';
            del.title = 'سڕینەوە';
            del.style.cssText = 'background:none;border:none;cursor:pointer;font-size:14px;flex-shrink:0;';
            del.onclick = function(e) {
                e.stopPropagation();
                showConfirm('ئەم چاتە بسڕێتەوە؟', function() {
                    fetch('/chat/send/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                        body: JSON.stringify({ action: 'delete_saved', id: c.id })
                    }).then(function() { loadSidebarChats(); });
                });
            };

            row.appendChild(label);
            row.appendChild(del);
            box.appendChild(row);
        });
    }

    menu.appendChild(box);
}

function openSavedChat(id) {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ action: 'open_saved', id: id })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.success) return;
            var m = document.getElementById('chat-messages');
            m.innerHTML = '';
            botQueue = [];
            botBusy = false;
            data.messages.forEach(function(msg) {
                if (msg.sender === 'user') renderSavedUser(msg.text);
                else renderSavedBot(msg.text);
            });
            var note = document.createElement('div');
            note.style.cssText = 'align-self:center;color:#999;font-size:12px;margin:8px;';
            note.textContent = '— ' + (data.title || 'چاتی پاشەکەوتکراو') + ' —';
            m.appendChild(note);
            scrollDown();
        })
        .catch(function() {});
}

function setBadge(name) {
    var badge = document.getElementById('topic-badge');
    if (badge) badge.textContent = '💬 ' + name;
}

function removeWelcome() {
    var w = document.querySelector('.welcome-screen');
    if (w) w.remove();
}

// ============================================
// FUNCTIONS YOUR HTML CALLS
// ============================================
function quickTopic(course, name) {
    // stop any current typing/queue before switching subject
    if (activeTyping) { clearInterval(activeTyping);
        activeTyping = null; }
    botQueue = [];
    botBusy = false;
    removeTyping();

    currentCourse = course;
    currentStep = 0;
    setBadge(name || course);
    removeWelcome();
    addUserMessage(name || course);
    startCourse(course);
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function sendMessage() {
    var input = document.getElementById('user-input');
    var text = input.value.trim();
    if (!text) return;
    removeWelcome();
    addUserMessage(text);
    input.value = '';
    callAPI({ action: 'message', course: currentCourse, current_step: currentStep, message: text }, function(data) {
        if (data.success && data.reply) addBotMessage(data.reply);
    });
}

function toggleTopics() {
    var p = document.getElementById('topics-popup');
    if (!p) return;

    // if currently inside a course -> fill popup with THAT course's lessons
    if (currentCourse) {
        fillPopupWithLessons(p);
    } else {
        // not in a course -> restore the original language grid (if we replaced it)
        restorePopupLanguages(p);
    }
    p.classList.toggle('open');
}

// fill the topics popup with the current course's lessons
function fillPopupWithLessons(p) {
    var grid = p.querySelector('.topics-grid');
    var headerSpan = p.querySelector('.topics-popup-header span');
    if (!grid) return;

    // remember the original language grid once, so we can restore later
    if (!p.dataset.origGrid) {
        p.dataset.origGrid = grid.innerHTML;
    }
    if (headerSpan) headerSpan.textContent = 'وانەکانی ئەم خولە';

    grid.innerHTML = '<div style="padding:14px;color:#888;">⏳ بارکردن...</div>';

    callAPI({ action: 'topics', course: currentCourse }, function(data) {
        if (!data.success || !data.topics) {
            grid.innerHTML = '<div style="padding:14px;color:#888;">هیچ وانەیەک نییە</div>';
            return;
        }
        grid.innerHTML = '';
        // make the grid one column for lesson rows
        grid.style.gridTemplateColumns = '1fr';
        data.topics.forEach(function(t) {
            var btn = document.createElement('button');
            btn.className = 'topic-item';
            btn.style.cssText = 'flex-direction:row;justify-content:flex-start;gap:10px;direction:rtl;text-align:right;padding:12px;';
            btn.innerHTML = '<span style="font-size:14px;">' + (t.index + 1) + '️⃣</span> ' + t.title;
            btn.onclick = function() {
                closeTopics();
                addUserMessage(t.title);
                callAPI({ action: 'goto', course: currentCourse, goto_index: t.index }, function(d) {
                    if (d.success && d.step) renderStep(d.step);
                    else addBotMessage(d.error || 'هەڵە');
                });
            };
            grid.appendChild(btn);
        });
    });
}

// restore the original language grid
function restorePopupLanguages(p) {
    var grid = p.querySelector('.topics-grid');
    var headerSpan = p.querySelector('.topics-popup-header span');
    if (grid && p.dataset.origGrid) {
        grid.innerHTML = p.dataset.origGrid;
        grid.style.gridTemplateColumns = '';
    }
    if (headerSpan) headerSpan.textContent = 'بابەتەکان هەڵبژێرە';
}

function closeTopics() {
    var p = document.getElementById('topics-popup');
    if (p) p.classList.remove('open');
}

function clearChat() {
    document.getElementById('chat-messages').innerHTML = '';
    botQueue = [];
    botBusy = false;
    currentCourse = '';
    currentStep = 0;
}

function deleteChat() {
    // confirmation popup before deleting
    showConfirm('دڵنیایت دەتەوێت چاتەکە بسڕیتەوە؟', function() {
        fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ action: 'clear_msgs' })
        }).catch(function() {});
        // empty the chat completely
        var m = document.getElementById('chat-messages');
        if (m) m.innerHTML = '';
        botQueue = [];
        botBusy = false;
        currentCourse = '';
        currentStep = 0;
    });
}

// Simple confirm popup
function showConfirm(message, onYes) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:340px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.3);';
    box.innerHTML = '<p style="font-size:16px;color:#111;margin-bottom:20px;font-family:inherit;">' + message + '</p>';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    var yes = document.createElement('button');
    yes.textContent = 'بەڵێ، بیسڕەوە';
    yes.style.cssText = 'background:#dc2626;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;';
    yes.onclick = function() { overlay.remove(); if (onYes) onYes(); };

    var no = document.createElement('button');
    no.textContent = 'نەخێر';
    no.style.cssText = 'background:#eee;color:#111;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-family:inherit;';
    no.onclick = function() { overlay.remove(); };

    btnRow.appendChild(yes);
    btnRow.appendChild(no);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

// ============================================
// API HELPER
// ============================================
function callAPI(payload, onDone) {
    fetch('/chat/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) { onDone(data); })
        .catch(function(err) { addBotMessage('❌ هەڵەی پەیوەندی: ' + err.message); });
}

// ============================================
// START COURSE
// ============================================
function startCourse(courseKey) {
    callAPI({ action: 'start', course: courseKey }, function(data) {
        if (!data.success) { addBotMessage(data.error || 'هەڵەیەک ڕوویدا'); return; }
        if (data.no_steps) { addBotMessage(data.reply); return; }
        if (data.intro) addBotMessage(data.intro);
        if (data.step) { currentStep = data.step.step_index;
            lastStep = data.step;
            addBotMessage(data.step.message, data.step); }
    });
}

function renderStep(step) {
    currentStep = step.step_index;
    lastStep = step;
    addBotMessage(step.message, step);
}

// ============================================
// OPTION CLICKS
// ============================================
function handleOption(action) {
    if (action === 'yes') {
        // YES -> show two choices: continue next lesson OR pick a subject from the list
        addUserMessage('بەڵێ ✅');
        showYesChoices();
    } else if (action === 'no') {
        // NO -> clear chat + goodbye
        addUserMessage('نەخێر ❌');
        setTimeout(function() {
            var m = document.getElementById('chat-messages');
            m.innerHTML = '';
            botQueue = [];
            botBusy = false;
            addBotMessage('خوات لەگەڵ، دەتبینینەوە 👋');
        }, 500);
    } else if (action === 'next') {
        addUserMessage('بەردەوام بوون ▶');
        callAPI({ action: 'next', course: currentCourse, current_step: currentStep }, function(data) {
            if (!data.success) { addBotMessage(data.error || 'هەڵە'); return; }
            if (data.type === 'finished') { addBotMessage(data.reply);
                showSubjectListAfterEnd(); } else if (data.step) { renderStep(data.step); }
        });
    } else if (action === 'topics') {
        addUserMessage('لیستی بابەتەکان 📋');
        callAPI({ action: 'topics', course: currentCourse }, function(data) {
            if (!data.success) { addBotMessage(data.error || 'هەڵە'); return; }
            addBotMessage(data.reply, null, data.topics);
        });
    } else if (action === 'quiz') {
        addUserMessage('تاقیکردنەوە 📝');
        callAPI({ action: 'quiz', course: currentCourse }, function(data) {
            if (!data.success) { addBotMessage(data.error || 'هەڵە'); return; }
            if (data.type === 'no_quiz') { addBotMessage(data.reply); return; }
            addBotMessage(data.reply);
            startQuiz(data.quizzes);
        });
    } else if (action === 'lesson_quiz') {
        addUserMessage('تاقیکردنەوەی ئەم وانەیە 📝');
        var sid = (lastStep && lastStep.step_id) ? lastStep.step_id : null;
        callAPI({ action: 'lesson_quiz', course: currentCourse, step_id: sid }, function(data) {
            if (!data.success) { addBotMessage(data.error || 'هەڵە'); return; }
            if (data.type === 'no_quiz') { addBotMessage(data.reply); return; }
            addBotMessage(data.reply);
            startQuiz(data.quizzes);
        });
    } else if (action === 'exercise') {
        addUserMessage('تاقی دەکەمەوە ✍️');
        var exSid = (lastStep && lastStep.step_id) ? lastStep.step_id : null;
        // fetch the NEW exercises for this lesson
        callAPI({ action: 'list_exercises', course: currentCourse, step_id: exSid }, function(data) {
            if (data.success && data.exercises && data.exercises.length) {
                exerciseList = data.exercises;
                exerciseIdx = 0;
                openExerciseFromList();
            } else {
                // fallback to the old single exercise
                openExercisePanel(lastStep);
            }
        });
    } else if (action === 'finish') {
        addUserMessage('تەواوکردن 🎉');
        callAPI({ action: 'next', course: currentCourse, current_step: currentStep }, function(data) {
            addBotMessage(data.reply || '🎉 پیرۆزە!');
            showSubjectListAfterEnd();
        });
    }
}

// After a course ends, offer the subject list
function showSubjectListAfterEnd() {
    if (!currentCourse) return;
    callAPI({ action: 'topics', course: currentCourse }, function(data) {
        if (data.success && data.topics) {
            addBotMessage('دەتەوێ بابەتێکی تر بخوێنیتەوە؟ هەڵیبژێرە 👇', null, data.topics);
        }
    });
}

// After YES: show two buttons -> continue lesson OR pick subject from list
function showYesChoices() {
    var m = document.getElementById('chat-messages');
    var opts = document.createElement('div');
    opts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start;margin:6px 0 8px;';
    opts.appendChild(makeOptionBtn('▶ بەردەوامبوون', function() { handleOption('next'); }));
    opts.appendChild(makeOptionBtn('📋 لیستی بابەتەکان', function() { handleOption('topics'); }));
    m.appendChild(opts);
    scrollDown();
}

// Bot ASKS "do you want to continue?" then shows بەڵێ / نەخێر
function askContinue() {
    // queue the question so it types out like the AI talking
    botQueue.push({ text: 'دەتەوێ بەردەوام بیت؟', step: null, topics: null, askYesNo: true });
    processQueue();
}

function showYesNoButtons() {
    var m = document.getElementById('chat-messages');
    var opts = document.createElement('div');
    opts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start;margin:6px 0 8px;';
    opts.appendChild(makeOptionBtn('✅ بەڵێ', function() { handleOption('yes'); }));
    opts.appendChild(makeOptionBtn('❌ نەخێر', function() { handleOption('no'); }));
    m.appendChild(opts);
    scrollDown();
}

// ============================================
// BOT MESSAGE (queued + typewriter)
// ============================================
function addBotMessage(text, step, topics) {
    botQueue.push({ text: text, step: step, topics: topics });
    processQueue();
}

function processQueue() {
    if (botBusy) return;
    var item = botQueue.shift();
    if (!item) return;
    botBusy = true;

    showTyping();
    setTimeout(function() {
        removeTyping();
        renderBotMessage(item.text, item.step, item.topics, function() {
            botBusy = false;
            if (item.askYesNo) {
                showYesNoButtons();
            }
            processQueue();
        });
    }, 350);
}

function renderBotMessage(text, step, topics, onDone) {
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.className = 'message ai-message';

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'Z';

    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    m.appendChild(wrap);
    scrollDown();

    saveMsg('bot', text);
    // typewriter effect
    typeWriter(bubble, text, function() {
        // after typing: youtube + code inside bubble
        if (step && step.youtube) {
            var yt = document.createElement('a');
            yt.href = step.youtube;
            yt.target = '_blank';
            yt.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#ff0000;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-size:13px;margin-top:10px;';
            yt.textContent = '▶ سەیری ڤیدیۆ بکە لە YouTube';
            bubble.appendChild(document.createElement('br'));
            bubble.appendChild(yt);
        }
        if (step && step.code) {
            // put code block as its own full-width element (not inside the rtl bubble)
            var codeHolder = document.createElement('div');
            codeHolder.style.cssText = 'align-self:flex-start;width:90%;margin:8px 0;';
            codeHolder.appendChild(makeCodeBlock(step.code));
            m.appendChild(codeHolder);
        }
        // progress bar with % (how much of the course is done)
        if (step && typeof step.step_index === 'number' && step.total) {
            var pct = Math.round(((step.step_index + 1) / step.total) * 100);
            var pwrap = document.createElement('div');
            pwrap.style.cssText = 'margin-top:12px;';
            pwrap.innerHTML =
                '<div style="font-size:11px;color:#888;margin-bottom:4px;">پێشکەوتن: ' + pct + '% (وانەی ' + (step.step_index + 1) + ' لە ' + step.total + ')</div>' +
                '<div style="height:6px;background:#eee;border-radius:4px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:#22c55e;"></div></div>';
            bubble.appendChild(pwrap);
        }

        // topic list
        if (topics && topics.length) {
            showTopicList(topics);
        }

        // If this is a lesson step, decide what buttons to show
        if (step && step.options && step.options.length) {
            var hasExercise = false;
            var hasLessonQuiz = false;
            var isLast = false;
            for (var k = 0; k < step.options.length; k++) {
                if (step.options[k].action === 'exercise') hasExercise = true;
                if (step.options[k].action === 'lesson_quiz') hasLessonQuiz = true;
                if (step.options[k].action === 'finish') isLast = true;
            }

            // exercise (try it) button first
            if (hasExercise) {
                var exWrap = document.createElement('div');
                exWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start;margin:6px 0 2px;';
                exWrap.appendChild(makeOptionBtn('✍️ تاقی بکەرەوە', function() { handleOption('exercise'); }));
                m.appendChild(exWrap);
            }

            // per-lesson quiz: starts AUTOMATICALLY after the lesson
            if (hasLessonQuiz) {
                var sid = step.step_id || null;
                var navIsLast = isLast;
                if (onDone) onDone();
                addBotMessage('📝 با تاقیکردنەوەیەکی کورت بکەین لەسەر ئەم وانەیە:');
                callAPI({ action: 'lesson_quiz', course: currentCourse, step_id: sid }, function(data) {
                    if (data.success && data.quizzes && data.quizzes.length) {
                        // after the quiz finishes, show next/finish buttons
                        quizAfterDone = function() { showLessonNav(navIsLast); };
                        startQuiz(data.quizzes);
                    } else {
                        // no quiz questions -> just show navigation
                        showLessonNav(navIsLast);
                    }
                });
                return;
            }

            // navigation buttons
            showLessonNav(isLast);
            if (onDone) onDone();
            return;
        }

        scrollDown();
        if (onDone) onDone();
    });
}

// show the next/finish + lesson list buttons
function showLessonNav(isLast) {
    var m = document.getElementById('chat-messages');
    var navWrap = document.createElement('div');
    navWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start;margin:6px 0 8px;';
    if (isLast) {
        navWrap.appendChild(makeOptionBtn('🎉 تەواوکردن', function() { handleOption('finish'); }));
    } else {
        navWrap.appendChild(makeOptionBtn('▶ وانەی داهاتوو', function() { handleOption('next'); }));
    }
    navWrap.appendChild(makeOptionBtn('📋 لیستی وانەکان', function() { handleOption('topics'); }));
    m.appendChild(navWrap);
    scrollDown();
}

// typewriter helper
function typeWriter(el, text, done) {
    var i = 0;
    var speed = 15;
    el.textContent = '';

    function finish() {
        // after typing, render the markdown formatting (bold, bullets, code, headings)
        el.innerHTML = renderMarkdown(text);
        attachCodeRunners(el);
    }

    var timer = setInterval(function() {
        el.textContent = text.slice(0, i + 1);
        i++;
        scrollDown();
        if (i >= text.length) {
            clearInterval(timer);
            activeTyping = null;
            finish();
            if (done) { done();
                done = null; }
        }
    }, speed);

    activeTyping = timer;

    // click bubble to skip to full text
    el.onclick = function() {
        clearInterval(timer);
        activeTyping = null;
        finish();
        el.onclick = null;
        if (done) { done();
            done = null; }
    };
}

// Convert simple Markdown to HTML (headings, bold, bullets, code blocks)
function renderMarkdown(text) {
    var esc = function(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    var codeBlocks = [];
    // extract ```code``` blocks first
    text = text.replace(/```(?:python)?\n?([\s\S]*?)```/g, function(m, code) {
        codeBlocks.push(code.replace(/\n$/, ''));
        return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000';
    });

    var lines = text.split('\n');
    var html = '';
    var inList = false;

    lines.forEach(function(line) {
        var t = line.trim();

        // code block placeholder
        var cbMatch = t.match(/^\u0000CODE(\d+)\u0000$/);
        if (cbMatch) {
            if (inList) { html += '</ul>';
                inList = false; }
            html += '\u0001' + cbMatch[1] + '\u0001';
            return;
        }

        if (t === '') { if (inList) { html += '</ul>';
                inList = false; } return; }

        // headings: a numbered title like "1. ..." or a line ending without punctuation -> treat ## as heading
        if (/^#{1,3}\s/.test(t)) {
            if (inList) { html += '</ul>';
                inList = false; }
            var lvl = t.match(/^#+/)[0].length;
            html += '<div style="font-weight:700;font-size:' + (18 - lvl) + 'px;margin:10px 0 4px;">' + inline(esc(t.replace(/^#+\s/, ''))) + '</div>';
            return;
        }

        // bullet
        if (/^[\*\-]\s/.test(t)) {
            if (!inList) { html += '<ul style="margin:6px 18px;padding:0;">';
                inList = true; }
            html += '<li style="margin:3px 0;">' + inline(esc(t.replace(/^[\*\-]\s/, ''))) + '</li>';
            return;
        }

        // numbered heading like "1. عنوان"
        if (/^\d+\.\s/.test(t)) {
            if (inList) { html += '</ul>';
                inList = false; }
            html += '<div style="font-weight:700;margin:8px 0 4px;">' + inline(esc(t)) + '</div>';
            return;
        }

        if (inList) { html += '</ul>';
            inList = false; }
        html += '<div style="margin:4px 0;">' + inline(esc(t)) + '</div>';
    });
    if (inList) html += '</ul>';

    // restore code blocks as styled snippets
    html = html.replace(/\u0001(\d+)\u0001/g, function(m, n) {
        return codeSnippetHtml(codeBlocks[parseInt(n, 10)]);
    });

    return html;
}

// inline formatting: **bold** and `code`
function inline(s) {
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    s = s.replace(/`([^`]+)`/g, '<code style="background:#0d111722;padding:2px 6px;border-radius:4px;font-family:Courier New,monospace;direction:ltr;display:inline-block;">$1</code>');
    return s;
}

// build a runnable code snippet (returns HTML string with a data attribute)
function codeSnippetHtml(code) {
    var id = 'cb' + Math.random().toString(36).slice(2, 9);
    var esc = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div style="margin:10px 0;border-radius:10px;overflow:hidden;border:1px solid #2b2b2b;direction:ltr;text-align:left;">' +
        '<div style="background:#161b22;padding:6px 12px;color:#8b949e;font-size:11px;">کۆد</div>' +
        '<pre style="background:#0d1117;margin:0;padding:14px;overflow-x:auto;color:#e6edf3;font-family:Courier New,monospace;font-size:13px;line-height:1.6;direction:ltr;text-align:left;unicode-bidi:plaintext;">' + esc + '</pre>' +
        '<div style="background:#161b22;padding:8px;"><button type="button" data-code-id="' + id + '" style="background:#238636;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;">▶ جێبەجێکردن</button></div>' +
        '<div id="out-' + id + '" style="display:none;background:#0d1117;color:#4ade80;padding:12px 14px;font-family:Courier New,monospace;font-size:13px;white-space:pre-wrap;"></div>' +
        '<textarea id="src-' + id + '" style="display:none;">' + esc + '</textarea>' +
        '</div>';
}

// attach run handlers to code snippet buttons inside an element
function attachCodeRunners(el) {
    var btns = el.querySelectorAll('button[data-code-id]');
    btns.forEach(function(btn) {
        btn.onclick = function() {
            var id = btn.getAttribute('data-code-id');
            var src = document.getElementById('src-' + id);
            var out = document.getElementById('out-' + id);
            var code = src ? src.value : '';
            out.style.display = 'block';
            out.style.color = '#fbbf24';
            out.textContent = '⏳ چاوەڕێبە...';
            fetch('/api/run-code/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                    body: JSON.stringify({ code: code })
                })
                .then(function(r) { return r.json(); })
                .then(function(d) {
                    if (d.success) { out.style.color = '#4ade80';
                        out.textContent = d.output || '✓ سەرکەوتوو بوو'; } else { out.style.color = '#ff7b72';
                        out.textContent = '❌ ' + d.error; }
                })
                .catch(function(e) { out.style.color = '#ff7b72';
                    out.textContent = '❌ ' + e.message; });
        };
    });
}

// STOP button: halt the current typing immediately
function stopTyping() {
    if (activeTyping) {
        clearInterval(activeTyping);
        activeTyping = null;
    }
    botQueue = []; // drop any queued messages
    botBusy = false;
    removeTyping();

    var note = document.createElement('div');
    note.style.cssText = 'align-self:center;color:#999;font-size:12px;margin:4px;';
    note.textContent = '⏹ وەستێنرا';
    var m = document.getElementById('chat-messages');
    if (m) { m.appendChild(note);
        scrollDown(); }

    // ask the user: do you want to continue? بەڵێ / نەخێر
    var q = document.createElement('div');
    q.className = 'message ai-message';
    q.innerHTML = '<div class="msg-avatar">Z</div><div class="msg-bubble"></div>';
    q.querySelector('.msg-bubble').textContent = 'دەتەوێ بەردەوام بیت؟';
    m.appendChild(q);

    var opts = document.createElement('div');
    opts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-self:flex-start;margin:6px 0 8px;';
    opts.appendChild(makeOptionBtn('✅ بەڵێ', function() { stopYes(); }));
    opts.appendChild(makeOptionBtn('❌ نەخێر', function() { stopNo(); }));
    m.appendChild(opts);
    scrollDown();
}

// Stop -> YES -> show the subject (lesson) list
function stopYes() {
    addUserMessage('بەڵێ ✅');
    if (!currentCourse) {
        addBotMessage('سەرەتا خولێک هەڵبژێرە.');
        return;
    }
    callAPI({ action: 'topics', course: currentCourse }, function(data) {
        if (data.success && data.topics) {
            addBotMessage('باشە! کام بابەت دەتەوێت؟ هەڵیبژێرە 👇', null, data.topics);
        } else {
            addBotMessage(data.error || 'هەڵە');
        }
    });
}

// Stop -> NO -> clear chat + goodbye
function stopNo() {
    addUserMessage('نەخێر ❌');
    setTimeout(function() {
        var m = document.getElementById('chat-messages');
        m.innerHTML = '';
        botQueue = [];
        botBusy = false;
        addBotMessage('خوات لەگەڵ، دەتبینینەوە 👋');
    }, 500);
}

function makeOptionBtn(label, onClick) {
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'background:#111;color:#fff;border:none;padding:10px 18px;border-radius:20px;cursor:pointer;font-size:13px;font-family:inherit;transition:all .2s;';
    btn.onmouseover = function() { btn.style.opacity = '0.85'; };
    btn.onmouseout = function() { btn.style.opacity = '1'; };
    btn.onclick = onClick;
    return btn;
}

// Build a code snippet block: header + highlighted code + Run button + clear output
function makeCodeBlock(codeText) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:12px;border-radius:10px;overflow:hidden;border:1px solid #2b2b2b;direction:ltr;text-align:left;';

    // header bar
    var header = document.createElement('div');
    header.style.cssText = 'background:#161b22;display:flex;justify-content:space-between;align-items:center;padding:6px 12px;';
    var dots = '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ff5f56;margin-right:6px;"></span>' +
        '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ffbd2e;margin-right:6px;"></span>' +
        '<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#27c93f;"></span>';
    header.innerHTML = '<div>' + dots + ' <span style="color:#8b949e;font-size:11px;font-family:Courier New,monospace;margin-left:8px;">کۆد</span></div>';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'کۆپی';
    copyBtn.style.cssText = 'background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:5px;padding:3px 12px;font-size:11px;cursor:pointer;font-family:inherit;';
    copyBtn.onclick = function() {
        navigator.clipboard.writeText(codeText).then(function() {
            copyBtn.textContent = '✓ کۆپیکرا';
            setTimeout(function() { copyBtn.textContent = 'کۆپی'; }, 1500);
        });
    };
    header.appendChild(copyBtn);
    wrap.appendChild(header);

    // code area (highlighted)
    var pre = document.createElement('pre');
    pre.style.cssText = 'background:#0d1117;margin:0;padding:14px;overflow-x:auto;color:#e6edf3;font-family:Courier New,monospace;font-size:13px;line-height:1.6;direction:ltr;text-align:left;unicode-bidi:plaintext;';
    pre.innerHTML = highlightPython(codeText);
    wrap.appendChild(pre);

    // run bar
    var runBar = document.createElement('div');
    runBar.style.cssText = 'background:#161b22;padding:8px 12px;border-top:1px solid #2b2b2b;';
    var runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.innerHTML = '▶ جێبەجێکردن';
    runBtn.style.cssText = 'background:#238636;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;';
    runBar.appendChild(runBtn);
    wrap.appendChild(runBar);

    // output (hidden until run, with a clear label)
    var outWrap = document.createElement('div');
    outWrap.style.cssText = 'display:none;';

    var outLabel = document.createElement('div');
    outLabel.textContent = '📤 ئەنجام';
    outLabel.style.cssText = 'background:#161b22;color:#8b949e;font-size:11px;padding:6px 14px;border-top:1px solid #2b2b2b;font-family:inherit;';

    var out = document.createElement('div');
    out.style.cssText = 'background:#0d1117;color:#4ade80;padding:14px;font-family:Courier New,monospace;font-size:13px;white-space:pre-wrap;direction:ltr;text-align:left;min-height:24px;';

    outWrap.appendChild(outLabel);
    outWrap.appendChild(out);
    wrap.appendChild(outWrap);

    runBtn.onclick = function() {
        outWrap.style.display = 'block';
        out.style.color = '#fbbf24';
        out.textContent = '⏳ چاوەڕێبە...';
        fetch('/api/run-code/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                body: JSON.stringify({ code: codeText })
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.success) {
                    out.style.color = '#4ade80';
                    out.textContent = d.output || '✓ سەرکەوتوو بوو (هیچ ئەنجامێک نییە)';
                } else {
                    out.style.color = '#ff7b72';
                    out.textContent = '❌ هەڵە:\n' + d.error;
                }
                scrollDown();
            })
            .catch(function(e) { out.style.color = '#ff7b72';
                out.textContent = '❌ ' + e.message; });
    };

    return wrap;
}

// Very lightweight Python syntax highlighting (keywords, strings, comments, numbers)
function highlightPython(code) {
    var kw = ['print', 'input', 'if', 'else', 'elif', 'for', 'while', 'def', 'return',
        'import', 'from', 'class', 'True', 'False', 'None', 'in', 'and', 'or', 'not', 'range'
    ];
    var kwSet = {};
    kw.forEach(function(k) { kwSet[k] = true; });

    var out = '';
    var i = 0;
    var n = code.length;

    function esc(ch) {
        if (ch === '&') return '&amp;';
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        return ch;
    }

    while (i < n) {
        var c = code[i];

        // comment until end of line
        if (c === '#') {
            var j = i;
            var com = '';
            while (j < n && code[j] !== '\n') { com += esc(code[j]);
                j++; }
            out += '<span style="color:#8b949e;">' + com + '</span>';
            i = j;
            continue;
        }

        // string (single, double, or triple)
        if (c === '"' || c === "'") {
            var quote = c;
            var triple = code.substr(i, 3) === quote + quote + quote;
            var str = '';
            if (triple) {
                str += esc(code[i]) + esc(code[i + 1]) + esc(code[i + 2]);
                var k = i + 3;
                while (k < n && code.substr(k, 3) !== quote + quote + quote) { str += esc(code[k]);
                    k++; }
                if (k < n) { str += esc(code[k]) + esc(code[k + 1]) + esc(code[k + 2]);
                    k += 3; }
                i = k;
            } else {
                str += esc(code[i]);
                var k2 = i + 1;
                while (k2 < n && code[k2] !== quote && code[k2] !== '\n') { str += esc(code[k2]);
                    k2++; }
                if (k2 < n && code[k2] === quote) { str += esc(code[k2]);
                    k2++; }
                i = k2;
            }
            out += '<span style="color:#a5d6ff;">' + str + '</span>';
            continue;
        }

        // word (keyword or identifier)
        if (/[A-Za-z_]/.test(c)) {
            var word = '';
            while (i < n && /[A-Za-z0-9_]/.test(code[i])) { word += code[i];
                i++; }
            if (kwSet[word]) {
                out += '<span style="color:#ff7b72;">' + word + '</span>';
            } else {
                out += word;
            }
            continue;
        }

        // number
        if (/[0-9]/.test(c)) {
            var num = '';
            while (i < n && /[0-9.]/.test(code[i])) { num += code[i];
                i++; }
            out += '<span style="color:#79c0ff;">' + num + '</span>';
            continue;
        }

        out += esc(c);
        i++;
    }

    return out;
}

function addUserMessage(text) {
    saveMsg('user', text);
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.className = 'message user-message';
    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'U';
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    m.appendChild(wrap);
    scrollDown();
}

// ============================================
// TOPIC (LESSON) LIST
// ============================================
function showTopicList(topics) {
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-self:flex-start;width:90%;margin:4px 0;';
    topics.forEach(function(t) {
        var item = document.createElement('button');
        item.style.cssText = 'background:#fff;border:1px solid #e5e5e5;color:#111;padding:12px 16px;border-radius:10px;cursor:pointer;font-size:14px;font-family:inherit;text-align:right;display:flex;align-items:center;gap:10px;transition:all .2s;';
        item.onmouseover = function() { item.style.background = '#111';
            item.style.color = '#fff'; };
        item.onmouseout = function() { item.style.background = '#fff';
            item.style.color = '#111'; };
        item.innerHTML = '<span style="background:#111;color:#fff;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">' + (t.index + 1) + '</span> ' + t.title;
        item.onclick = function() {
            addUserMessage(t.title);
            callAPI({ action: 'goto', course: currentCourse, goto_index: t.index }, function(data) {
                if (data.success && data.step) renderStep(data.step);
                else addBotMessage(data.error || 'هەڵە');
            });
        };
        wrap.appendChild(item);
    });
    m.appendChild(wrap);
    scrollDown();
}

// ============================================
// SPLIT-SCREEN COMPILER PANEL
// ============================================
var exerciseList = [];
var exerciseIdx = 0;

// open the current exercise from the fetched list (step by step)
function openExerciseFromList() {
    var ex = exerciseList[exerciseIdx];
    if (!ex) return;
    // build a step object compatible with openExercisePanel
    var stepObj = {
        exercise_prompt: ex.prompt,
        starter_code: ex.starter || ex.code || "print('سڵاو')",
        solution: ex.solution || '',
        title: ex.title || '',
        ex_index: exerciseIdx,
        ex_total: exerciseList.length
    };
    openExercisePanel(stepObj);
}

function openExercisePanel(step) {
    // remove old panel if exists
    var old = document.getElementById('exercise-panel');
    if (old) old.remove();

    var prompt = (step && step.exercise_prompt) ? step.exercise_prompt : 'کۆدەکەت بنووسە و جێبەجێی بکە';
    var starter = (step && step.starter_code) ? step.starter_code : "print('سڵاو')";

    var panel = document.createElement('div');
    panel.id = 'exercise-panel';
    panel.style.cssText = 'position:fixed;top:0;left:0;height:100vh;width:50%;background:#0d0d0d;z-index:9999;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,.4);animation:slidein .3s ease;';

    panel.innerHTML =
        '<div style="background:#0f0f0f;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #22c55e;">' +
        '<span style="color:#fff;font-size:15px;font-weight:600;">💻 کۆدنووس' +
        ((step && step.ex_total) ? (' (' + (step.ex_index + 1) + '/' + step.ex_total + ')') : '') + '</span>' +
        '<div>' +
        '<button id="ex-run" style="background:#22c55e;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;margin-left:8px;">▶ جێبەجێکردن</button>' +
        '<button id="ex-close" style="background:#333;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:14px;font-family:inherit;">✕</button>' +
        '</div>' +
        '</div>' +
        '<div style="padding:12px 18px;background:#1a1a1a;color:#fbbf24;font-size:13px;line-height:1.6;">🎯 ' + escapeHtml(prompt) + '</div>' +
        '<div style="padding:6px 18px;background:#1a1a1a;color:#888;font-size:11px;">📝 کۆد</div>' +
        '<textarea id="ex-code" spellcheck="false" style="flex:1;background:#0d0d0d;color:#4ade80;border:none;padding:16px;font-family:Courier New,monospace;font-size:14px;resize:none;outline:none;direction:ltr;text-align:left;"></textarea>' +
        '<div style="padding:6px 18px;background:#1a1a1a;color:#888;font-size:11px;border-top:1px solid #333;">📤 ئەنجام</div>' +
        '<div id="ex-out" style="height:160px;background:#0d0d0d;color:#4ade80;padding:16px;font-family:Courier New,monospace;font-size:14px;overflow-y:auto;white-space:pre-wrap;direction:ltr;text-align:left;">"جێبەجێکردن" دابگرە...</div>';

    document.body.appendChild(panel);

    // shrink the chat app to the right half
    var app = document.querySelector('.app');
    if (app) { app.style.marginLeft = '50%';
        app.style.width = '50%'; }

    var ta = document.getElementById('ex-code');
    var out = document.getElementById('ex-out');
    ta.value = starter;

    document.getElementById('ex-run').onclick = function() {
        var code = ta.value;
        if (!code.trim()) { out.textContent = '❌ کۆدێک بنووسە'; return; }
        out.textContent = '⏳ جێبەجێدەکرێت...';
        fetch('/api/run-code/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
                body: JSON.stringify({ code: code })
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.success) out.textContent = d.output || '✓ سەرکەوتوو بوو';
                else out.textContent = '❌ هەڵە:\n' + d.error;
            })
            .catch(function(e) { out.textContent = '❌ ' + e.message; });
    };

    document.getElementById('ex-close').onclick = function() {
        panel.remove();
        var app2 = document.querySelector('.app');
        if (app2) { app2.style.marginLeft = '0';
            app2.style.width = '100%'; }

        // if there are more exercises in the list, offer the next one
        if (exerciseList.length > 0 && exerciseIdx < exerciseList.length - 1) {
            exerciseIdx++;
            addBotMessage('باشە! ئەمەش ڕاهێنانی دواتر 👇', null);
            var navWrap = document.createElement('div');
            navWrap.style.cssText = 'display:flex;gap:8px;align-self:flex-start;margin:6px 0 8px;';
            navWrap.appendChild(makeOptionBtn('✍️ ڕاهێنانی ' + (exerciseIdx + 1), function() { openExerciseFromList(); }));
            document.getElementById('chat-messages').appendChild(navWrap);
            scrollDown();
        } else if (exerciseList.length > 0) {
            exerciseList = [];
            exerciseIdx = 0;
            addBotMessage('🎉 هەموو ڕاهێنانەکانت تەواوکرد!');
        }
    };

    ta.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') document.getElementById('ex-run').onclick();
    });
}

// ============================================
// TYPING DOTS + HELPERS
// ============================================
function showTyping() {
    var m = document.getElementById('chat-messages');
    var wrap = document.createElement('div');
    wrap.className = 'message ai-message';
    wrap.id = 'typing-indicator';
    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'Z';
    var bubble = document.createElement('div');
    bubble.className = 'typing-bubble';
    bubble.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    m.appendChild(wrap);
    scrollDown();
}

function removeTyping() {
    var t = document.getElementById('typing-indicator');
    if (t) t.remove();
}

function scrollDown() {
    var m = document.getElementById('chat-messages');
    if (m) m.scrollTop = m.scrollHeight;
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// inject slide animation
var styleTag = document.createElement('style');
styleTag.textContent = '@keyframes slidein{from{transform:translateX(-100%);}to{transform:translateX(0);}} @media(max-width:768px){#exercise-panel{width:100% !important;} .app{margin-left:0 !important;width:100% !important;}}';
document.head.appendChild(styleTag);


// ============================================
// QUIZ
// ============================================
var quizData = [];
var quizIndex = 0;
var quizScore = 0;
var quizAfterDone = null; // called when a quiz finishes (for per-lesson quizzes)

function startQuiz(quizzes) {
    quizData = quizzes;
    quizIndex = 0;
    quizScore = 0;
    showQuizQuestion();
}

function showQuizQuestion() {
    if (quizIndex >= quizData.length) {
        // quiz finished -> percentage + grade
        var total = quizData.length;
        var pct = total > 0 ? Math.round((quizScore / total) * 100) : 0;
        var grade = gradeFor(pct);
        var msg = '🏆 ئەنجامی تاقیکردنەوە:\n' +
            'خاڵەکانت: ' + quizScore + ' / ' + total + '\n' +
            'ڕێژە: ' + pct + '%\n' +
            'پلە: ' + grade;
        addBotMessage(msg);
        callAPI({ action: 'quiz_done', course: currentCourse, score: quizScore, total: total }, function() {});

        // if this was a per-lesson quiz, continue with the lesson nav
        if (quizAfterDone) {
            var cb = quizAfterDone;
            quizAfterDone = null;
            setTimeout(cb, 600);
        } else {
            showSubjectListAfterEnd();
        }
        return;
    }

    var q = quizData[quizIndex];
    var m = document.getElementById('chat-messages');

    // question bubble
    var wrap = document.createElement('div');
    wrap.className = 'message ai-message';
    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'Z';
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.style.unicodeBidi = 'plaintext';
    bubble.textContent = '❓ پرسیار ' + (quizIndex + 1) + ' لە ' + quizData.length + ': ' + q.question;

    // code snippet (if the question has code)
    if (q.code) {
        var codeBox = document.createElement('pre');
        codeBox.style.cssText = 'background:#0d1117;color:#e6edf3;border-radius:8px;padding:12px;margin-top:10px;font-family:Courier New,monospace;font-size:13px;line-height:1.6;direction:ltr;text-align:left;unicode-bidi:plaintext;overflow-x:auto;white-space:pre-wrap;';
        codeBox.textContent = q.code;
        bubble.appendChild(codeBox);
    }

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    m.appendChild(wrap);

    // option buttons
    var opts = document.createElement('div');
    opts.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-self:flex-start;width:80%;margin:6px 0;';
    q.options.forEach(function(o) {
        var btn = document.createElement('button');
        btn.style.cssText = 'background:#fff;border:1px solid #e5e5e5;color:#111;padding:12px 16px;border-radius:10px;cursor:pointer;font-size:14px;font-family:inherit;text-align:right;transition:all .2s;unicode-bidi:plaintext;';
        btn.textContent = o.key.toUpperCase() + ') ' + o.text;
        btn.onclick = function() { answerQuiz(o.key, q, opts); };
        opts.appendChild(btn);
    });
    m.appendChild(opts);
    scrollDown();
}

// grade label from percentage
function gradeFor(pct) {
    if (pct >= 90) return '🌟 نایاب (A)';
    if (pct >= 80) return '😃 زۆر باش (B)';
    if (pct >= 70) return '🙂 باش (C)';
    if (pct >= 50) return '😐 ناوەند (D)';
    return '😞 پێویستی بە دووبارەکردنەوە هەیە (F)';
}

function answerQuiz(chosen, q, optsDiv) {
    // disable all buttons
    var btns = optsDiv.querySelectorAll('button');
    btns.forEach(function(b) { b.disabled = true;
        b.style.cursor = 'default'; });

    // each question worth a degree (points). correct = full points.
    var pointsPerQ = Math.round(100 / quizData.length);

    if (chosen === q.correct) {
        quizScore++;
        addUserMessage('✅ ' + chosen.toUpperCase());
        addBotMessage('🎉 ڕاستە! +' + pointsPerQ + ' خاڵ. ' + (q.explanation || ''));
    } else {
        addUserMessage('❌ ' + chosen.toUpperCase());
        addBotMessage('هەڵە بوو. وەڵامی ڕاست: ' + q.correct.toUpperCase() + '. +0 خاڵ. ' + (q.explanation || ''));
    }

    quizIndex++;
    setTimeout(showQuizQuestion, 900);
}