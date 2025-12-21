import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceAPI, plantsAPI } from '../services/api';
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

interface Plant {
  id: number;
  plant_name: string;
  plant_type: string;
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
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [stats, setStats] = useState({ total: 0, connected: 0, active: 0, offline: 0 });
  
  // Form data para conectar dispositivo
  const [connectForm, setConnectForm] = useState({
    device_code: '',
    name: '',
    location: ''
  });
  const [selectedPlantId, setSelectedPlantId] = useState<number | ''>('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devicesResponse, plantsResponse] = await Promise.all([
        deviceAPI.getMyDevices(),
        plantsAPI.getMyPlants(),
      ]);

      const response: DeviceListResponse = devicesResponse;
      setDevices(response.devices);
      setStats({
        total: response.total,
        connected: response.connected,
        active: response.active,
        offline: response.offline
      });
      setPlants(plantsResponse || []);
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
      // Buscar planta seleccionada (si hay)
      const selectedPlant =
        typeof selectedPlantId === 'number'
          ? plants.find((p) => p.id === selectedPlantId)
          : undefined;

      // Construir payload para el backend
      await deviceAPI.connectDevice({
        device_code: connectForm.device_code,
        name: connectForm.name,
        location: connectForm.location || undefined,
        // Usamos el nombre de la planta como referencia de tipo
        plant_type: selectedPlant ? selectedPlant.plant_name : undefined,
      });

      setConnectForm({ device_code: '', name: '', location: '' });
      setSelectedPlantId('');
      setShowConnectForm(false);
      await loadData(); // Recargar lista y plantas
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
        await loadData();
      } catch (error: any) {
        setError(error.response?.data?.detail || 'Error al desconectar dispositivo');
      }
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
                <label htmlFor="plant_select">Planta a monitorear (opcional)</label>
                {plants.length === 0 ? (
                  <p className="no-plants-hint">
                    Aún no tienes plantas en tu jardín. Crea tu primera planta en la sección
                    <strong> “Tu Jardín”</strong> para poder asignarla a este dispositivo.
                  </p>
                ) : (
                  <select
                    id="plant_select"
                    value={selectedPlantId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedPlantId(value ? parseInt(value, 10) : '');
                    }}
                  >
                    <option value="">No asignar por ahora</option>
                    {plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.plant_name}
                      </option>
                    ))}
                  </select>
                )}
                <small>
                  Luego podrás vincular este dispositivo a sensores específicos desde el gestor de
                  sensores.
                </small>
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
