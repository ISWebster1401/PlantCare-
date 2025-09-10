import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRegistration } from '../types/User';
import './RegisterForm.css';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<UserRegistration>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    region: '',
    vineyard_name: '',
    hectares: 0,
    grape_type: '',
    password: '',
    confirm_password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hectares' ? parseFloat(value) || 0 : value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.first_name || !formData.last_name || !formData.email || 
        !formData.phone || !formData.region || !formData.vineyard_name || 
        !formData.hectares || !formData.grape_type || !formData.password || 
        !formData.confirm_password) {
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

    // Validar fortaleza de contraseña
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
      setSuccess('¡Registro exitoso! Te contactaremos pronto para la instalación.');
      
      // Limpiar formulario
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        region: '',
        vineyard_name: '',
        hectares: 0,
        grape_type: '',
        password: '',
        confirm_password: '',
      });

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-form-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h3>Registra tu Viña</h3>
        <p className="form-subtitle">Completa la información para comenzar</p>

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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">Nombre</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="Tu nombre"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="last_name">Apellido</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Tu apellido"
              autoComplete="family-name"
              required
            />
          </div>
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
            <label htmlFor="phone">Teléfono</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="region">Región</label>
            <select
              id="region"
              name="region"
              value={formData.region}
              onChange={handleInputChange}
              autoComplete="country"
              required
            >
              <option value="">Selecciona tu región</option>
              <option value="Región Metropolitana">Región Metropolitana</option>
              <option value="Valparaíso">Valparaíso</option>
              <option value="O'Higgins">O'Higgins</option>
              <option value="Maule">Maule</option>
              <option value="Biobío">Biobío</option>
              <option value="Araucanía">Araucanía</option>
              <option value="Coquimbo">Coquimbo</option>
              <option value="Atacama">Atacama</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="vineyard_name">Nombre de la Viña</label>
          <input
            type="text"
            id="vineyard_name"
            name="vineyard_name"
            value={formData.vineyard_name}
            onChange={handleInputChange}
            placeholder="Viña Los Robles"
            autoComplete="organization"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hectares">Hectáreas</label>
            <input
              type="number"
              id="hectares"
              name="hectares"
              value={formData.hectares || ''}
              onChange={handleInputChange}
              placeholder="50"
              min="1"
              step="0.1"
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="grape_type">Tipo de Uva</label>
            <select
              id="grape_type"
              name="grape_type"
              value={formData.grape_type}
              onChange={handleInputChange}
              required
            >
              <option value="">Selecciona el tipo</option>
              <option value="Cabernet Sauvignon">Cabernet Sauvignon</option>
              <option value="Merlot">Merlot</option>
              <option value="Carmenère">Carmenère</option>
              <option value="Chardonnay">Chardonnay</option>
              <option value="Sauvignon Blanc">Sauvignon Blanc</option>
              <option value="Pinot Noir">Pinot Noir</option>
              <option value="Syrah">Syrah</option>
              <option value="Cultivo Mixto">Cultivo Mixto</option>
            </select>
          </div>
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
              Debe contener mayúscula, minúscula, número y carácter especial
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="confirm_password">Confirmar Contraseña</label>
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
          className="register-button"
          disabled={isLoading}
        >
          {isLoading ? 'Procesando...' : 'Registrar Viña'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
