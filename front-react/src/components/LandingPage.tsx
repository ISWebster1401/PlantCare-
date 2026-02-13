import React, { useState } from 'react';
import RegisterFormEmbedded from './RegisterFormEmbedded';
import LoginForm from './LoginForm';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);

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
          <p>Cuida tus plantas de forma divertida con personajes estilo Tamagotchi. Identifica plantas con IA y monitorea su salud en tiempo real.</p>
          <a href="#sobre" className="cta-button">Descubre Más</a>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="about">
        <div className="about-content">
          <div className="about-text">
            <h2>¡Cuidado de Plantas Divertido! 🌱</h2>
            <p>PlantCare es una plataforma gamificada que transforma el cuidado de plantas en una experiencia divertida y educativa. Escanea tu planta con IA, crea un personaje estilo Tamagotchi y monitorea su salud en tiempo real.</p>
            <p>Nuestro sistema de sensores IoT mide la humedad del suelo y temperatura, mientras que la IA identifica tu planta y genera un personaje único con emociones que reflejan la salud real de tu planta.</p>
            <p>Con PlantCare, los niños y adultos aprenden a cuidar plantas mientras ganan achievements y completan misiones educativas. ¡Haz que el cuidado de plantas sea divertido!</p>
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
              <h3>Jardín Digital</h3>
              <p>Ve todas tus plantas en un jardín digital interactivo desde cualquier dispositivo. Cada planta tiene su propio personaje único.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Identificación con IA</h3>
              <p>Sube una foto de tu planta y nuestra IA la identifica automáticamente, proporcionando información sobre cuidados y necesidades.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Gamificación</h3>
              <p>Gana achievements, completa misiones y ve cómo tu personaje planta evoluciona según la salud real de tu planta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Register Section */}
      <section id="registro" className="register">
        <div className="register-container">
          <div className="register-content">
            <h2>Únete a PlantCare</h2>
            <p>Comienza a cuidar tus plantas de forma divertida. Escanea tu primera planta, crea su personaje y comienza tu aventura en el cuidado de plantas.</p>
            
            <ul className="register-benefits">
              <li>Identificación de plantas con IA</li>
              <li>Personajes estilo Tamagotchi únicos</li>
              <li>Monitoreo en tiempo real con sensores IoT</li>
              <li>Sistema de gamificación con achievements</li>
              <li>Notificaciones cuando tu planta necesita cuidado</li>
              <li>Jardín digital interactivo</li>
            </ul>
            
            <p>¡Únete a la comunidad de <strong>amantes de las plantas</strong> que están aprendiendo mientras se divierten!</p>
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
          <p className="footer-text">Haciendo que el cuidado de plantas sea divertido y educativo. Aprende mientras cuidas tus plantas con IA y gamificación.</p>
        </div>
      </footer>

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
