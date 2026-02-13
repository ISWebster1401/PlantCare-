// ============================================
// PLANTCARE — JS COMPLETO Y ACTUALIZADO
// Countdown fijo al 1 de Mayo 2026
// ============================================

// ===== YEAR =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== REFS =====
const header       = document.getElementById('header');
const scrollProg   = document.getElementById('scrollProgress');
const backToTop    = document.getElementById('backToTop');
const preloader    = document.getElementById('preloader');
const cursor       = document.getElementById('cursor');
const follower     = document.getElementById('cursorFollower');
const themeToggle  = document.getElementById('themeToggle');
const html         = document.documentElement;

// ===== THEME =====
const savedTheme = localStorage.getItem('pc-theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next    = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('pc-theme', next);

        if (typeof gsap !== 'undefined') {
            gsap.fromTo(themeToggle,
                { scale: 0.85, rotation: -15 },
                { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(2)' }
            );
        }
    });
}

// ===== USER GOAL TRACKER =====
function initUserGoal() {
    // Simulación de usuarios registrados (puedes conectar esto a tu backend real)
    const currentUsers = 127543; // Ejemplo: empezar con algunos usuarios ya registrados
    const targetUsers = 2000000;
    const percentage = (currentUsers / targetUsers * 100).toFixed(1);
    
    const currentUsersEl = document.getElementById('currentUsers');
    const progressFillEl = document.getElementById('goalProgressFill');
    const percentageEl = document.getElementById('goalPercentage');
    
    if (currentUsersEl && progressFillEl && percentageEl) {
        // Animar contador de usuarios
        if (typeof gsap !== 'undefined') {
            gsap.to({ val: 0 }, {
                val: currentUsers,
                duration: 2.5,
                ease: 'power2.out',
                onUpdate: function() {
                    const val = Math.round(this.targets()[0].val);
                    currentUsersEl.textContent = val.toLocaleString('es-ES');
                }
            });
        } else {
            currentUsersEl.textContent = currentUsers.toLocaleString('es-ES');
        }
        
        // Animar barra de progreso
        setTimeout(() => {
            progressFillEl.style.width = percentage + '%';
            percentageEl.textContent = percentage + '%';
        }, 500);
    }
}

// ===== EARLY BIRD COUNTER =====
let earlyBirdCount = 13;

function updateEarlyBirdCounter() {
    const counterEl = document.getElementById('earlyBirdCount');
    if (counterEl) {
        counterEl.textContent = earlyBirdCount;
        
        // Cambiar color cuando quedan pocos
        if (earlyBirdCount <= 5) {
            counterEl.style.color = '#ff6b6b';
        } else if (earlyBirdCount <= 10) {
            counterEl.style.color = '#ffd93d';
        }
        
        // Animar el número
        if (typeof gsap !== 'undefined') {
            gsap.fromTo(counterEl,
                { scale: 1.3 },
                { scale: 1, duration: 0.3, ease: 'back.out(2)' }
            );
        }
    }
}

// ===== COUNTDOWN TIMER - Iniciar INMEDIATAMENTE =====
// Fecha de lanzamiento: 1 de mayo 2026 a las 00:00:00 (hora chilena GMT-3)
const LAUNCH_DATE = new Date('2026-05-01T00:00:00-03:00');

function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
        console.warn('⚠️ Elementos del countdown no encontrados');
        return;
    }
    
    // Forzar visibilidad inmediata
    [daysEl, hoursEl, minutesEl, secondsEl].forEach(el => {
        el.style.opacity = '1';
        el.style.visibility = 'visible';
    });
    
    console.log('✅ Countdown iniciado hacia el 1 de mayo 2026');
    console.log('📅 Fecha:', LAUNCH_DATE.toLocaleString('es-CL', { timeZone: 'America/Santiago' }));
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = LAUNCH_DATE.getTime() - now;
        
        if (distance < 0) {
            daysEl.textContent = '00';
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            console.log('🎉 ¡PlantCare ha sido lanzado!');
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        daysEl.textContent = String(days).padStart(2, '0');
        hoursEl.textContent = String(hours).padStart(2, '0');
        minutesEl.textContent = String(minutes).padStart(2, '0');
        secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    // Actualizar inmediatamente
    updateCountdown();
    
    // Actualizar cada segundo
    setInterval(updateCountdown, 1000);
}

