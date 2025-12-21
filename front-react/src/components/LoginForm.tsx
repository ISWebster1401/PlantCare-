import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './LoginForm.css';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onClose: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onClose }) => {
  const { login, loginWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember_me: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData);
      onClose(); // Cerrar modal después del login exitoso
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setGoogleError('Google Sign-In no está configurado');
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      if (googleInitializedRef.current) {
        window.google.accounts.id.cancel();
        googleButtonRef.current.innerHTML = '';
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (!response?.credential) {
            setGoogleError('No se recibió la credencial de Google');
            return;
          }
          setGoogleLoading(true);
          setGoogleError('');
          try {
            await loginWithGoogle(response.credential);
            onClose();
          } catch (err: any) {
            setGoogleError(err.message || 'No se pudo iniciar sesión con Google');
          } finally {
            setGoogleLoading(false);
          }
        },
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        logo_alignment: 'left',
        locale: 'es-419',
        width: 320,
      });

      googleInitializedRef.current = true;
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      const scriptTag = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      const handleLoad = () => initializeGoogle();
      if (scriptTag) {
        scriptTag.addEventListener('load', handleLoad);
        return () => {
          scriptTag.removeEventListener('load', handleLoad);
        };
      }
    }

    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [loginWithGoogle, onClose]);

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="auth-header">
          <img src="/Plantcare_solo-removebg-preview.png" alt="PlantCare" style={{width: '80px', height: '80px', marginBottom: '12px'}} />
          <h2>Iniciar Sesión</h2>
          <p>Accede a tu cuenta de PlantCare</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Tu contraseña"
            />
          </div>

          <div className="form-group remember-me">
            <label className="remember-me-label">
              <input
                type="checkbox"
                name="remember_me"
                checked={formData.remember_me}
                onChange={(e) => setFormData(prev => ({ ...prev, remember_me: e.target.checked }))}
              />
              <span>Recordarme (sesión de 1 mes)</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <span>o continúa con</span>
          <span />
        </div>

        <div className="google-login-section">
          <div
            ref={googleButtonRef}
            className={`google-button-container ${googleLoading ? 'is-loading' : ''}`}
          />
          {googleLoading && <div className="google-loading">Conectando con Google...</div>}
          {googleError && <div className="google-error">{googleError}</div>}
        </div>

        <div className="auth-switch">
          <p>
            ¿No tienes cuenta?{' '}
            <button 
              type="button" 
              className="switch-btn"
              onClick={onSwitchToRegister}
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
