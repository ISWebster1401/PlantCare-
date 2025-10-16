import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  region?: string;
  vineyard_name?: string;
  hectares?: number;
  grape_type?: string;
  role_id: number;
  role_name?: string;
  created_at: string;
  last_login?: string;
  active: boolean;
  device_count: number;
}

interface Device {
  id: number;
  device_code: string;
  name?: string;
  device_type: string;
  location?: string;
  plant_type?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  created_at: string;
  last_seen?: string;
  connected_at?: string;
  active: boolean;
  connected: boolean;
}

interface AdminStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_users: number;
  total_devices: number;
  connected_devices: number;
  unconnected_devices: number;
  active_devices: number;
  total_readings_today: number;
  total_readings_week: number;
  new_users_today: number;
  new_users_week: number;
  new_devices_today: number;
  new_devices_week: number;
}

interface DeviceCodeBatch {
  device_type: string;
  quantity: number;
  prefix?: string;
}

const AdminPanel: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'devices' | 'codes'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Estados para filtros
  const [userFilters, setUserFilters] = useState({
    search: '',
    role_id: '',
    active: '',
    region: ''
  });

  const [deviceFilters, setDeviceFilters] = useState({
    search: '',
    device_type: '',
    connected: '',
    active: ''
  });

  // Estado para generar códigos
  const [codeGeneration, setCodeGeneration] = useState<DeviceCodeBatch>({
    device_type: 'humidity_sensor',
    quantity: 1
  });

  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);

  // ✅ HOOK MOVIDO AQUÍ - ANTES DEL RETURN CONDICIONAL
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'devices') {
      loadDevices();
    }
  }, [activeTab]);

  // ✅ AHORA SÍ LA VERIFICACIÓN DE ADMIN
  if (!user || user.role_id !== 2) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h2>🚫 Acceso Denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

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

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/admin/stats');
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
      const params = new URLSearchParams();
      Object.entries(userFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const data = await apiCall(`/api/admin/users?${params}`);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(deviceFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const data = await apiCall(`/api/admin/devices?${params}`);
      setDevices(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDeviceCodes = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/admin/devices/generate-codes', {
        method: 'POST',
        body: JSON.stringify(codeGeneration)
      });
      setGeneratedCodes(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiCall(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !currentStatus })
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ✅ CONFIRM CORREGIDO CON WINDOW.CONFIRM
  const deleteUser = async (userId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;
    
    try {
      await apiCall(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

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
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Dispositivos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'codes' ? 'active' : ''}`}
          onClick={() => setActiveTab('codes')}
        >
          🏷️ Generar Códigos
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
                    <span className="inactive">{stats.inactive_users} inactivos</span>
                  </div>
                </div>
              </div>

              <div className="stat-card devices">
                <div className="stat-icon">📱</div>
                <div className="stat-info">
                  <h3>Dispositivos</h3>
                  <div className="stat-number">{stats.total_devices}</div>
                  <div className="stat-details">
                    <span className="connected">{stats.connected_devices} conectados</span>
                    <span className="unconnected">{stats.unconnected_devices} disponibles</span>
                  </div>
                </div>
              </div>

              <div className="stat-card readings">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Lecturas Hoy</h3>
                  <div className="stat-number">{stats.total_readings_today}</div>
                  <div className="stat-details">
                    <span>{stats.total_readings_week} esta semana</span>
                  </div>
                </div>
              </div>

              <div className="stat-card growth">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <h3>Crecimiento</h3>
                  <div className="stat-number">+{stats.new_users_today}</div>
                  <div className="stat-details">
                    <span>usuarios hoy</span>
                    <span>+{stats.new_devices_today} dispositivos</span>
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
              <div className="filters">
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={userFilters.search}
                  onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
                />
                <select
                  value={userFilters.role_id}
                  onChange={(e) => setUserFilters({...userFilters, role_id: e.target.value})}
                >
                  <option value="">Todos los roles</option>
                  <option value="1">Usuario</option>
                  <option value="2">Administrador</option>
                </select>
                <select
                  value={userFilters.active}
                  onChange={(e) => setUserFilters({...userFilters, active: e.target.value})}
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
                <button onClick={loadUsers} className="btn-primary">
                  🔍 Filtrar
                </button>
              </div>
            </div>

            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Viñedo</th>
                    <th>Rol</th>
                    <th>Dispositivos</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.first_name} {user.last_name}</td>
                      <td>{user.email}</td>
                      <td>{user.vineyard_name || '-'}</td>
                      <td>
                        <span className={`role-badge ${user.role_id === 2 ? 'admin' : 'user'}`}>
                          {user.role_name || (user.role_id === 2 ? 'Admin' : 'Usuario')}
                        </span>
                      </td>
                      <td>{user.device_count}</td>
                      <td>
                        <span className={`status-badge ${user.active ? 'active' : 'inactive'}`}>
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => toggleUserStatus(user.id, user.active)}
                            className={`btn-sm ${user.active ? 'btn-warning' : 'btn-success'}`}
                          >
                            {user.active ? '⏸️' : '▶️'}
                          </button>
                          {user.role_id !== 2 && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="btn-sm btn-danger"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="devices-section">
            <div className="section-header">
              <h2>Gestión de Dispositivos</h2>
              <div className="filters">
                <input
                  type="text"
                  placeholder="Buscar dispositivos..."
                  value={deviceFilters.search}
                  onChange={(e) => setDeviceFilters({...deviceFilters, search: e.target.value})}
                />
                <select
                  value={deviceFilters.connected}
                  onChange={(e) => setDeviceFilters({...deviceFilters, connected: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="true">Conectados</option>
                  <option value="false">Disponibles</option>
                </select>
                <button onClick={loadDevices} className="btn-primary">
                  🔍 Filtrar
                </button>
              </div>
            </div>

            <div className="devices-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Usuario</th>
                    <th>Estado</th>
                    <th>Última Conexión</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id}>
                      <td>{device.id}</td>
                      <td><code>{device.device_code}</code></td>
                      <td>{device.name || '-'}</td>
                      <td>{device.device_type}</td>
                      <td>
                        {device.user_name ? (
                          <div>
                            <div>{device.user_name}</div>
                            <small>{device.user_email}</small>
                          </div>
                        ) : (
                          <span className="unassigned">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${device.connected ? 'connected' : 'available'}`}>
                          {device.connected ? 'Conectado' : 'Disponible'}
                        </span>
                      </td>
                      <td>
                        {device.last_seen ? 
                          new Date(device.last_seen).toLocaleString() : 
                          'Nunca'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'codes' && (
          <div className="codes-section">
            <div className="section-header">
              <h2>Generar Códigos de Dispositivos</h2>
            </div>

            <div className="code-generation">
              <div className="generation-form">
                <div className="form-group">
                  <label>Tipo de Dispositivo:</label>
                  <select
                    value={codeGeneration.device_type}
                    onChange={(e) => setCodeGeneration({...codeGeneration, device_type: e.target.value})}
                  >
                    <option value="humidity_sensor">Sensor de Humedad</option>
                    <option value="temperature_sensor">Sensor de Temperatura</option>
                    <option value="multi_sensor">Multi Sensor</option>
                    <option value="irrigation_controller">Controlador de Riego</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Cantidad:</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={codeGeneration.quantity}
                    onChange={(e) => setCodeGeneration({...codeGeneration, quantity: parseInt(e.target.value)})}
                  />
                </div>

                <button 
                  onClick={generateDeviceCodes}
                  className="btn-primary"
                  disabled={loading}
                >
                  🏷️ Generar Códigos
                </button>
              </div>

              {generatedCodes.length > 0 && (
                <div className="generated-codes">
                  <h3>Códigos Generados:</h3>
                  <div className="codes-grid">
                    {generatedCodes.map((code, index) => (
                      <div key={index} className="code-card">
                        <div className="code-value">{code.device_code}</div>
                        <div className="code-type">{code.device_type}</div>
                        <div className="code-date">
                          {new Date(code.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;