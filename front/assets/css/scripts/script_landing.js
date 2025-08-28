// Initialize Lenis smooth scroll
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Update ScrollTrigger on Lenis scroll
lenis.on('scroll', ScrollTrigger.update);

// Theme functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;
const header = document.querySelector('header');

// Check for saved theme preference or default to 'dark'
const currentTheme = localStorage.getItem('theme') || 'dark';
body.setAttribute('data-theme', currentTheme);

// Update icon based on current theme
function updateThemeIcon(theme) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Initialize icon
updateThemeIcon(currentTheme);

// Toggle theme
themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Add smooth transition effect
    body.style.transition = 'all 0.3s ease';
    setTimeout(() => {
        body.style.transition = '';
    }, 300);
});

// Header scroll effects (consolidated)
ScrollTrigger.create({
    start: 'top -100',
    end: 99999,
    toggleClass: { className: 'scrolled', targets: 'header' },
    onUpdate: (self) => {
        const progress = self.progress;
        const opacity = Math.min(progress * 2, 0.9);
        const themeColors = body.getAttribute('data-theme') === 'light' 
            ? `rgba(255, 255, 255, ${opacity})` 
            : `rgba(0, 0, 0, ${opacity})`;
        header.style.background = themeColors;
    }
});

// Initial animations setup
gsap.set('.hero-content > *', { y: 100, opacity: 0 });
gsap.set('.floating-element', { scale: 0, opacity: 0 });
gsap.set('.about-text > *', { x: -100, opacity: 0 });
gsap.set('.about-visual', { x: 100, opacity: 0 });
gsap.set('.sensor-item', { scale: 0, opacity: 0 });
gsap.set('.feature-card', { y: 100, opacity: 0 });
gsap.set('.register-content > *', { x: -100, opacity: 0 });
gsap.set('.register-form-container', { x: 100, opacity: 0 });
gsap.set('.team-member', { y: 80, opacity: 0 });

// Hero animations
const tl = gsap.timeline({ delay: 0.5 });
tl.to('.hero-content h1', { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' })
  .to('.hero-content p', { y: 0, opacity: 1, duration: 1, ease: 'power4.out' }, '-=0.8')
  .to('.hero-content .cta-button', { y: 0, opacity: 1, duration: 1, ease: 'power4.out' }, '-=0.6')
  .to('.floating-element', { 
      scale: 1, 
      opacity: 0.6, 
      duration: 1.5, 
      stagger: 0.2, 
      ease: 'back.out(1.7)' 
  }, '-=1');

// Unified floating elements animation
function animateFloatingElements() {
    gsap.to('.floating-element', {
        y: '+=30',
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.5
    });
}

// About section animations
ScrollTrigger.create({
    trigger: '.about',
    start: 'top 70%',
    onEnter: () => {
        gsap.to('.about-text > *', { 
            x: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.2, 
            ease: 'power3.out' 
        });
        gsap.to('.about-visual', { 
            x: 0, 
            opacity: 1, 
            duration: 1.2, 
            ease: 'power3.out' 
        });
        gsap.to('.sensor-item', { 
            scale: 1, 
            opacity: 1, 
            duration: 0.8, 
            stagger: 0.1, 
            ease: 'back.out(1.7)',
            delay: 0.5
        });
    }
});

// Features animations
ScrollTrigger.create({
    trigger: '.features',
    start: 'top 70%',
    onEnter: () => {
        gsap.to('.feature-card', { 
            y: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.15, 
            ease: 'power3.out' 
        });
    }
});

// Register form animations
ScrollTrigger.create({
    trigger: '.register',
    start: 'top 70%',
    onEnter: () => {
        gsap.to('.register-content > *', { 
            x: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.2, 
            ease: 'power3.out' 
        });
        gsap.to('.register-form-container', { 
            x: 0, 
            opacity: 1, 
            duration: 1.2, 
            ease: 'power3.out',
            delay: 0.3
        });
    }
});

// Team animations
ScrollTrigger.create({
    trigger: '.team',
    start: 'top 70%',
    onEnter: () => {
        gsap.to('.team-member', { 
            y: 0, 
            opacity: 1, 
            duration: 1, 
            stagger: 0.2, 
            ease: 'power3.out' 
        });
    }
});

// Parallax effects
gsap.to('.hero', {
    yPercent: -50,
    ease: 'none',
    scrollTrigger: {
        trigger: '.hero',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
    }
});

// Unified smooth anchor scrolling (eliminates duplication)
function handleSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                lenis.scrollTo(target, { offset: -80 });
            }
        });
    });
}

// Sensor items hover animation
function setupSensorHover() {
    document.querySelectorAll('.sensor-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            gsap.to(item, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
        });
        item.addEventListener('mouseleave', () => {
            gsap.to(item, { scale: 1, duration: 0.3, ease: 'power2.out' });
        });
    });
}

// Form field animations
function setupFormAnimations() {
    document.querySelectorAll('.form-group input, .form-group select').forEach(field => {
        field.addEventListener('focus', function() {
            gsap.to(this.closest('.form-group'), {
                scale: 1.02,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
        
        field.addEventListener('blur', function() {
            gsap.to(this.closest('.form-group'), {
                scale: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });
}

// Unified form submission handler
function setupFormSubmission() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Simple validation
        if (!data.firstName || !data.email || !data.vineyardName) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }
        
        // Get elements
        const submitButton = this.querySelector('.register-button');
        const successMessage = document.getElementById('successMessage');
        const originalText = submitButton.textContent;
        
        // Show processing state
        submitButton.textContent = 'Procesando...';
        submitButton.disabled = true;
        
        setTimeout(() => {
            // Show success message
            successMessage.style.display = 'block';
            
            // Reset form
            this.reset();
            
            // Reset button
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            
            // Hide success message after 5 seconds
            setTimeout(() => {
                gsap.to(successMessage, {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                        successMessage.style.display = 'none';
                        successMessage.style.opacity = 1;
                    }
                });
            }, 5000);
            
            // Store registration data (in a real app, this would go to a server)
            console.log('Registration data:', data);
            
        }, 2000);
    });
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    animateFloatingElements();
    handleSmoothScroll();
    setupSensorHover();
    setupFormAnimations();
    setupFormSubmission();
});