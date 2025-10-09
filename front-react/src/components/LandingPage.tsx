import React, { useState, useEffect } from 'react';
import RegisterFormEmbedded from './RegisterFormEmbedded';
import LoginForm from './LoginForm';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="container">
      {/* Header */}
      <header>
        <div className="logo">PlantCare</div>
        <nav>
          <ul>
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#sobre">Acerca de</a></li>
            <li><a href="#caracteristicas">Características</a></li>
            <li><a href="#registro">Registro</a></li>
            <li><a href="#equipo">Equipo</a></li>
            <li>
              <button 
                className="login-link"
                onClick={() => setShowLogin(true)}
              >
                Iniciar Sesión
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="hero">
        <div className="floating-elements">
          <div className="floating-element" style={{top: '20%', left: '10%'}}></div>
          <div className="floating-element" style={{top: '60%', left: '80%'}}></div>
          <div className="floating-element" style={{top: '40%', left: '70%'}}></div>
          <div className="floating-element" style={{top: '80%', left: '20%'}}></div>
          <div className="floating-element" style={{top: '30%', left: '90%'}}></div>
        </div>
        <div className="hero-content">
          <h1>PlantCare</h1>
          <p>Automatización inteligente para viñas chilenas. Protege tu cosecha con tecnología de sensores avanzados.</p>
          <a href="#sobre" className="cta-button">Descubre Más</a>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="about">
        <div className="about-content">
          <div className="about-text">
            <h2>Revolucionando la Viticultura</h2>
            <p>PlantCare es una solución tecnológica innovadora diseñada específicamente para las viñas chilenas. Nuestro sistema de sensores inteligentes monitorea constantemente las condiciones ambientales críticas.</p>
            <p>Detectamos cambios en la humedad del suelo, temperatura y niveles de luz solar en tiempo real, permitiendo a los agricultores tomar decisiones informadas y prevenir la pérdida de cultivos antes de que ocurra.</p>
            <p>Con PlantCare, optimizas el rendimiento de tu viña mientras reduces costos operativos y aumentas la calidad de tu producción.</p>
          </div>
          <div className="about-visual">
            <div className="sensor-grid">
              <div className="sensor-item">
                <span className="sensor-icon">💧</span>
                <div>Humedad del Suelo</div>
              </div>
              <div className="sensor-item">
                <span className="sensor-icon">🌡️</span>
                <div>Temperatura</div>
              </div>
              <div className="sensor-item">
                <span className="sensor-icon">☀️</span>
                <div>Luz Solar</div>
              </div>
              <div className="sensor-item">
                <span className="sensor-icon">📊</span>
                <div>Análisis de Datos</div>
              </div>
              <div className="sensor-item">
                <span className="sensor-icon">📱</span>
                <div>Monitoreo Remoto</div>
              </div>
              <div className="sensor-item">
                <span className="sensor-icon">🔔</span>
                <div>Alertas Tempranas</div>
              </div>
            </div>
          </div>  
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="features">
        <div className="features-container">
          <h2>Características Principales</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Monitoreo Preciso</h3>
              <p>Sensores de alta precisión que miden humedad del suelo, temperatura ambiente y niveles de radiación solar con exactitud profesional.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Alertas Inmediatas</h3>
              <p>Sistema de notificaciones en tiempo real que te alerta sobre condiciones críticas antes de que afecten tu cosecha.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Análisis Inteligente</h3>
              <p>Algoritmos avanzados que analizan patrones históricos y predicen condiciones futuras para optimizar el cuidado de tus cultivos.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Acceso Remoto</h3>
              <p>Monitorea tu viña desde cualquier lugar mediante nuestra plataforma web y aplicación móvil intuitiva.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Reducción de Costos</h3>
              <p>Optimiza el uso de recursos como agua y energía, reduciendo costos operativos hasta en un 30%.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Calidad Premium</h3>
              <p>Mejora la calidad de tus uvas manteniendo condiciones óptimas de crecimiento durante todo el ciclo productivo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Register Section */}
      <section id="registro" className="register">
        <div className="register-container">
          <div className="register-content">
            <h2>Únete a PlantCare</h2>
            <p>Forma parte de la revolución tecnológica en la viticultura chilena. Registra tu viña y comienza a proteger tu cosecha con inteligencia artificial.</p>
            
            <ul className="register-benefits">
              <li>Monitoreo 24/7 de tus cultivos</li>
              <li>Alertas tempranas ante condiciones críticas</li>
              <li>Análisis predictivo de rendimiento</li>
              <li>Soporte técnico especializado</li>
              <li>Acceso desde cualquier dispositivo</li>
              <li>Optimización automática de recursos</li>
            </ul>
            
            <p>Más de <strong>500 viñas</strong> ya confían en PlantCare para maximizar su producción y calidad.</p>
          </div>
          
          <RegisterFormEmbedded />
        </div>
      </section>

      {/* Team Section */}
      <section id="equipo" className="team">
        <div className="team-container">
          <h2>Nuestro Equipo</h2>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">BE</div>
              <div className="member-name">Bastián Echeverría</div>
              <div className="member-role">Desarrollo y Arquitectura</div>
            </div>
            <div className="team-member">
              <div className="member-avatar">SV</div>
              <div className="member-name">Sebastián Vargas</div>
              <div className="member-role">Sistemas y Hardware</div>
            </div>
            <div className="team-member">
              <div className="member-avatar">IG</div>
              <div className="member-name">Ignacio Gatica</div>
              <div className="member-role">Análisis de Datos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Footer */}
      <footer>
        <div className="footer-content">
          <div className="footer-logo">PlantCare</div>
          <p className="footer-text">Transformando la agricultura chilena a través de la innovación tecnológica. Protegemos tu inversión, optimizamos tu producción.</p>
        </div>
      </footer>

      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        aria-label="Cambiar tema"
      >
        <span id="themeIcon">{theme === 'dark' ? '☀' : '🌙'}</span>
      </button>

      {/* Login Modal */}
      {showLogin && (
        <LoginForm
          onSwitchToRegister={() => {
            setShowLogin(false);
            // Scroll to register section
            document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' });
          }}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
};

export default LandingPage;
