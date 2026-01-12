import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
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

interface Plant {
  id: number;
  plant_name: string;
  plant_type: string | null;
  user_email: string;
  sensor_connected: boolean;
  sensor_device_id: string | null;
}

interface PlantModel {
  id: number;
  plant_type: string;
  name: string;
  model_3d_url: string;
  default_render_url: string | null;
  is_default: boolean;
  metadata?: any;
}

interface AdminStats {
  total_users: number;
  active_users: number;
  total_sensors: number;
  connected_sensors: number;
  total_plants: number;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'sensors' | 'plants' | 'models'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de datos
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [models, setModels] = useState<PlantModel[]>([]);

  // Estados para formulario de subida de modelo
  const [uploadingModel, setUploadingModel] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPlantType, setModelPlantType] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelIsDefault, setModelIsDefault] = useState(false);
  
  // Estados para edición de modelo
  const [editingModel, setEditingModel] = useState<PlantModel | null>(null);
  const [editModelFile, setEditModelFile] = useState<File | null>(null);
  const [editModelPlantType, setEditModelPlantType] = useState('');
  const [editModelName, setEditModelName] = useState('');
  const [editModelIsDefault, setEditModelIsDefault] = useState(false);
  const [updatingModel, setUpdatingModel] = useState(false);

  // Tipos de plantas comunes
  const commonPlantTypes = [
    'Suculenta',
    'Monstera',
    'Pothos',
    'Sansevieria',
    'Ficus',
    'Cactus',
    'Aloe',
    'Helecho',
    'Dólar',
    'Planta'
  ];

  // Nombres de modelos comunes (basados en el tipo seleccionado)
  const getModelNameOptions = (plantType: string) => {
    if (!plantType) {
      return [
        'Suculenta Default',
        'Monstera Default',
        'Pothos Default',
        'Sansevieria Default',
        'Ficus Default',
        'Cactus Default',
        'Aloe Default',
        'Helecho Default',
        'Dólar Default',
        'Planta Genérica'
      ];
    }
    return [`${plantType} Default`, `${plantType} Model`, `${plantType} Variant`];
  };

  const loadStats = async () => {
    try {
      setError(null);
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error cargando estadísticas');
      console.error('Error loading stats:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setError(null);
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error cargando usuarios');
      console.error('Error loading users:', err);
    }
  };

  const loadSensors = async () => {
    try {
      setError(null);
      const data = await adminAPI.getSensors();
      setSensors(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error cargando sensores');
      console.error('Error loading sensors:', err);
    }
  };

  const loadPlants = async () => {
    try {
      setError(null);
      const data = await adminAPI.getPlants();
      setPlants(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error cargando plantas');
      console.error('Error loading plants:', err);
    }
  };

  const loadModels = async () => {
    try {
      setError(null);
      const data = await adminAPI.getModels();
      setModels(data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error cargando modelos 3D';
      // Solo mostrar error si no es un 404 o lista vacía
      if (err.response?.status !== 404) {
        setError(errorMessage);
      }
      setModels([]);
      console.error('Error loading models:', err);
    }
  };

  const handleUploadModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelFile) {
      setError('Por favor selecciona un archivo .glb');
      return;
    }

    try {
      setUploadingModel(true);
      setError(null);
      // Si se seleccionó un tipo de planta, marcar como default automáticamente si es el primero
      // El backend manejará esto automáticamente si is_default no se especifica
      const isFirstOfType = modelPlantType ? !models.some(m => m.plant_type === modelPlantType) : false;
      const shouldBeDefault: boolean = Boolean(modelIsDefault) || isFirstOfType;
      await adminAPI.uploadModel(
        modelFile, 
        modelPlantType || undefined, 
        modelName || undefined, 
        shouldBeDefault
      );
      
      // Limpiar formulario
      setModelFile(null);
      setModelPlantType('');
      setModelName('');
      setModelIsDefault(false);
      
      // Recargar modelos
      await loadModels();
      
      alert('✅ Modelo 3D subido exitosamente');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error subiendo modelo 3D');
      console.error('Error uploading model:', err);
    } finally {
      setUploadingModel(false);
    }
  };

  const handleEditModel = (model: PlantModel) => {
    setEditingModel(model);
    setEditModelPlantType(model.plant_type);
    setEditModelName(model.name);
    setEditModelIsDefault(model.is_default);
    setEditModelFile(null);
  };

  const handleCancelEdit = () => {
    setEditingModel(null);
    setEditModelPlantType('');
    setEditModelName('');
    setEditModelIsDefault(false);
    setEditModelFile(null);
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      setUpdatingModel(true);
      setError(null);
      
      await adminAPI.updateModel(
        editingModel.id,
        editModelFile || undefined,
        editModelPlantType || undefined,
        editModelName || undefined,
        editModelIsDefault
      );
      
      // Limpiar formulario
      handleCancelEdit();
      
      // Recargar modelos
      await loadModels();
      
      alert('✅ Modelo 3D actualizado exitosamente');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error actualizando modelo 3D');
      console.error('Error updating model:', err);
    } finally {
      setUpdatingModel(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'models') {
      loadModels();
    }
  }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'dashboard') {
        await loadStats();
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'sensors') {
        await loadSensors();
      } else if (activeTab === 'plants') {
        await loadPlants();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const toggleUserStatus = async (userId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas cambiar el estado de este usuario?')) {
      return;
    }

    try {
      setError(null);
      await adminAPI.toggleUserStatus(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'No se pudo actualizar el usuario');
      console.error('Error toggling user status:', err);
    }
  };

  const deletePlant = async (plantId: number, plantName: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la planta "${plantName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setError(null);
      await adminAPI.deletePlant(plantId);
      await loadPlants();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'No se pudo eliminar la planta');
      console.error('Error deleting plant:', err);
    }
  };

  useEffect(() => {
    const isAdmin = user && (user.role_id === 2 || user.role_id === 3 || user.role === 'admin');
    if (!isAdmin) {
      return;
    }

    setLoading(true);
    const loadData = async () => {
      try {
        if (activeTab === 'dashboard') {
          await loadStats();
        } else if (activeTab === 'users') {
          await loadUsers();
        } else if (activeTab === 'sensors') {
          await loadSensors();
        } else if (activeTab === 'plants') {
          await loadPlants();
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, user]);

  const isAdmin = user && (user.role_id === 2 || user.role_id === 3 || user.role === 'admin');
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

  const renderDashboard = () => {
    if (!stats) return null;

    return (
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
    );
  };

  const renderUsers = () => {
    return (
      <div className="users-section">
        <div className="section-header">
          <h2>Gestión de Usuarios</h2>
          <button onClick={handleRefresh} className="btn-primary" disabled={refreshing}>
            {refreshing ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <p>No hay usuarios registrados</p>
          </div>
        ) : (
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
                {users.map(userItem => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSensors = () => {
    return (
      <div className="devices-section">
        <div className="section-header">
          <h2>Gestión de Sensores</h2>
          <button onClick={handleRefresh} className="btn-primary" disabled={refreshing}>
            {refreshing ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {sensors.length === 0 ? (
          <div className="empty-state">
            <p>No hay sensores registrados</p>
          </div>
        ) : (
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
                {sensors.map(sensor => (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderPlants = () => {
    return (
      <div className="plants-section">
        <div className="section-header">
          <h2>Gestión de Plantas</h2>
          <button onClick={handleRefresh} className="btn-primary" disabled={refreshing}>
            {refreshing ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {plants.length === 0 ? (
          <div className="empty-state">
            <p>No hay plantas registradas</p>
          </div>
        ) : (
          <div className="plants-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Usuario</th>
                  <th>Sensor</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plants.map(plant => (
                  <tr key={plant.id}>
                    <td>{plant.id}</td>
                    <td>{plant.plant_name}</td>
                    <td>{plant.plant_type || '-'}</td>
                    <td>{plant.user_email}</td>
                    <td>
                      {plant.sensor_connected ? (
                        <span className="status-badge connected">
                          {plant.sensor_device_id || 'Conectado'}
                        </span>
                      ) : (
                        <span className="unassigned">Sin sensor</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => deletePlant(plant.id, plant.plant_name)}
                          className="btn-sm btn-danger"
                          title="Eliminar planta"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderModels = () => {
    return (
      <div className="models-section">
        <div className="section-header">
          <h2>Gestión de Modelos 3D</h2>
          <button onClick={handleRefresh} className="btn-primary" disabled={refreshing}>
            {refreshing ? '🔄' : '🔄'} Actualizar
          </button>
        </div>

        {/* Formulario de subida */}
        <div className="models-upload-form">
          <h3>Subir Nuevo Modelo 3D</h3>
          <form onSubmit={handleUploadModel}>
            <div className="form-group">
              <label htmlFor="model-file">Archivo .glb *</label>
              <input
                type="file"
                id="model-file"
                accept=".glb"
                onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                required
                disabled={uploadingModel}
              />
            </div>
            <div className="form-group">
              <label htmlFor="model-plant-type">Tipo de Planta (opcional)</label>
              <select
                id="model-plant-type"
                value={modelPlantType}
                onChange={(e) => {
                  setModelPlantType(e.target.value);
                  // Auto-completar nombre del modelo si está vacío
                  if (!modelName && e.target.value) {
                    setModelName(`${e.target.value} Default`);
                  }
                }}
                disabled={uploadingModel}
                className="form-select"
              >
                <option value="">Seleccionar tipo de planta...</option>
                {commonPlantTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="model-name">Nombre del Modelo (opcional)</label>
              <select
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={uploadingModel}
                className="form-select"
              >
                <option value="">Seleccionar nombre del modelo...</option>
                {getModelNameOptions(modelPlantType).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={modelIsDefault}
                  onChange={(e) => setModelIsDefault(e.target.checked)}
                  disabled={uploadingModel}
                />
                Marcar como modelo predeterminado
              </label>
            </div>
            <button type="submit" className="btn-primary" disabled={uploadingModel || !modelFile}>
              {uploadingModel ? 'Subiendo...' : '📤 Subir Modelo'}
            </button>
          </form>
        </div>

        {/* Lista de modelos */}
        <div className="models-list">
          <h3>Modelos Existentes</h3>
          {models.length === 0 ? (
            <div className="empty-state">
              <p>No hay modelos 3D registrados</p>
            </div>
          ) : (
            <div className="models-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo de Planta</th>
                    <th>Nombre</th>
                    <th>URL del Modelo</th>
                    <th>Predeterminado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(model => (
                    <React.Fragment key={model.id}>
                      <tr>
                        <td>{model.id}</td>
                        <td>{model.plant_type}</td>
                        <td>{model.name}</td>
                        <td>
                          <a href={model.model_3d_url} target="_blank" rel="noopener noreferrer" className="link">
                            Ver modelo
                          </a>
                        </td>
                        <td>
                          {model.is_default ? (
                            <span className="status-badge connected">Sí</span>
                          ) : (
                            <span className="unassigned">No</span>
                          )}
                        </td>
                        <td>
                          <button 
                            onClick={() => handleEditModel(model)}
                            className="btn-secondary btn-sm"
                            disabled={updatingModel}
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                      {editingModel?.id === model.id && (
                        <tr>
                          <td colSpan={6}>
                            <div className="model-edit-form">
                              <h4>Editar Modelo {model.id}</h4>
                              <form onSubmit={handleUpdateModel}>
                                <div className="form-group">
                                  <label htmlFor="edit-model-file">Nuevo archivo .glb (opcional)</label>
                                  <input
                                    type="file"
                                    id="edit-model-file"
                                    accept=".glb"
                                    onChange={(e) => setEditModelFile(e.target.files?.[0] || null)}
                                    disabled={updatingModel}
                                  />
                                  <small>Dejar vacío para mantener el archivo actual</small>
                                </div>
                                <div className="form-group">
                                  <label htmlFor="edit-model-plant-type">Tipo de Planta</label>
                                  <select
                                    id="edit-model-plant-type"
                                    value={editModelPlantType}
                                    onChange={(e) => setEditModelPlantType(e.target.value)}
                                    disabled={updatingModel}
                                    className="form-select"
                                  >
                                    {commonPlantTypes.map((type) => (
                                      <option key={type} value={type}>
                                        {type}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label htmlFor="edit-model-name">Nombre del Modelo</label>
                                  <input
                                    type="text"
                                    id="edit-model-name"
                                    value={editModelName}
                                    onChange={(e) => setEditModelName(e.target.value)}
                                    disabled={updatingModel}
                                    className="form-input"
                                  />
                                </div>
                                <div className="form-group">
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={editModelIsDefault}
                                      onChange={(e) => setEditModelIsDefault(e.target.checked)}
                                      disabled={updatingModel}
                                    />
                                    Marcar como modelo predeterminado
                                  </label>
                                </div>
                                <div className="form-actions">
                                  <button type="submit" className="btn-primary" disabled={updatingModel}>
                                    {updatingModel ? 'Actualizando...' : '💾 Guardar Cambios'}
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={handleCancelEdit}
                                    className="btn-secondary"
                                    disabled={updatingModel}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
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
          className={`tab-btn ${activeTab === 'sensors' ? 'active' : ''}`}
          onClick={() => setActiveTab('sensors')}
        >
          📡 Sensores
        </button>
        <button 
          className={`tab-btn ${activeTab === 'plants' ? 'active' : ''}`}
          onClick={() => setActiveTab('plants')}
        >
          🌱 Plantas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'models' ? 'active' : ''}`}
          onClick={() => setActiveTab('models')}
        >
          🎨 Modelos 3D
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="admin-content">
        {loading && !refreshing ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'sensors' && renderSensors()}
            {activeTab === 'plants' && renderPlants()}
            {activeTab === 'models' && renderModels()}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
