import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './DemoSetup.css';

interface DemoSetupProps {
  onComplete?: () => void;
}

const DemoSetup: React.FC<DemoSetupProps> = ({ onComplete }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'setup' | 'admin' | 'complete'>('setup');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `Error ${response.status}`);
    }

    return response.json();
  };

  const setupDemoAccount = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await apiCall('/api/demo/setup-demo-account', {
        method: 'POST'
      });
      
      setResults(result);
      setStep('complete');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAdminUser = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await apiCall('/api/demo/create-admin-user', {
        method: 'POST'
      });
      
      setResults(result);
      setStep('complete');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateRealtimeData = async () => {
    try {
      setLoading(true);
      
      await apiCall('/api/demo/generate-realtime-data', {
        method: 'POST'
      });
      
      // Simular algunas alertas también
      await apiCall('/api/demo/simulate-alerts', {
        method: 'POST'
      });
      
      if (onComplete) onComplete();
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete' && results) {
    return (
      <div className="demo-setup">
        <div className="setup-card success">
          <div className="success-icon">🎉</div>
          <h2>¡Demostración Lista!</h2>
          
          {results.devices && (
            <div className="demo-results">
              <h3>Dispositivos Creados:</h3>
              <div className="devices-list">
                {results.devices.map((device: any, index: number) => (
                  <div key={index} className="device-item">
                    <span className="device-code">{device.device_code}</span>
                    <span className="device-name">{device.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {results.credentials && (
            <div className="admin-credentials">
              <h3>Credenciales de Administrador:</h3>
              <div className="credentials">
                <p><strong>Email:</strong> {results.credentials.email}</p>
                <p><strong>Contraseña:</strong> {results.credentials.password}</p>
                <p className="warning">⚠️ Solo para desarrollo</p>
              </div>
            </div>
          )}
          
          <div className="next-steps">
            <h3>Próximos Pasos:</h3>
            <ol>
              <li>Ve al Dashboard para ver los gráficos</li>
              <li>Explora los reportes de IA</li>
              <li>Revisa las alertas automáticas</li>
              {results.credentials && <li>Prueba el panel de administración</li>}
            </ol>
          </div>
          
          <div className="demo-actions">
            <button 
              onClick={generateRealtimeData}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Generando...' : '🔄 Generar Datos Nuevos'}
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="btn-secondary"
            >
              📊 Ver Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-setup">
      <div className="setup-card">
        <div className="setup-header">
          <h2>🚀 Configuración de Demostración</h2>
          <p>Configura tu cuenta con datos de prueba para ver todas las funcionalidades</p>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <div className="setup-options">
          <div className="option-card centered">
            <div className="option-icon">🌱</div>
            <h3>Configurar Demostración</h3>
            <p>Crea dispositivos simulados con datos históricos realistas para ver todas las funcionalidades</p>
            <ul>
              <li>✅ 3 sensores con nombres realistas</li>
              <li>✅ 7 días de datos históricos</li>
              <li>✅ Patrones de humedad naturales</li>
              <li>✅ Alertas automáticas</li>
              <li>✅ Gráficos y reportes de IA</li>
            </ul>
            <button 
              onClick={setupDemoAccount}
              className="btn-primary large"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Configurando demostración...
                </>
              ) : (
                '🚀 Configurar Demostración'
              )}
            </button>
          </div>
        </div>

        <div className="setup-info">
          <h4>ℹ️ Información Importante:</h4>
          <ul>
            <li>Los datos generados son completamente simulados</li>
            <li>Puedes generar nuevos datos en cualquier momento</li>
            <li>Los gráficos y reportes de IA funcionarán normalmente</li>
            <li>Ideal para presentaciones y demostraciones</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DemoSetup;
