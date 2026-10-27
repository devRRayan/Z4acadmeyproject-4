document.addEventListener('DOMContentLoaded', function() {
    var cards = document.querySelectorAll('.a-card, .a-founder');
    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function(entries) {
            entries.forEach(function(e) {
                if (e.isIntersecting) {
                    e.target.style.opacity = '1';
                    e.target.style.transform = 'translateY(0)';
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        cards.forEach(function(c) {
            c.style.opacity = '0';
            c.style.transform = 'translateY(30px)';
            c.style.transition = 'all .6s ease';
            obs.observe(c);
        });
        // failsafe
        setTimeout(function() {
            cards.forEach(function(c) { c.style.opacity = '1';
                c.style.transform = 'translateY(0)'; });
        }, 800);
    }
});