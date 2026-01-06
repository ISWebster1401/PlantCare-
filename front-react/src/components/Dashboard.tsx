import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardCharts from './DashboardCharts';
import DeviceManager from './DeviceManager';
import HumedadView from './HumedadView';
import AIChat from './AIChat';
import { AIChatMinimal } from './AIChatMinimal';
import AdminPanel from './AdminPanel';
import UserProfile from './UserProfile';
import HelpCenter from './HelpCenter';
import ContactForm from './ContactForm';
// QuotesView eliminado - ya no se usa
import { DigitalGarden } from './DigitalGarden';
import { DashboardIcon, DeviceIcon, AIIcon, AdminIcon, HelpIcon, UserIcon } from './Icons';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'garden' | 'devices' | 'humidity' | 'ai' | 'admin' | 'profile'>('garden');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showMiniAIChat, setShowMiniAIChat] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Si el usuario baja (scrollY aumenta), ocultar el header
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        setHeaderVisible(false);
      } 
      // Si el usuario sube (scrollY disminuye), mostrar el header
      else if (currentScrollY < lastScrollYRef.current) {
        setHeaderVisible(true);
      }
      
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="dashboard authenticated">
      {/* Header autenticado */}
      <header className={`dashboard-header ${!headerVisible ? 'hidden' : ''}`}>
        <div className="header-content">
          <div className="logo">
            <img src="/Plantcare_solo-removebg-preview.png" alt="PlantCare" className="logo-img" />
            <span>PlantCare</span>
          </div>
          <nav className="header-nav">
            <button 
              className={`nav-btn ${activeView === 'garden' ? 'active' : ''}`}
              onClick={() => setActiveView('garden')}
            >
              🌿
              <span className="nav-text">Tu Jardín</span>
            </button>
            <button 
              className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              <DashboardIcon className="nav-icon" />
              Dashboard
            </button>
            <button 
              className={`nav-btn ${activeView === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveView('devices')}
            >
              <DeviceIcon className="nav-icon" />
              Dispositivos
            </button>
            <button 
              className={`nav-btn ${activeView === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveView('ai')}
            >
              <AIIcon className="nav-icon" />
              IA Chat
            </button>
            {(user?.role_id === 2 || user?.role_id === 3 || user?.role === 'admin') && (
              <button 
                className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveView('admin')}
              >
                <AdminIcon className="nav-icon" />
                {user?.role_id === 3 ? 'Superadmin' : 'Admin'}
              </button>
            )}
            <button 
              className="nav-btn help-btn"
              onClick={() => setShowHelpCenter(true)}
              title="Centro de Ayuda"
            >
              <HelpIcon className="nav-icon" />
              Ayuda
            </button>
            <div className="user-menu">
              <button 
                className="user-name-btn"
                onClick={() => setShowUserProfile(true)}
                title="Mi Perfil"
              >
                <UserIcon className="nav-icon" />
                <span className="user-name-text">
                  {user?.full_name}
                  {user?.role_id === 3 && (
                    <span className="role-badge superadmin-badge" title="Superadministrador">
                      👑 Superadmin
                    </span>
                  )}
                  {user?.role_id === 2 && (
                    <span className="role-badge admin-badge" title="Administrador">
                      🛠️ Admin
                    </span>
                  )}
                </span>
              </button>
              <button className="logout-btn" onClick={logout}>
                Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="dashboard-main">
        {activeView === 'garden' && <DigitalGarden />}
        {activeView === 'dashboard' && <DashboardCharts />}
        {activeView === 'devices' && <DeviceManager />}
        {activeView === 'humidity' && <HumedadView />}
        {activeView === 'ai' && <AIChat />}
        {activeView === 'admin' && (user?.role_id === 2 || user?.role === 'admin') && <AdminPanel />}
      </main>

      {/* Botón flotante azul para mini chat IA */}
      <button
        className="ai-fab"
        onClick={() => setShowMiniAIChat((prev) => !prev)}
        title="Chatear con PlantCare AI"
      >
        💬
      </button>

      {showMiniAIChat && (
        <div className="ai-mini-chat-container">
          <div className="ai-mini-chat-header">
            <div className="ai-mini-chat-title">
              <span className="ai-mini-chat-icon">🤖</span>
              <span>PlantCare AI</span>
            </div>
            <button
              className="ai-mini-chat-close"
              onClick={() => setShowMiniAIChat(false)}
              aria-label="Cerrar chat"
            >
              ×
            </button>
          </div>
          <div className="ai-mini-chat-body">
            <AIChatMinimal />
          </div>
        </div>
      )}

      {/* Modales */}
      {showHelpCenter && (
        // ✅ BIEN
        <HelpCenter
          onClose={() => setShowHelpCenter(false)}
        />
      )}
      {showContactForm && (
        <ContactForm onClose={() => setShowContactForm(false)} />
      )}
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  );
};

export default Dashboard;