// Iniciar countdown cuando DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initCountdown();
        initUserGoal();
        updateEarlyBirdCounter();
    });
} else {
    initCountdown();
    initUserGoal();
    updateEarlyBirdCounter();
}

// ===== PRELOADER =====
window.addEventListener('load', () => {
    console.log('✅ Página cargada completamente');
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('hidden');
            console.log('✅ Preloader ocultado');
        }
        setTimeout(() => {
            console.log('⏰ Intentando mostrar modal...');
            showWelcomeModal();
        }, 400);
        initAnimations();
    }, 1800);
});

// ===== WELCOME MODAL =====
const welcomeModal = document.getElementById('welcomeModal');
const welcomeButton = document.getElementById('welcomeButton');
const welcomeClose = document.getElementById('welcomeClose');

function showWelcomeModal() {
    if (welcomeModal) {
        console.log('🎉 Mostrando modal de bienvenida');
        setTimeout(() => {
            welcomeModal.classList.add('active');
            
            if (typeof gsap !== 'undefined') {
                const characterImg = document.querySelector('.character-img');
                const speechBubble = document.querySelector('.character-speech-bubble');
                const welcomeBtn = document.querySelector('.welcome-button');
                
                if (characterImg) {
                    gsap.fromTo(characterImg,
                        { scale: 0, rotation: -180, opacity: 0 },
                        { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)', delay: 0.2 }
                    );
                }
                
                if (speechBubble) {
                    gsap.fromTo(speechBubble,
                        { scale: 0, y: 20, opacity: 0 },
                        { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.5 }
                    );
                }
                
                if (welcomeBtn) {
                    gsap.fromTo(welcomeBtn,
                        { scale: 0.8, opacity: 0 },
                        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.8 }
                    );
                }
            }
        }, 100);
    } else {
        console.log('❌ Modal no encontrado en el DOM');
    }
}

function closeWelcomeModal() {
    if (welcomeModal) {
        console.log('👋 Cerrando modal');
        welcomeModal.classList.remove('active');
        
        if (typeof gsap !== 'undefined') {
            gsap.to('.welcome-content', {
                scale: 0.9,
                opacity: 0,
                duration: 0.3,
                ease: 'power2.in'
            });
        }
    }
}

if (welcomeButton) {
    welcomeButton.addEventListener('click', closeWelcomeModal);
}

if (welcomeClose) {
    welcomeClose.addEventListener('click', closeWelcomeModal);
}

if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('welcome-overlay')) {
            closeWelcomeModal();
        }
    });
}

