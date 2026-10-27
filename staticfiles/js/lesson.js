// Lesson Loader - Fetches content from database and renders it dynamically

const lessons = [
    { id: 'introduction', name: 'Python Intro', category: 'python' },
    { id: 'getting-started', name: 'Python Get Started', category: 'python' },
    { id: 'syntax', name: 'Syntax', category: 'python' },
    { id: 'comments', name: 'Comments', category: 'python' },
    { id: 'variables', name: 'Variables', category: 'python' },
    { id: 'variable-names', name: 'Variable Names', category: 'python' },
    { id: 'casting', name: 'Casting', category: 'python' }
];

let currentIndex = 0;

// Load lesson on page load
document.addEventListener('DOMContentLoaded', function() {
    const lessonSlug = window.location.hash.replace('#', '') || 'introduction';
    loadLesson(lessonSlug);
});

// Load lesson from database
async function loadLesson(lessonSlug) {
    try {
        // Update active menu item
        document.querySelectorAll('.menu-link').forEach(el => {
            el.classList.remove('active');
        });

        const activeLink = document.querySelector("[onclick=\"loadLesson('" + lessonSlug + "')\"]");
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update current index
        currentIndex = lessons.findIndex(l => l.id === lessonSlug);
        if (currentIndex === -1) currentIndex = 0;

        // Fetch lesson from API
        const response = await fetch('/api/lessons/' + lessonSlug + '/');
        const data = await response.json();

        if (data.success) {
            const lesson = data.lesson;
            const blocks = data.blocks;

            // Update page title
            document.getElementById('lesson-title').textContent = lesson.title;
            document.title = lesson.title + ' - Zagros Academy';

            // Render content blocks
            renderBlocks(blocks);

            // Update progress
            updateProgress();

            // Update navigation buttons
            updateNavButtons();

            // Update URL hash
            window.location.hash = lessonSlug;

            // Scroll to top
            window.scrollTo(0, 0);
        } else {
            showError('Lesson not found');
        }
    } catch (error) {
        console.error('Error loading lesson:', error);
        showError('Error loading lesson. Please try again.');
    }
}

// Render lesson blocks
function renderBlocks(blocks) {
    const contentDiv = document.getElementById('lesson-content');
    contentDiv.innerHTML = '';

    if (!blocks || blocks.length === 0) {
        contentDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">No content yet. Check back soon!</p>';
        return;
    }

    blocks.forEach(block => {
        const blockEl = document.createElement('div');
        blockEl.className = 'block';

        switch (block.block_type) {
            case 'heading':
                blockEl.innerHTML = '<h2 class="block-heading">' + escapeHtml(block.content) + '</h2>';
                break;

            case 'text':
                blockEl.innerHTML = '<p class="block-text">' + escapeHtml(block.content) + '</p>';
                break;

            case 'code':
                var language = (block.metadata && block.metadata.language) ? block.metadata.language : 'python';
                blockEl.innerHTML = '<div class="block-code"><div class="code-header"><span>' + language + '</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div><pre><code>' + escapeHtml(block.content) + '</code></pre></div>';
                break;

            case 'note':
                blockEl.innerHTML = '<div class="block-note"><div class="icon">ℹ️</div><div><strong>Note:</strong> ' + escapeHtml(block.content) + '</div></div>';
                break;

            case 'warning':
                blockEl.innerHTML = '<div class="block-warning"><div class="icon">⚠️</div><div><strong>Warning:</strong> ' + escapeHtml(block.content) + '</div></div>';
                break;

            case 'image':
                var altText = (block.metadata && block.metadata.alt) ? block.metadata.alt : 'Lesson image';
                blockEl.innerHTML = '<div class="block-image"><img src="' + escapeHtml(block.content) + '" alt="' + escapeHtml(altText) + '"></div>';
                break;

            case 'video':
                blockEl.innerHTML = '<div class="block-video"><iframe src="' + escapeHtml(block.content) + '" allowfullscreen></iframe></div>';
                break;

            case 'quiz':
                blockEl.innerHTML = '<div class="block-quiz"><p><strong>Quiz:</strong> ' + escapeHtml(block.content) + '</p></div>';
                break;

            default:
                blockEl.innerHTML = '<p class="block-text">' + escapeHtml(block.content) + '</p>';
        }

        contentDiv.appendChild(blockEl);
    });
}

// Copy code to clipboard
function copyCode(button) {
    const codeBlock = button.closest('.block-code');
    const code = codeBlock.querySelector('code').textContent;

    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = '✓ Copied';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

// Navigate to next lesson
function nextLesson() {
    if (currentIndex < lessons.length - 1) {
        currentIndex++;
        loadLesson(lessons[currentIndex].id);
    }
}

// Navigate to previous lesson
function previousLesson() {
    if (currentIndex > 0) {
        currentIndex--;
        loadLesson(lessons[currentIndex].id);
    }
}

// Update progress bar
function updateProgress() {
    const percentage = ((currentIndex + 1) / lessons.length) * 100;
    const progressFill = document.getElementById('progress-fill');

    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }

    const counter = document.getElementById('lesson-counter');
    if (counter) {
        counter.textContent = (currentIndex + 1) + ' / ' + lessons.length;
    }
}

// Update navigation button states
function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (prevBtn) {
        prevBtn.disabled = currentIndex === 0;
    }

    if (nextBtn) {
        nextBtn.disabled = currentIndex === lessons.length - 1;
    }
}

// Toggle bookmark
function toggleBookmark() {
    const btn = document.getElementById('bookmark-btn');
    btn.classList.toggle('bookmarked');

    if (btn.classList.contains('bookmarked')) {
        btn.style.background = '#000b15';
        btn.style.color = '#fff';
        btn.textContent = '🔖';
    } else {
        btn.style.background = '#f9f9f9';
        btn.style.color = '#000b15';
        btn.textContent = '🔖';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    const contentDiv = document.getElementById('lesson-content');
    contentDiv.innerHTML = '<div style="color: #ff6b6b; padding: 20px; text-align: center;">' + escapeHtml(message) + '</div>';
}