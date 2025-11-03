import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import EmailVerification from './components/EmailVerification';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Verificar si hay token de verificación en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setVerificationToken(token);
    }
  }, []);

  // Si hay token de verificación, mostrar componente de verificación
  if (verificationToken) {
    return (
      <div className="App">
        <EmailVerification token={verificationToken} />
      </div>
    );
  }

  // Mientras verifica cookies y restaura sesión
  if (isLoading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a, #1e293b, #0f172a)',
          color: 'white'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid rgba(74, 222, 128, 0.2)',
              borderTop: '3px solid #4ade80',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p>🌱 Cargando PlantCare...</p>
            <small style={{ opacity: 0.7, marginTop: '10px', display: 'block' }}>
              Verificando sesión guardada...
            </small>
          </div>
        </div>
      </div>
    );
  }

  // 🎯 NAVEGACIÓN BASADA EN PERSISTENCIA DE COOKIES
  return (
    <div className="App">
      {isAuthenticated ? <Dashboard /> : <LandingPage />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
