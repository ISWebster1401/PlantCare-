import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserProfile.css';

interface UserProfileData {
  full_name: string;
  email: string;
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
    full_name: user?.full_name || '',
    email: user?.email || '',
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
      await apiCall('http://127.0.0.1:8000/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });

      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
      
      // Recargar datos del usuario
      window.location.reload();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al actualizar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await apiCall('http://127.0.0.1:8000/api/auth/change-password', {
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
      setMessage({ type: 'error', text: error.message || 'Error al cambiar la contraseña' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setMessage(null);

    try {
      await apiCall('http://127.0.0.1:8000/api/auth/me', {
        method: 'DELETE'
      });

      setMessage({ type: 'success', text: 'Cuenta eliminada exitosamente' });
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al eliminar la cuenta' });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="user-profile-modal">
      <div className="user-profile-content">
        <div className="profile-header">
          <h2>Mi Perfil 🌱</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="profile-tabs">
          <button
            className={activeTab === 'profile' ? 'active' : ''}
            onClick={() => setActiveTab('profile')}
          >
            👤 Perfil
          </button>
          <button
            className={activeTab === 'password' ? 'active' : ''}
            onClick={() => setActiveTab('password')}
          >
            🔒 Contraseña
          </button>
          <button
            className={activeTab === 'account' ? 'active' : ''}
            onClick={() => setActiveTab('account')}
          >
            ⚙️ Cuenta
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate} className="profile-form">
              <div className="form-section">
                <h3>Información Básica</h3>
                
                <div className="form-group">
                  <label htmlFor="full_name">Nombre Completo *</label>
                  <input
                    type="text"
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    required
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    required
                    placeholder="tu@correo.com"
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
                    <span className={`role-badge ${user?.role === 'admin' ? 'admin' : 'user'}`}>
                      {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Miembro desde:</span>
                    <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
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
      </div>
    </div>
  );
};

export default UserProfile;
