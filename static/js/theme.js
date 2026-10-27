// ============================================
// SITE-WIDE DARK / LIGHT THEME
// default = dark. choice saved in localStorage.
// ============================================
(function() {
    var KEY = 'zag-theme';
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    var theme = saved || 'dark'; // default dark
    applyTheme(theme);

    function applyTheme(t) {
        if (t === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
        try { localStorage.setItem(KEY, t); } catch (e) {}
    }

    function currentTheme() {
        return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    }

    function toggle() {
        var next = currentTheme() === 'light' ? 'dark' : 'light';
        applyTheme(next);
        updateBtn();
    }

    var btn;

    function updateBtn() {
        if (!btn) return;
        btn.textContent = currentTheme() === 'light' ? '🌙' : '☀️';
    }

    document.addEventListener('DOMContentLoaded', function() {
        btn = document.createElement('button');
        btn.id = 'theme-toggle';
        btn.title = 'گۆڕینی ڕووناکی/تاریکی';
        btn.style.cssText = 'background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;width:40px;height:40px;border-radius:10px;cursor:pointer;font-size:18px;flex-shrink:0;transition:transform .2s;';
        btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
        btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
        btn.onclick = toggle;
        updateBtn();

        // try to place it in the navbar
        var nav = document.querySelector('.navbar') ||
            document.querySelector('.a-nav') ||
            document.querySelector('.p-nav') ||
            document.querySelector('.q-nav') ||
            document.querySelector('.e-nav');
        if (nav) {
            nav.insertBefore(btn, nav.firstChild);
        } else {
            // floating fallback
            btn.style.position = 'fixed';
            btn.style.top = '14px';
            btn.style.left = '14px';
            btn.style.zIndex = '9999';
            document.body.appendChild(btn);
        }
    });
})();