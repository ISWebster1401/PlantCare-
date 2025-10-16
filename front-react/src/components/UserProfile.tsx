import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserProfile.css';

interface UserProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  region?: string;
  vineyard_name?: string;
  hectares?: number;
  grape_type?: string;
}

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

interface UserProfileProps {
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'account'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [profileData, setProfileData] = useState<UserProfileData>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    region: user?.region || '',
    vineyard_name: user?.vineyard_name || '',
    hectares: user?.hectares || undefined,
    grape_type: user?.grape_type || ''
  });

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    current_password: '',
    new_password: '',
    confirm_new_password: ''
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Filtrar campos vacíos
      const updateData = Object.fromEntries(
        Object.entries(profileData).filter(([_, value]) => value !== '' && value !== undefined)
      );

      await apiCall('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_new_password) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
      setLoading(false);
      return;
    }

    try {
      await apiCall('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordData)
      });

      setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_new_password: ''
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await apiCall('/api/auth/me', {
        method: 'DELETE'
      });

      setMessage({ type: 'success', text: 'Cuenta eliminada exitosamente' });
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile">
        <div className="profile-header">
          <h2>👤 Mi Perfil</h2>
          <p>Gestiona tu información personal y configuración de cuenta</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <div className="profile-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            📝 Información Personal
          </button>
          <button 
            className={`tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            🔒 Cambiar Contraseña
          </button>
          <button 
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            ⚙️ Configuración de Cuenta
          </button>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}

        <div className="profile-content">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-section">
                <h3>Información Básica</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name">Nombre *</label>
                    <input
                      type="text"
                      id="first_name"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Apellido *</label>
                    <input
                      type="text"
                      id="last_name"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Teléfono</label>
                    <input
                      type="tel"
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="region">Región</label>
                    <input
                      type="text"
                      id="region"
                      value={profileData.region}
                      onChange={(e) => setProfileData({...profileData, region: e.target.value})}
                      placeholder="Ej: Región Metropolitana"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Información del Viñedo</h3>
                
                <div className="form-group">
                  <label htmlFor="vineyard_name">Nombre del Viñedo</label>
                  <input
                    type="text"
                    id="vineyard_name"
                    value={profileData.vineyard_name}
                    onChange={(e) => setProfileData({...profileData, vineyard_name: e.target.value})}
                    placeholder="Ej: Viña Santa Rita"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="hectares">Hectáreas</label>
                    <input
                      type="number"
                      id="hectares"
                      step="0.01"
                      min="0"
                      value={profileData.hectares || ''}
                      onChange={(e) => setProfileData({...profileData, hectares: e.target.value ? parseFloat(e.target.value) : undefined})}
                      placeholder="Ej: 15.5"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="grape_type">Tipo de Uva</label>
                    <input
                      type="text"
                      id="grape_type"
                      value={profileData.grape_type}
                      onChange={(e) => setProfileData({...profileData, grape_type: e.target.value})}
                      placeholder="Ej: Cabernet Sauvignon"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Actualizando...
                    </>
                  ) : (
                    '💾 Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-section">
                <h3>Cambiar Contraseña</h3>
                <p className="form-description">
                  Para tu seguridad, necesitamos verificar tu contraseña actual antes de cambiarla.
                </p>

                <div className="form-group">
                  <label htmlFor="current_password">Contraseña Actual *</label>
                  <input
                    type="password"
                    id="current_password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="new_password">Nueva Contraseña *</label>
                  <input
                    type="password"
                    id="new_password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    required
                    minLength={8}
                  />
                  <small className="form-help">
                    Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas, números y símbolos
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_new_password">Confirmar Nueva Contraseña *</label>
                  <input
                    type="password"
                    id="confirm_new_password"
                    value={passwordData.confirm_new_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_new_password: e.target.value})}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Cambiando...
                    </>
                  ) : (
                    '🔒 Cambiar Contraseña'
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'account' && (
            <div className="account-settings">
              <div className="form-section">
                <h3>Información de la Cuenta</h3>
                <div className="account-info">
                  <div className="info-item">
                    <span className="info-label">Rol:</span>
                    <span className={`role-badge ${user?.role_id === 2 ? 'admin' : 'user'}`}>
                      {user?.role_id === 2 ? '👑 Administrador' : '🌱 Usuario'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Miembro desde:</span>
                    <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Último acceso:</span>
                    <span>{user?.last_login ? new Date(user.last_login).toLocaleString() : 'Primer acceso'}</span>
                  </div>
                </div>
              </div>

              <div className="form-section danger-zone">
                <h3>⚠️ Zona de Peligro</h3>
                <p className="danger-description">
                  Las acciones en esta sección son irreversibles. Procede con precaución.
                </p>

                <div className="danger-actions">
                  <button 
                    className="btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                  >
                    🗑️ Eliminar Cuenta
                  </button>
                </div>

                {showDeleteConfirm && (
                  <div className="delete-confirm">
                    <div className="confirm-content">
                      <h4>⚠️ ¿Estás seguro?</h4>
                      <p>
                        Esta acción eliminará permanentemente tu cuenta y todos los datos asociados.
                        No podrás recuperar esta información.
                      </p>
                      <div className="confirm-actions">
                        <button 
                          className="btn-danger"
                          onClick={handleDeleteAccount}
                          disabled={loading}
                        >
                          {loading ? 'Eliminando...' : 'Sí, Eliminar Cuenta'}
                        </button>
                        <button 
                          className="btn-secondary"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="profile-footer">
          <div className="footer-actions">
            <button 
              className="btn-secondary"
              onClick={onClose}
            >
              Cerrar
            </button>
            <button 
              className="btn-danger"
              onClick={logout}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
