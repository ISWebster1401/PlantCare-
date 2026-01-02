import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  plants_count: number;
  sensors_count: number;
}

interface Sensor {
  id: string;
  device_id: string;
  name: string;
  user_email?: string | null;
  plant_name?: string | null;
  status: string;
  is_connected: boolean;
  last_connection?: string | null;
}

interface AdminStats {
  total_users: number;
  active_users: number;
  total_sensors: number;
  connected_sensors: number;
  total_plants: number;
}

const AdminPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'sensors'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const apiCall = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  
    const text = await response.text();
  
    if (!response.ok) {
      try {
        const errorData = text ? JSON.parse(text) : { detail: 'Error desconocido' };
        throw new Error(errorData.detail || `Error ${response.status}`);
      } catch (parseError) {
        throw new Error(`Error ${response.status}. Respuesta del servidor: ${text || 'sin contenido'}`);
      }
    }
  
    if (!text) {
      return null as T;
    }
  
    try {
      return JSON.parse(text);
    } catch (parseError) {
      return text as unknown as T;
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiCall<AdminStats>('/api/admin/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiCall<User[]>(`/api/admin/users`);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSensors = async () => {
    try {
      setLoading(true);
      const data = await apiCall<Sensor[]>(`/api/admin/sensors`);
      setSensors(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number) => {
    try {
      await apiCall(`/api/admin/users/${userId}/toggle-status`, {
        method: 'PUT'
      });
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const isAdmin = user && (user.role_id === 2 || user.role === 'admin');
    if (!isAdmin) {
      return;
    }

    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'sensors') {
      loadSensors();
    }
  }, [activeTab, user]);

  const isAdmin = user && (user.role_id === 2 || user.role === 'admin');
  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>🚫 Acceso Denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🛠️ Panel de Administración</h1>
        <p>Gestión completa del sistema PlantCare</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Usuarios
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensors')}
        >
          📡 Sensores
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="admin-content">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        )}

        {activeTab === 'dashboard' && stats && (
          <div className="dashboard-section">
            <div className="stats-grid">
              <div className="stat-card users">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Usuarios</h3>
                  <div className="stat-number">{stats.total_users}</div>
                  <div className="stat-details">
                    <span className="active">{stats.active_users} activos</span>
                  </div>
                </div>
              </div>

              <div className="stat-card devices">
                <div className="stat-icon">📱</div>
                <div className="stat-info">
                  <h3>Sensores</h3>
                  <div className="stat-number">{stats.total_sensors}</div>
                  <div className="stat-details">
                    <span className="connected">{stats.connected_sensors} conectados</span>
                  </div>
                </div>
              </div>

              <div className="stat-card plants">
                <div className="stat-icon">🌱</div>
                <div className="stat-info">
                  <h3>Plantas</h3>
                  <div className="stat-number">{stats.total_plants}</div>
                  <div className="stat-details">
                    <span>Total registradas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>Gestión de Usuarios</h2>
              <button onClick={loadUsers} className="btn-primary">
                🔄 Actualizar
              </button>
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Plantas</th>
                    <th>Sensores</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                        No hay usuarios registrados
                      </td>
                    </tr>
                  ) : (
                    users.map(userItem => (
                      <tr key={userItem.id}>
                        <td>{userItem.id}</td>
                        <td>{userItem.full_name}</td>
                        <td>{userItem.email}</td>
                        <td>
                          <span className={`status-badge ${userItem.is_active ? 'active' : 'inactive'}`}>
                            {userItem.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>{userItem.plants_count}</td>
                        <td>{userItem.sensors_count}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => toggleUserStatus(userItem.id)}
                              className={`btn-sm ${userItem.is_active ? 'btn-warning' : 'btn-success'}`}
                              title={userItem.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {userItem.is_active ? '⏸️' : '▶️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sensors' && (
          <div className="devices-section">
            <div className="section-header">
              <h2>Gestión de Sensores</h2>
              <button onClick={loadSensors} className="btn-primary">
                🔄 Actualizar
              </button>
            </div>

            <div className="devices-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Planta</th>
                    <th>Estado</th>
                    <th>Conexión</th>
                    <th>Última Conexión</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>
                        No hay sensores registrados
                      </td>
                    </tr>
                  ) : (
                    sensors.map(sensor => (
                      <tr key={sensor.id}>
                        <td>{sensor.id.substring(0, 8)}...</td>
                        <td><code>{sensor.device_id}</code></td>
                        <td>{sensor.name}</td>
                        <td>{sensor.user_email || <span className="unassigned">Sin asignar</span>}</td>
                        <td>{sensor.plant_name || '-'}</td>
                        <td>
                          <span className={`status-badge ${sensor.status === 'active' ? 'active' : 'inactive'}`}>
                            {sensor.status}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${sensor.is_connected ? 'connected' : 'available'}`}>
                            {sensor.is_connected ? 'Conectado' : 'Desconectado'}
                          </span>
                        </td>
                        <td>
                          {sensor.last_connection ? 
                            new Date(sensor.last_connection).toLocaleString() : 
                            'Nunca'
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
