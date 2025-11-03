import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmailVerification.css';

interface EmailVerificationProps {
  token: string;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({ token }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:5000/api/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(response.data.message || 'Email verificado correctamente. Ya puedes iniciar sesión.');
        
        // Redirigir después de 3 segundos
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.detail || 'Error al verificar el email');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="verification-container">
      <div className="verification-box">
        {status === 'loading' && (
          <>
            <div className="verification-icon loading">
              <div className="spinner"></div>
            </div>
            <h2>Verificando tu email...</h2>
            <p>Por favor espera un momento</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verification-icon success">
              ✓
            </div>
            <h2>¡Email verificado!</h2>
            <p>{message}</p>
            <p className="redirect-message">Redirigiendo al inicio...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verification-icon error">
              ✕
            </div>
            <h2>Error en la verificación</h2>
            <p>{message}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.href = '/'}
            >
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;

