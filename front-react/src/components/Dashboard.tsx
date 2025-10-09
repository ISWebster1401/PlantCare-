import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DeviceManager from './DeviceManager';
import HumedadView from './HumedadView';
import AIChat from './AIChat';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeView, setActiveView] = useState<'devices' | 'humidity' | 'ai' | 'profile'>('devices');

  return (
    <div className="dashboard authenticated">
      {/* Header autenticado */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">🌱 PlantCare</div>
          <nav className="header-nav">
            <button 
              className={`nav-btn ${activeView === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveView('devices')}
            >
              Mis Dispositivos
            </button>
            <button 
              className={`nav-btn ${activeView === 'humidity' ? 'active' : ''}`}
              onClick={() => setActiveView('humidity')}
            >
              Datos de Humedad
            </button>
            <button 
              className={`nav-btn ${activeView === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveView('ai')}
            >
              🤖 Asistente IA
            </button>
            <div className="user-menu">
              <span className="user-name">👋 {user?.first_name}</span>
              <button className="logout-btn" onClick={logout}>
                Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="dashboard-main">
        {activeView === 'devices' && <DeviceManager />}
        {activeView === 'humidity' && <HumedadView />}
        {activeView === 'ai' && <AIChat />}
      </main>
    </div>
  );
};

export default Dashboard;