// ===== GSAP ANIMATIONS =====
function initAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('⚠️ GSAP no está cargado, mostrando contenido sin animaciones');
        makeContentVisible();
        return;
    }

    console.log('✅ Iniciando animaciones GSAP');
    gsap.registerPlugin(ScrollTrigger);

    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        gsap.set(heroContent, { opacity: 1 });
    }

    const eyebrow = document.querySelector('.hero-eyebrow');
    if (eyebrow) {
        gsap.fromTo(eyebrow, 
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 }
        );
    }

    const titleLines = document.querySelectorAll('.title-line');
    if (titleLines.length > 0) {
        gsap.fromTo(titleLines, 
            { opacity: 0, y: '110%' },
            { opacity: 1, y: '0%', duration: 1, stagger: 0.15, ease: 'power4.out', delay: 0.3 }
        );
    }

    const heroDesc = document.querySelector('.hero-description');
    if (heroDesc) {
        gsap.fromTo(heroDesc,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.75 }
        );
    }

    const downloadBtns = document.querySelector('.download-buttons');
    if (downloadBtns) {
        gsap.fromTo(downloadBtns,
            { opacity: 0, y: 18 },
            { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.95 }
        );
    }

    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
        gsap.fromTo(heroVisual,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 1.2, ease: 'back.out(1.4)', delay: 0.6 }
        );
    }

    const mainLogo = document.querySelector('.main-logo');
    if (mainLogo) {
        gsap.to(mainLogo, {
            y: -70,
            scrollTrigger: {
                trigger: '.hero', 
                start: 'top top', 
                end: 'bottom top', 
                scrub: 1.5
            }
        });
    }

    const particles = document.querySelectorAll('.particle');
    particles.forEach((p, i) => {
        gsap.to(p, {
            y: -120 * (0.4 + i * 0.15),
            scrollTrigger: { 
                trigger: '.hero', 
                start: 'top top', 
                end: 'bottom top', 
                scrub: 1 
            }
        });
    });

    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        ScrollTrigger.create({
            trigger: item,
            start: 'top 88%',
            once: true,
            onEnter: () => {
                gsap.to(item, { 
                    opacity: 1, 
                    y: 0, 
                    duration: 0.8, 
                    ease: 'power3.out' 
                });
                
                const numEl = item.querySelector('.stat-number');
                if (numEl) {
                    const target = parseInt(numEl.getAttribute('data-count'));
                    gsap.to({ val: 0 }, {
                        val: target, 
                        duration: 2, 
                        ease: 'power2.out',
                        onUpdate() {
                            const v = Math.round(this.targets()[0].val);
                            if (target >= 1000) {
                                numEl.textContent = (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'K+';
                            } else if (target === 98) {
                                numEl.textContent = v + '%';
                            } else {
                                numEl.textContent = v + '+';
                            }
                        }
                    });
                }
            }
        });
    });

    const sectionHeader = document.querySelector('.section-header');
    if (sectionHeader) {
        gsap.from(sectionHeader, {
            scrollTrigger: { 
                trigger: '.features', 
                start: 'top 80%', 
                toggleActions: 'play none none reverse' 
            },
            y: 50, 
            opacity: 0, 
            duration: 1, 
            ease: 'power3.out'
        });
    }

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, i) => {
        gsap.to(card, {
            scrollTrigger: { 
                trigger: card, 
                start: 'top 86%', 
                toggleActions: 'play none none reverse' 
            },
            opacity: 1, 
            y: 0, 
            duration: 0.9, 
            delay: i * 0.15, 
            ease: 'power3.out'
        });
    });

    const ctaTitle = document.querySelector('.cta-title');
    const ctaDesc = document.querySelector('.cta-description');
    const ctaBtns = document.querySelector('.cta .download-buttons');

    if (ctaTitle) {
        gsap.from(ctaTitle, {
            scrollTrigger: { 
                trigger: '.cta', 
                start: 'top 80%', 
                toggleActions: 'play none none reverse' 
            },
            y: 60, 
            opacity: 0, 
            duration: 1, 
            ease: 'power3.out'
        });
    }

    if (ctaDesc) {
        gsap.from(ctaDesc, {
            scrollTrigger: { 
                trigger: '.cta', 
                start: 'top 80%', 
                toggleActions: 'play none none reverse' 
            },
            y: 40, 
            opacity: 0, 
            duration: 0.9, 
            delay: 0.2, 
            ease: 'power3.out'
        });
    }

    if (ctaBtns) {
        gsap.from(ctaBtns, {
            scrollTrigger: { 
                trigger: '.cta', 
                start: 'top 80%', 
                toggleActions: 'play none none reverse' 
            },
            y: 30, 
            opacity: 0, 
            duration: 0.9, 
            delay: 0.4, 
            ease: 'power3.out'
        });
    }

    // ===== COMING SOON - SIN ANIMACIONES =====
    // Hacer visibles inmediatamente todos los elementos del countdown y coming soon
    const comingSoonElements = document.querySelectorAll(
        '.coming-badge, .coming-title-line, .countdown-item, .countdown-number, ' +
        '.coming-feature-card, .notify-me-section, .user-goal-section'
    );
    
    comingSoonElements.forEach(el => {
        gsap.set(el, { opacity: 1, visibility: 'visible', scale: 1, y: 0 });
    });

    const comingParticles = document.querySelectorAll('.coming-particle');
    comingParticles.forEach((particle, i) => {
        gsap.to(particle, {
            y: -100 * (i + 1),
            x: 50 * (i % 2 === 0 ? 1 : -1),
            scrollTrigger: {
                trigger: '.coming-soon',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5
            }
        });
    });

    const progressBars = document.querySelectorAll('.progress-bar');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        
        ScrollTrigger.create({
            trigger: bar,
            start: 'top 90%',
            once: true,
            onEnter: () => {
                gsap.to(bar, {
                    width: width,
                    duration: 1.5,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ===== FOOTER ANIMATIONS =====
    const footerLogo = document.querySelector('.footer-logo');
    const footerTagline = document.querySelector('.footer-tagline');
    const footerLinks = document.querySelectorAll('.footer-link');
    const footerBottom = document.querySelector('.footer-bottom');

    if (footerLogo) {
        gsap.from(footerLogo, {
            scrollTrigger: { 
                trigger: 'footer', 
                start: 'top 90%', 
                toggleActions: 'play none none reverse' 
            },
            y: 30, 
            opacity: 0, 
            duration: 0.8, 
            ease: 'power3.out'
        });
    }

    if (footerTagline) {
        gsap.from(footerTagline, {
            scrollTrigger: { 
                trigger: 'footer', 
                start: 'top 90%', 
                toggleActions: 'play none none reverse' 
            },
            y: 20, 
            opacity: 0, 
            duration: 0.8, 
            delay: 0.1,
            ease: 'power3.out'
        });
    }

    if (footerLinks.length > 0) {
        gsap.from(footerLinks, {
            scrollTrigger: { 
                trigger: 'footer', 
                start: 'top 90%', 
                toggleActions: 'play none none reverse' 
            },
            y: 20, 
            opacity: 0, 
            stagger: 0.08, 
            duration: 0.6, 
            delay: 0.2,
            ease: 'power3.out'
        });

        footerLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                gsap.to(link, { 
                    y: -2, 
                    duration: 0.3, 
                    ease: 'power2.out' 
                });
            });
            
            link.addEventListener('mouseleave', () => {
                gsap.to(link, { 
                    y: 0, 
                    duration: 0.3, 
                    ease: 'power2.out' 
                });
            });
        });
    }

    if (footerBottom) {
        gsap.from(footerBottom, {
            scrollTrigger: { 
                trigger: 'footer', 
                start: 'top 90%', 
                toggleActions: 'play none none reverse' 
            },
            y: 15, 
            opacity: 0, 
            duration: 0.6, 
            delay: 0.4,
            ease: 'power3.out'
        });
    }
}

