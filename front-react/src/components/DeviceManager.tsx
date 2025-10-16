import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceAPI } from '../services/api';
import './DeviceManager.css';

interface Device {
  id: number;
  device_code: string;
  name: string;
  location?: string;
  plant_type?: string;
  device_type: string;
  connected: boolean;
  last_seen?: string;
  created_at: string;
}

interface DeviceListResponse {
  devices: Device[];
  total: number;
  connected: number;
  active: number;
  offline: number;
}

const DeviceManager: React.FC = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [stats, setStats] = useState({ total: 0, connected: 0, active: 0, offline: 0 });
  
  // Form data para conectar dispositivo
  const [connectForm, setConnectForm] = useState({
    device_code: '',
    name: '',
    location: '',
    plant_type: ''
  });
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [settingUpDemo, setSettingUpDemo] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response: DeviceListResponse = await deviceAPI.getMyDevices();
      setDevices(response.devices);
      setStats({
        total: response.total,
        connected: response.connected,
        active: response.active,
        offline: response.offline
      });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError(null);

    try {
      await deviceAPI.connectDevice(connectForm);
      setConnectForm({ device_code: '', name: '', location: '', plant_type: '' });
      setShowConnectForm(false);
      await loadDevices(); // Recargar lista
    } catch (error: any) {
      setConnectError(error.response?.data?.detail || 'Error al conectar dispositivo');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectDevice = async (deviceId: number) => {
    if (window.confirm('¿Estás seguro de que quieres desconectar este dispositivo?')) {
      try {
        await deviceAPI.disconnectDevice(deviceId);
        await loadDevices();
      } catch (error: any) {
        setError(error.response?.data?.detail || 'Error al desconectar dispositivo');
      }
    }
  };

  const setupDemoDevices = async () => {
    try {
      setSettingUpDemo(true);
      setError(null);
      
      const response = await fetch('/api/demo/setup-demo-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadDevices(); // Recargar dispositivos
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Error configurando demo');
      }
    } catch (err: any) {
      setError('Error configurando demostración');
    } finally {
      setSettingUpDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="device-manager">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando dispositivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="device-manager">
      <div className="manager-header">
        <h1>Mis Dispositivos</h1>
        <div className="header-actions">
          <button 
            className="demo-btn"
            onClick={setupDemoDevices}
            disabled={settingUpDemo}
          >
            {settingUpDemo ? (
              <>
                <span className="spinner"></span>
                Configurando...
              </>
            ) : (
              '🚀 Demo Rápido'
            )}
          </button>
          <button 
            className="connect-btn"
            onClick={() => setShowConnectForm(true)}
          >
            + Conectar Dispositivo
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card connected">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <div className="stat-value">{stats.connected}</div>
            <div className="stat-label">Conectados</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Activos</div>
          </div>
        </div>
        <div className="stat-card offline">
          <div className="stat-icon">⚫</div>
          <div className="stat-info">
            <div className="stat-value">{stats.offline}</div>
            <div className="stat-label">Desconectados</div>
          </div>
        </div>
      </div>

      {/* Lista de dispositivos */}
      <div className="devices-section">
        <h2>Dispositivos Registrados</h2>
        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No hay dispositivos conectados</h3>
            <p>Conecta tu primer dispositivo para comenzar a monitorear tus plantas</p>
            <button 
              className="connect-btn"
              onClick={() => setShowConnectForm(true)}
            >
              Conectar Dispositivo
            </button>
          </div>
        ) : (
          <div className="devices-grid">
            {devices.map((device) => (
              <div key={device.id} className="device-card">
                <div className="device-header">
                  <div className="device-info">
                    <h3>{device.name}</h3>
                    <span className="device-code">{device.device_code}</span>
                  </div>
                  <div className={`device-status ${device.connected ? 'connected' : 'disconnected'}`}>
                    {device.connected ? '🟢' : '⚫'}
                  </div>
                </div>
                
                <div className="device-details">
                  <div className="detail-item">
                    <span className="label">Tipo:</span>
                    <span className="value">{device.device_type}</span>
                  </div>
                  {device.location && (
                    <div className="detail-item">
                      <span className="label">Ubicación:</span>
                      <span className="value">{device.location}</span>
                    </div>
                  )}
                  {device.plant_type && (
                    <div className="detail-item">
                      <span className="label">Planta:</span>
                      <span className="value">{device.plant_type}</span>
                    </div>
                  )}
                  {device.last_seen && (
                    <div className="detail-item">
                      <span className="label">Última conexión:</span>
                      <span className="value">
                        {new Date(device.last_seen).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="device-actions">
                  <button className="action-btn view-btn">
                    Ver Datos
                  </button>
                  <button 
                    className="action-btn disconnect-btn"
                    onClick={() => handleDisconnectDevice(device.id)}
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para conectar dispositivo */}
      {showConnectForm && (
        <div className="modal-overlay" onClick={() => setShowConnectForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Conectar Nuevo Dispositivo</h2>
              <button 
                className="modal-close"
                onClick={() => setShowConnectForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleConnectDevice} className="connect-form">
              {connectError && (
                <div className="error-message">
                  {connectError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="device_code">Código del Dispositivo</label>
                <input
                  type="text"
                  id="device_code"
                  value={connectForm.device_code}
                  onChange={(e) => setConnectForm({ ...connectForm, device_code: e.target.value })}
                  placeholder="ABC-1234"
                  required
                />
                <small>Formato: ABC-1234 (encuentra este código en tu dispositivo)</small>
              </div>

              <div className="form-group">
                <label htmlFor="name">Nombre del Dispositivo</label>
                <input
                  type="text"
                  id="name"
                  value={connectForm.name}
                  onChange={(e) => setConnectForm({ ...connectForm, name: e.target.value })}
                  placeholder="Sensor Jardín Principal"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">Ubicación (opcional)</label>
                <input
                  type="text"
                  id="location"
                  value={connectForm.location}
                  onChange={(e) => setConnectForm({ ...connectForm, location: e.target.value })}
                  placeholder="Jardín trasero, Maceta 1, etc."
                />
              </div>

              <div className="form-group">
                <label htmlFor="plant_type">Tipo de Planta (opcional)</label>
                <input
                  type="text"
                  id="plant_type"
                  value={connectForm.plant_type}
                  onChange={(e) => setConnectForm({ ...connectForm, plant_type: e.target.value })}
                  placeholder="Rosa, Tomate, Ficus, etc."
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowConnectForm(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={connecting}
                >
                  {connecting ? 'Conectando...' : 'Conectar Dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManager;
