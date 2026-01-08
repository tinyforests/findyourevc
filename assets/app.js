// Navigation
document.addEventListener('DOMContentLoaded', function() {
    var hamburger = document.getElementById('hamburger');
    var navModal = document.getElementById('navModal');
    var navClose = document.getElementById('navClose');

    if (hamburger && navModal) {
        hamburger.addEventListener('click', function() {
            navModal.classList.add('active');
            hamburger.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (navClose && navModal) {
        navClose.addEventListener('click', function() {
            navModal.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Close nav on link click
    var navLinks = document.querySelectorAll('.nav-links a');
    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function(e) {
            if (!this.getAttribute('target')) {
                navModal.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Close nav on outside click
    if (navModal) {
        navModal.addEventListener('click', function(e) {
            if (e.target === navModal) {
                navModal.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});
