import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardCharts from './DashboardCharts';
import DeviceManager from './DeviceManager';
import HumedadView from './HumedadView';
import AIChat from './AIChat';
import AdminPanel from './AdminPanel';
import UserProfile from './UserProfile';
import HelpCenter from './HelpCenter';
import ContactForm from './ContactForm';
import QuotesView from './QuotesView';
import { DashboardIcon, DeviceIcon, DataIcon, AIIcon, AdminIcon, HelpIcon, UserIcon, QuoteIcon } from './Icons';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'devices' | 'humidity' | 'ai' | 'admin' | 'profile' | 'quotes'>('dashboard');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Si el usuario baja (scrollY aumenta), ocultar el header
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false);
      } 
      // Si el usuario sube (scrollY disminuye), mostrar el header
      else if (currentScrollY < lastScrollY) {
        setHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
              className={`nav-btn ${activeView === 'humidity' ? 'active' : ''}`}
              onClick={() => setActiveView('humidity')}
            >
              <DataIcon className="nav-icon" />
              Datos
            </button>
            <button 
              className={`nav-btn ${activeView === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveView('ai')}
            >
              <AIIcon className="nav-icon" />
              IA Chat
            </button>
            <button 
              className={`nav-btn ${activeView === 'quotes' ? 'active' : ''}`}
              onClick={() => setActiveView('quotes')}
            >
              <QuoteIcon className="nav-icon" />
              Cotizaciones
            </button>
            {user?.role_id === 2 && (
              <button 
                className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveView('admin')}
              >
                <AdminIcon className="nav-icon" />
                Admin
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
                {user?.first_name}
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
        {activeView === 'dashboard' && <DashboardCharts />}
        {activeView === 'devices' && <DeviceManager />}
        {activeView === 'humidity' && <HumedadView />}
        {activeView === 'ai' && <AIChat />}
        {activeView === 'quotes' && <QuotesView />}
        {activeView === 'admin' && user?.role_id === 2 && <AdminPanel />}
      </main>

      {/* Botón flotante de ayuda */}
      <div className="floating-help">
        <button 
          className="help-fab"
          onClick={() => setShowHelpCenter(true)}
          title="¿Necesitas ayuda?"
        >
          💬
        </button>
        <div className="help-options">
          <button 
            className="help-option"
            onClick={() => setShowContactForm(true)}
            title="Contactar Soporte"
          >
            📧
          </button>
          <button 
            className="help-option"
            onClick={() => setActiveView('quotes')}
            title="Solicitar Cotización"
          >
            💰
          </button>
        </div>
      </div>

      {/* Modales */}
      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
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
