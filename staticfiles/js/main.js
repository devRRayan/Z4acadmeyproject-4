// ============================================================
// 1. HAMBURGER MENU INTERACTION
// ============================================================
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
const navBtns = document.getElementById('nav-btns');

if (hamburger) {
    hamburger.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        navBtns.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close mobile menu layout overlay when any item link is clicked
    document.querySelectorAll('.nav-links a, .nav-btns a').forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
            navBtns.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// ============================================================
// 2. HERO TITLE TYPEWRITER EFFECT
// ============================================================
const typedText = document.getElementById('typed-text');
const texts = ['Zagros Academy', 'بە زمانی دایک فێری تکنەلۆجیا ببە', 'Code Learning'];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let speed = 100;

function typeWriter() {
    const currentText = texts[textIndex];

    if (isDeleting) {
        typedText.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedText.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }

    if (!isDeleting && charIndex === currentText.length) {
        isDeleting = true;
        speed = 1500; // pause while fully spelt out
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        speed = 100;
    } else {
        speed = isDeleting ? 50 : 100;
    }

    setTimeout(typeWriter, speed);
}

if (typedText) {
    typeWriter();
}

// ============================================================
// 3. COURSE REDIRECT ROUTING HANDLER
// ============================================================
function gotoCourse(courseKey, courseName) {
    localStorage.setItem('selectedCourse', courseKey);
    localStorage.setItem('selectedCourseName', courseName);
    window.location.href = '/chat/?course=' + courseKey;
}

// ============================================================
// 4. SMOOTH SCROLL ACCELERATION INTERFACES
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// ============================================================
// 5. SCROLL LOOKUP REVEAL OBSERVER (With Fail-Safe Backup)
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
    const cards = document.querySelectorAll('.course-card');

    if (cards.length > 0) {
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);

            cards.forEach(card => observer.observe(card));

            setTimeout(() => {
                cards.forEach(card => {
                    if (!card.classList.contains('visible')) {
                        card.classList.add('visible');
                    }
                });
            }, 500);

        } else {
            cards.forEach(card => card.classList.add('visible'));
        }
    }
});