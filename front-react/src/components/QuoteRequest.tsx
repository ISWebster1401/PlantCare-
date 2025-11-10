import React, { useState } from 'react';
import './QuoteRequest.css';
import { quotesAPI } from '../services/api';
import { CheckCircleIcon, PhoneIcon, AnalyticsIcon, RocketIcon, TargetIcon } from './Icons';

interface QuoteRequestData {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  project_type: string;
  sensor_quantity: number;
  coverage_area: string;
  location: string;
  budget_range: string;
  desired_date: string;
  description: string;
  has_existing_infrastructure: boolean | null;
  requires_installation: boolean | null;
  requires_training: boolean | null;
}

interface QuoteRequestProps {
  onClose?: () => void;
}

const QuoteRequest: React.FC<QuoteRequestProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<QuoteRequestData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    project_type: 'commercial',
    sensor_quantity: 1,
    coverage_area: '',
    location: '',
    budget_range: 'range_5000_10000',
    desired_date: '',
    description: '',
    has_existing_infrastructure: null,
    requires_installation: null,
    requires_training: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referenceId, setReferenceId] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const projectTypes = [
    { value: 'residential', label: 'Residencial' },
    { value: 'commercial', label: 'Comercial' },
    { value: 'agricultural', label: 'Agrícola' },
    { value: 'research', label: 'Investigación' },
    { value: 'educational', label: 'Educativo' },
    { value: 'other', label: 'Otro' }
  ];

  const budgetRanges = [
    { value: 'under_1000', label: 'Menos de $1,000 USD' },
    { value: 'range_1000_5000', label: '$1,000 - $5,000 USD' },
    { value: 'range_5000_10000', label: '$5,000 - $10,000 USD' },
    { value: 'range_10000_25000', label: '$10,000 - $25,000 USD' },
    { value: 'range_25000_50000', label: '$25,000 - $50,000 USD' },
    { value: 'over_50000', label: 'Más de $50,000 USD' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleBooleanChange = (field: keyof QuoteRequestData, value: boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorDetails('');

    try {
      const result = await quotesAPI.createQuote(formData);
      setSubmitStatus('success');
      setReferenceId(result.reference_id || '');
    } catch (error: any) {
      console.error('Error enviando cotización:', error);
      const detail = error?.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const messages = detail
          .map((item: any) => `${item.loc?.join('.')}: ${item.msg}`)
          .join('\n');
        setErrorDetails(messages);
      } else if (typeof detail === 'string') {
        setErrorDetails(detail);
      } else {
        setErrorDetails('Inténtalo nuevamente en unos minutos.');
      }
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="quote-form-container">
        <div className="quote-form success-message">
          <div className="success-icon">
            <CheckCircleIcon />
          </div>
          <h2>¡Solicitud Enviada!</h2>
          <p>Tu solicitud de cotización ha sido enviada exitosamente.</p>
          <div className="reference-info">
            <strong>Número de referencia:</strong> {referenceId}
          </div>
          <p className="response-time">
            Nuestro equipo de ventas te contactará en un plazo máximo de <strong>12 horas</strong>.
          </p>
          <div className="next-steps">
            <h4>Próximos pasos:</h4>
            <ul>
              <li>
                <PhoneIcon className="step-icon" />
                <span>Te llamaremos para discutir los detalles</span>
              </li>
              <li>
                <AnalyticsIcon className="step-icon" />
                <span>Evaluaremos tus necesidades específicas</span>
              </li>
              <li>
                <TargetIcon className="step-icon" />
                <span>Te enviaremos una propuesta personalizada</span>
              </li>
              <li>
                <RocketIcon className="step-icon" />
                <span>Coordinaremos la implementación y demostraciones</span>
              </li>
            </ul>
          </div>
          <div className="success-actions">
            <button 
              className="btn-primary"
              onClick={() => {
                setSubmitStatus('idle');
                if (onClose) onClose();
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`quote-form-container ${onClose ? 'modal' : 'view'}`}>
      <div className="quote-form">
        <div className="form-header">
          <h2>Solicitar Cotización</h2>
          <p>Completa el formulario y nuestro equipo te contactará con una propuesta personalizada</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="quote-form-fields">
          {/* Información de Contacto */}
          <div className="section">
            <h3>Información de Contacto</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nombre Completo *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="tu@empresa.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Teléfono *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">Empresa *</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre de tu empresa"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="position">Cargo en la Empresa</label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="Ej: Gerente de Operaciones, CTO, etc."
              />
            </div>
          </div>

          {/* Detalles del Proyecto */}
          <div className="section">
            <h3>Detalles del Proyecto</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="project_type">Tipo de Proyecto *</label>
                <select
                  id="project_type"
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleInputChange}
                  required
                >
                  {projectTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="sensor_quantity">Cantidad de Sensores *</label>
                <input
                  type="number"
                  id="sensor_quantity"
                  name="sensor_quantity"
                  value={formData.sensor_quantity}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="10000"
                  placeholder="Ej: 50"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="coverage_area">Área a Cubrir</label>
                <input
                  type="text"
                  id="coverage_area"
                  name="coverage_area"
                  value={formData.coverage_area}
                  onChange={handleInputChange}
                  placeholder="Ej: 10 hectáreas, 500 m², etc."
                />
              </div>
              <div className="form-group">
                <label htmlFor="location">Ubicación</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Ej: Región Metropolitana, Valparaíso, etc."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="budget_range">Presupuesto Estimado *</label>
                <select
                  id="budget_range"
                  name="budget_range"
                  value={formData.budget_range}
                  onChange={handleInputChange}
                  required
                >
                  {budgetRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="desired_date">Fecha Deseada de Implementación</label>
              <input
                type="text"
                id="desired_date"
                name="desired_date"
                value={formData.desired_date}
                onChange={handleInputChange}
                placeholder="Ej: Q2 2024, Marzo 2024, Lo antes posible"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción del Proyecto *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Describe tu proyecto en detalle: objetivos, requisitos específicos, condiciones del entorno, etc."
              />
            </div>
          </div>

          {/* Información Adicional */}
          <div className="section">
            <h3>Información Adicional</h3>
            
            <div className="boolean-group">
              <label>¿Tienes infraestructura tecnológica existente?</label>
              <div className="boolean-options">
                <button
                  type="button"
                  className={`boolean-btn ${formData.has_existing_infrastructure === true ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('has_existing_infrastructure', true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.has_existing_infrastructure === false ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('has_existing_infrastructure', false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.has_existing_infrastructure === null ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('has_existing_infrastructure', null)}
                >
                  No estoy seguro
                </button>
              </div>
            </div>

            <div className="boolean-group">
              <label>¿Requieres servicio de instalación?</label>
              <div className="boolean-options">
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_installation === true ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_installation', true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_installation === false ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_installation', false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_installation === null ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_installation', null)}
                >
                  No estoy seguro
                </button>
              </div>
            </div>

            <div className="boolean-group">
              <label>¿Requieres capacitación para tu equipo?</label>
              <div className="boolean-options">
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_training === true ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_training', true)}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_training === false ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_training', false)}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`boolean-btn ${formData.requires_training === null ? 'active' : ''}`}
                  onClick={() => handleBooleanChange('requires_training', null)}
                >
                  No estoy seguro
                </button>
              </div>
            </div>
          </div>

          {submitStatus === 'error' && (
            <div className="error-message">
              <span>
                Hubo un error enviando tu solicitud. {errorDetails && <><br />{errorDetails}</>}
              </span>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Enviando...
                </>
              ) : (
                'Solicitar Cotización'
              )}
            </button>
            {onClose && (
              <button 
                type="button" 
                className="btn-secondary"
                onClick={onClose}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteRequest;
