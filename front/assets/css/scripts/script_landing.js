// Wait for all external libraries to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if Lenis is available
    if (typeof Lenis === 'undefined') {
        console.error('❌ Lenis library not loaded. Please check the CDN link.');
        return;
    }
    
    if (typeof gsap === 'undefined') {
        console.error('❌ GSAP library not loaded. Please check the CDN link.');
        return;
    }

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
    
    // Initialize all other functionality
    initializeApp();
});

// Main initialization function
function initializeApp() {
    console.log('🚀 Inicializando PlantCare...');
    
    // Initialize theme first
    setupTheme();
    
    // Initialize all functionality
    setupAnimations();
    animateFloatingElements();
    handleSmoothScroll();
    setupSensorHover();
    setupFormAnimations();
    setupFormSubmission();
}

// Theme functionality
function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const body = document.body;
    const header = document.querySelector('header');

    if (!themeToggle || !themeIcon) {
        console.warn('⚠️ Theme elements not found');
        return;
    }

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
}

// Setup animations function
function setupAnimations() {
    const body = document.body;
    const header = document.querySelector('header');
    
    if (!header) {
        console.warn('⚠️ Header element not found');
        return;
    }

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
}

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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('📝 Formulario enviado - iniciando proceso de registro');
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        console.log('📊 Datos del formulario:', data);
        
        // Validation
        if (!data.firstName || !data.lastName || !data.email || !data.phone || !data.region || 
            !data.vineyardName || !data.hectares || !data.grapeType || !data.password || !data.confirmPassword) {
            console.log('❌ Validación fallida - campos faltantes');
            showErrorMessage('Por favor completa todos los campos requeridos');
            return;
        }

        // Validate password match
        if (data.password !== data.confirmPassword) {
            showErrorMessage('Las contraseñas no coinciden');
            return;
        }

        // Validate password strength
        if (!validatePassword(data.password)) {
            showErrorMessage('La contraseña debe contener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
            return;
        }
        
        // Get elements
        const submitButton = this.querySelector('.register-button');
        const successMessage = document.getElementById('successMessage');
        const originalText = submitButton.textContent;
        
        // Show processing state
        submitButton.textContent = 'Procesando...';
        submitButton.disabled = true;
        
        try {
            // Prepare data for API (match backend schema)
            const apiData = {
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                phone: data.phone,
                region: data.region,
                vineyard_name: data.vineyardName,
                hectares: parseFloat(data.hectares),
                grape_type: data.grapeType,
                password: data.password,
                confirm_password: data.confirmPassword
            };

            // Debug: Log data being sent
            console.log('🚀 Enviando datos a la API:', apiData);
            console.log('📡 URL:', 'http://127.0.0.1:5000/api/auth/register');

            // Call API
            const response = await fetch('http://127.0.0.1:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiData)
            });

            // Debug: Log response details
            console.log('📥 Respuesta recibida:');
            console.log('   - Status:', response.status);
            console.log('   - Status Text:', response.statusText);
            console.log('   - Headers:', Object.fromEntries(response.headers.entries()));

            const result = await response.json();
            console.log('📄 Contenido de la respuesta:', result);

            if (response.ok) {
                // Success
                console.log('✅ Registro exitoso!');
                showSuccessMessage('¡Registro exitoso! Te contactaremos pronto para la instalación.');
                this.reset();
                
                // Store user data in localStorage for potential future use
                localStorage.setItem('plantcare_user', JSON.stringify({
                    id: result.id,
                    email: result.email,
                    name: `${result.first_name} ${result.last_name}`,
                    vineyard_name: result.vineyard_name
                }));
                
                console.log('💾 Datos guardados en localStorage');
            } else {
                // Error from API
                console.log('❌ Error de la API:', result);
                showErrorMessage(result.detail || 'Error al registrar usuario');
            }
            
        } catch (error) {
            console.error('🔥 Error capturado:', error);
            console.error('   - Tipo:', error.constructor.name);
            console.error('   - Mensaje:', error.message);
            console.error('   - Stack:', error.stack);
            
            // Diferentes tipos de errores
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                showErrorMessage('Error de conexión: No se puede conectar al servidor. Verifica que esté corriendo en http://127.0.0.1:5000');
            } else if (error.name === 'SyntaxError') {
                showErrorMessage('Error: Respuesta inválida del servidor');
            } else {
                showErrorMessage('Error de conexión. Verifica que el servidor esté funcionando.');
            }
        } finally {
            // Reset button
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    });
}

// Helper function to validate password strength
function validatePassword(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return false;
    return true;
}

// Helper function to show error messages
function showErrorMessage(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        font-weight: 600;
        text-align: center;
        box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3);
    `;
    
    // Insert before form
    const form = document.getElementById('registerForm');
    form.insertBefore(errorDiv, form.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            gsap.to(errorDiv, {
                opacity: 0,
                y: -20,
                duration: 0.5,
                onComplete: () => {
                    errorDiv.remove();
                }
            });
        }
    }, 5000);
}

// Helper function to show success messages
function showSuccessMessage(message) {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        
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
    }
}