function makeContentVisible() {
    const elements = [
        '.hero-content',
        '.hero-eyebrow',
        '.title-line',
        '.hero-description',
        '.download-buttons',
        '.hero-visual',
        '.countdown-number',
        '.countdown-item',
        '.coming-badge',
        '.coming-title-line',
        '.coming-feature-card',
        '.notify-me-section',
        '.user-goal-section'
    ];
    
    elements.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.style.visibility = 'visible';
        });
    });
}

// ===== SCROLL BEHAVIOR =====
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const y = window.pageYOffset;
    const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (header) {
        header.classList.toggle('scrolled', y > 50);
        header.classList.toggle('hidden', y > lastScroll && y > 300);
    }

    if (scrollProg) {
        scrollProg.style.width = (y / docH * 100) + '%';
    }

    if (backToTop) {
        backToTop.classList.toggle('visible', y > 500);
    }

    lastScroll = y <= 0 ? 0 : y;
});

// ===== BACK TO TOP =====
if (backToTop) {
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== 3D MOUSE PARALLAX =====
const logoContainer = document.querySelector('.logo-container');
const mainLogoEl = document.getElementById('mainLogo');

if (logoContainer && mainLogoEl && typeof gsap !== 'undefined') {
    logoContainer.addEventListener('mousemove', e => {
        const r  = logoContainer.getBoundingClientRect();
        const rx = (e.clientY - r.top - r.height / 2) / 14;
        const ry = (r.width / 2 - (e.clientX - r.left)) / 14;
        
        gsap.to(mainLogoEl, {
            rotationX: rx, 
            rotationY: ry,
            transformPerspective: 1000,
            duration: 0.5, 
            ease: 'power2.out'
        });
    });
    
    logoContainer.addEventListener('mouseleave', () => {
        gsap.to(mainLogoEl, {
            rotationX: 0, 
            rotationY: 0,
            duration: 0.8, 
            ease: 'elastic.out(1, 0.5)'
        });
    });
}

// ===== CURSOR =====
let mx = 0, my = 0, cx = 0, cy = 0, fx = 0, fy = 0;

if (cursor && follower) {
    setTimeout(() => {
        cursor.classList.add('active');
        follower.classList.add('active');
    }, 600);

    document.addEventListener('mousemove', e => { 
        mx = e.clientX; 
        my = e.clientY; 
    });

    (function animateCursor() {
        cx += (mx - cx) * 0.22;
        cy += (my - cy) * 0.22;
        fx += (mx - fx) * 0.1;
        fy += (my - fy) * 0.1;
        
        cursor.style.left = cx + 'px';
        cursor.style.top = cy + 'px';
        follower.style.left = fx + 'px';
        follower.style.top = fy + 'px';
        
        requestAnimationFrame(animateCursor);
    })();

    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
        const interactiveElements = document.querySelectorAll('button, a, .feature-card, .logo-container, .theme-toggle');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => { 
                cursor.classList.add('hover'); 
                follower.classList.add('hover'); 
            });
            
            el.addEventListener('mouseleave', () => { 
                cursor.classList.remove('hover'); 
                follower.classList.remove('hover'); 
            });
        });
    }
}

