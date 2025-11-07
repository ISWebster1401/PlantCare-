import React, { useState } from 'react';
import { authAPI } from '../services/api';
import './EmailVerification.css';

interface Props {
  email: string;
  onVerified?: () => void;
}

const EmailCodeVerification: React.FC<Props> = ({ email, onVerified }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    // Auto-focus next
    const nextInput = document.getElementById(`code-${index + 1}`) as HTMLInputElement | null;
    if (value && nextInput) nextInput.focus();
  };

  const submit = async () => {
    const joined = code.join('');
    if (joined.length !== 4) {
      setMessage('Ingresa los 4 dígitos');
      setStatus('error');
      return;
    }
    try {
      setStatus('loading');
      setMessage('');
      await authAPI.verifyCode(email, joined);
      setStatus('success');
      setMessage('Correo verificado. Ya puedes iniciar sesión.');
      setTimeout(() => {
        onVerified ? onVerified() : (window.location.href = '/');
      }, 1500);
    } catch (e: any) {
      setStatus('error');
      setMessage(e?.response?.data?.detail || 'Código inválido o expirado');
    }
  };

  const resend = async () => {
    try {
      await authAPI.resendCode(email);
      setMessage('Nuevo código enviado');
    } catch (e: any) {
      setMessage(e?.response?.data?.detail || 'No se pudo reenviar');
    }
  };

  return (
    <div className="verification-container">
      <div className="verification-box">
        <div className="verification-icon loading" style={{ marginBottom: 20 }}>
          <div className="spinner"></div>
        </div>
        <h2>Verifica tu correo</h2>
        <p>Hemos enviado un código a {email}. Ingresa los 4 dígitos:</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '18px 0' }}>
          {code.map((c, i) => (
            <input
              key={i}
              id={`code-${i}`}
              value={c}
              onChange={(e) => handleChange(i, e.target.value)}
              maxLength={1}
              inputMode="numeric"
              pattern="[0-9]*"
              style={{
                width: 56,
                height: 56,
                textAlign: 'center',
                fontSize: 24,
                background: 'rgba(15,15,15,0.95)',
                color: '#fff',
                borderRadius: 12,
                border: '1px solid rgba(74, 222, 128, 0.2)'
              }}
            />
          ))}
        </div>

        {message && <p style={{ color: status === 'error' ? '#ef4444' : '#4ade80' }}>{message}</p>}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          <button className="retry-button" onClick={submit} disabled={status === 'loading'}>
            Confirmar código
          </button>
          <button className="retry-button" onClick={resend} style={{ background: '#1f2937' }}>
            Reenviar código
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailCodeVerification;


