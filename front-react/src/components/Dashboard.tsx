import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardCharts from './DashboardCharts';
import DeviceManager from './DeviceManager';
import HumedadView from './HumedadView';
import AIChat from './AIChat';
import AdminPanel from './AdminPanel';
import UserProfile from './UserProfile';
import HelpCenter from './HelpCenter';
import ContactForm from './ContactForm';
import QuoteRequest from './QuoteRequest';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'devices' | 'humidity' | 'ai' | 'admin' | 'profile'>('dashboard');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  return (
    <div className="dashboard authenticated">
      {/* Header autenticado */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">🌱 PlantCare</div>
          <nav className="header-nav">
            <button 
              className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-btn ${activeView === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveView('devices')}
            >
              📱 Dispositivos
            </button>
            <button 
              className={`nav-btn ${activeView === 'humidity' ? 'active' : ''}`}
              onClick={() => setActiveView('humidity')}
            >
              💧 Datos
            </button>
            <button 
              className={`nav-btn ${activeView === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveView('ai')}
            >
              🤖 IA Chat
            </button>
            {user?.role_id === 2 && (
              <button 
                className={`nav-btn ${activeView === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveView('admin')}
              >
                🛠️ Admin
              </button>
            )}
            <button 
              className="nav-btn help-btn"
              onClick={() => setShowHelpCenter(true)}
              title="Centro de Ayuda"
            >
              🆘 Ayuda
            </button>
            <div className="user-menu">
              <button 
                className="user-name-btn"
                onClick={() => setShowUserProfile(true)}
                title="Mi Perfil"
              >
                👋 {user?.first_name}
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
            onClick={() => setShowQuoteForm(true)}
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
      {showQuoteForm && (
        <QuoteRequest onClose={() => setShowQuoteForm(false)} />
      )}
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  );
};

export default Dashboard;