// ===== FEATURE CARDS SHINE =====
const featureCardsShine = document.querySelectorAll('.feature-card');

featureCardsShine.forEach(card => {
    card.addEventListener('mouseenter', () => {
        const shine = card.querySelector('.feature-shine');
        if (shine) {
            shine.style.animation = 'none';
            requestAnimationFrame(() => { 
                shine.style.animation = ''; 
            });
        }
    });
});

// ===== STORE BUTTONS =====
function openPlayStore() {
    showToast('¡Disponible el 1 de mayo 2026! 🌱');
}

function openAppStore() {
    showToast('¡Disponible el 1 de mayo 2026! 🌿');
}

// ===== TOAST =====
function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `
        position:fixed; 
        bottom:2rem; 
        left:50%; 
        transform:translateX(-50%) translateY(20px);
        background:var(--bg-card); 
        color:var(--text-h);
        border:1px solid var(--border-accent); 
        border-radius:100px;
        padding:0.75rem 1.75rem; 
        font-family:Inter,sans-serif;
        font-size:0.9rem; 
        font-weight:600; 
        z-index:9999;
        box-shadow:0 8px 30px rgba(0,0,0,0.3);
        opacity:0; 
        transition:all 0.4s;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    
    requestAnimationFrame(() => { 
        t.style.opacity = '1'; 
        t.style.transform = 'translateX(-50%) translateY(0)'; 
    });
    
    setTimeout(() => {
        t.style.opacity = '0'; 
        t.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => t.remove(), 400);
    }, 2800);
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
            e.preventDefault();
            window.scrollTo({ 
                top: target.offsetTop - 80, 
                behavior: 'smooth' 
            });
        }
    });
});

// ===== NOTIFY ME FORM =====
const notifyForm = document.getElementById('notifyForm');

if (notifyForm) {
    notifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailInput = notifyForm.querySelector('input[type="email"]');
        const email = emailInput.value;
        const button = notifyForm.querySelector('.notify-button');
        const originalText = button.innerHTML;
        
        button.innerHTML = '<span>Enviando...</span>';
        button.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('_subject', '🌱 Nuevo registro PlantCare - Lanzamiento 1 Mayo 2026');
            formData.append('_template', 'box');
            formData.append('_captcha', 'false');
            
            const response = await fetch('https://formsubmit.co/bastian.echeverria13@gmail.com', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                // Decrementar contador de early bird
                if (earlyBirdCount > 0) {
                    earlyBirdCount--;
                    updateEarlyBirdCounter();
                    
                    if (earlyBirdCount > 0) {
                        showToast(`🎉 ¡Registrado! Eres uno de los ${13 - earlyBirdCount} con 50% de descuento.`);
                    } else {
                        showToast('🎉 ¡Felicidades! Eres el último con 50% de descuento.');
                    }
                } else {
                    showToast('🎉 ¡Gracias! Te notificaremos el 1 de mayo 2026.');
                }
                
                button.innerHTML = '<span>✓ ¡Registrado!</span>';
                button.style.background = 'var(--accent)';
                
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(button, 
                        { scale: 0.9 }, 
                        { scale: 1, duration: 0.3, ease: 'back.out(2)' }
                    );
                }
                
                emailInput.value = '';
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.background = '';
                    button.disabled = false;
                }, 3000);
            }
        } catch (error) {
            button.innerHTML = '<span>Error ❌</span>';
            showToast('❌ Error. Intenta de nuevo.');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 3000);
        }
    });
}

console.log('%c🌱 PlantCare loaded!', 'color:#5cb85c;font-size:18px;font-weight:bold;');
console.log('%c🚀 Lanzamiento: 1 de Mayo 2026', 'color:#5cb85c;font-size:14px;font-weight:bold;');

// ===== INICIALIZAR LUCIDE ICONS =====
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    console.log('✅ Lucide Icons inicializados');
}