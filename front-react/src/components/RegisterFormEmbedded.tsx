import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRegistration } from '../types/User';
import './RegisterFormEmbedded.css';

const RegisterFormEmbedded: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<UserRegistration>({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
      setError('Todos los campos son obligatorios');
      return false;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(formData.password)) {
      setError('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
      setSuccess('¡Registro exitoso! Verifica tu correo para activar tu cuenta. 🌱');
      
      // Limpiar formulario
      setFormData({
        full_name: '',
        email: '',
        password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      setError(error.message || 'Error al registrar. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-form-container">
      <h2 className="register-form-title">
        Crea tu Cuenta <span className="plant-icon">🌱</span>
      </h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label htmlFor="full_name">Nombre Completo</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Tu nombre completo"
            autoComplete="name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo Electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="tu@correo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
            <small className="password-help">
              Mayúscula, minúscula, número y carácter especial
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirmar</label>
            <input
              type="password"
              id="confirm_password"
              name="confirm_password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>
    </div>
  );
};

export default RegisterFormEmbedded;
