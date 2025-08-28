
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

        // Initial animations
        gsap.set('.hero-content > *', { y: 100, opacity: 0 });
        gsap.set('.floating-element', { scale: 0, opacity: 0 });

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

        // Floating elements animation
        gsap.to('.floating-element', {
            y: '+=30',
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            stagger: 0.5
        });

        // Header scroll effect
        ScrollTrigger.create({
            start: 'top -100',
            end: 99999,
            toggleClass: { className: 'scrolled', targets: 'header' }
        });

        // About section animations
        gsap.set('.about-text > *', { x: -100, opacity: 0 });
        gsap.set('.about-visual', { x: 100, opacity: 0 });
        gsap.set('.sensor-item', { scale: 0, opacity: 0 });

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
        gsap.set('.feature-card', { y: 100, opacity: 0 });

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
        gsap.set('.register-content > *', { x: -100, opacity: 0 });
        gsap.set('.register-form-container', { x: 100, opacity: 0 });

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

        // Form submission handling
        document.getElementById('registerForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Simple validation
            if (!data.firstName || !data.email || !data.vineyardName) {
                alert('Por favor completa todos los campos requeridos');
                return;
            }
            
            // Simulate form submission
            const submitButton = this.querySelector('.register-button');
            const originalText = submitButton.textContent;
            
            submitButton.textContent = 'Procesando...';
            submitButton.disabled = true;
            
            setTimeout(() => {
                // Show success message
                const successMessage = document.getElementById('successMessage');
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

        // Form field animations
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

        // Team animations
        gsap.set('.team-member', { y: 80, opacity: 0 });

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

        // Smooth anchor scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    lenis.scrollTo(target, { offset: -80 });
                }
            });
        });

        // Sensor items hover animation
        document.querySelectorAll('.sensor-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                gsap.to(item, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
            });
            item.addEventListener('mouseleave', () => {
                gsap.to(item, { scale: 1, duration: 0.3, ease: 'power2.out' });
            });
        });

        // Dynamic header background
        const header = document.querySelector('header');
        ScrollTrigger.create({
            start: 'top -100',
            end: 99999,
            onUpdate: (self) => {
                const progress = self.progress;
                const opacity = Math.min(progress * 2, 0.9);
                header.style.background = `rgba(0, 0, 0, ${opacity})`;
            }
        });
