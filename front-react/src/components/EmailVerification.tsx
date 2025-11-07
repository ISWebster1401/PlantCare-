import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmailVerification.css';

const EmailVerification: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    // Prefill email from query param if present
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) setEmail(emailParam);
  }, []);

  const verify = async () => {
    if (!email || code.length !== 4) {
      setStatus('error');
      setMessage('Ingresa tu email y el código de 4 dígitos');
      return;
    }
    try {
      setStatus('verifying');
      const response = await axios.post('http://127.0.0.1:5000/api/auth/verify-code', { email, code });
      setStatus('success');
      setMessage(response.data.message || 'Email verificado.');
      setTimeout(() => window.location.href = '/', 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.detail || 'Código inválido o expirado');
    }
  };

  return (
    <div className="verification-container">
      <div className="verification-box">
        {status === 'idle' && (
          <>
            <div className="verification-icon loading">
              <div className="spinner"></div>
            </div>
            <h2>Verifica tu correo</h2>
            <p>Ingresa el código enviado a tu email</p>
            <div style={{ marginTop: 20 }}>
              <input 
                type="email" 
                placeholder="tu@correo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: 12, width: '100%', marginBottom: 10, borderRadius: 8 }}
              />
              <input 
                type="text" 
                placeholder="Código de 4 dígitos" 
                value={code}
                maxLength={4}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ padding: 12, width: '100%', textAlign: 'center', letterSpacing: 8, fontWeight: 700, borderRadius: 8 }}
              />
              <button className="retry-button" style={{ marginTop: 16 }} onClick={verify}>Verificar</button>
            </div>
          </>
        )}

        {status === 'verifying' && (
          <>
            <div className="verification-icon loading">
              <div className="spinner"></div>
            </div>
            <h2>Verificando...</h2>
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

