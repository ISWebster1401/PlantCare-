import React, { useState } from 'react';
import './ContactForm.css';
import {
  ChatIcon,
  MailIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon
} from './Icons';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  inquiry_type: string;
  subject: string;
  message: string;
}

interface ContactFormProps {
  onClose?: () => void;
  initialType?: string;
}

const ContactForm: React.FC<ContactFormProps> = ({ onClose, initialType = 'general' }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    inquiry_type: initialType,
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referenceId, setReferenceId] = useState<string>('');

  const inquiryTypes = [
    { value: 'general', label: 'Consulta General' },
    { value: 'technical_support', label: 'Soporte Técnico' },
    { value: 'sales', label: 'Ventas' },
    { value: 'quote_request', label: 'Solicitar Cotización' },
    { value: 'partnership', label: 'Alianzas' },
    { value: 'billing', label: 'Facturación' },
    { value: 'feedback', label: 'Comentarios' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setReferenceId(result.reference_id);
        // Limpiar formulario
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          inquiry_type: 'general',
          subject: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="contact-form-container">
        <div className="contact-form success-message">
          <div className="success-icon">
            <CheckCircleIcon />
          </div>
          <h2>¡Mensaje Enviado!</h2>
          <p>Tu mensaje ha sido enviado exitosamente.</p>
          <div className="reference-info">
            <strong>Número de referencia:</strong> {referenceId}
          </div>
          <p className="response-time">
            Te responderemos en un plazo máximo de <strong>24 horas</strong>.
          </p>
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
            <button 
              className="btn-secondary"
              onClick={() => setSubmitStatus('idle')}
            >
              Enviar Otro Mensaje
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-form-container">
      <div className="contact-form">
        <div className="form-header">
          <div className="form-title">
            <span className="form-title-icon">
              <ChatIcon />
            </span>
            <h2>Contáctanos</h2>
          </div>
          <p>Estamos aquí para ayudarte. Envíanos tu consulta y te responderemos pronto.</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="contact-form-fields">
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
                placeholder="tu@email.com"
              />
            </div>
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
              />
            </div>
            <div className="form-group">
              <label htmlFor="company">Empresa/Organización</label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                placeholder="Nombre de tu empresa"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="inquiry_type">Tipo de Consulta *</label>
            <select
              id="inquiry_type"
              name="inquiry_type"
              value={formData.inquiry_type}
              onChange={handleInputChange}
              required
            >
              {inquiryTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Asunto *</label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              placeholder="Describe brevemente tu consulta"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Mensaje *</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              required
              rows={6}
              placeholder="Describe tu consulta en detalle. Mientras más información proporciones, mejor podremos ayudarte."
            />
          </div>

          {submitStatus === 'error' && (
            <div className="error-message">
              <AlertIcon className="error-icon" />
              Hubo un error enviando tu mensaje. Por favor intenta nuevamente.
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
                <>
                  <MailIcon className="button-icon" /> Enviar Mensaje
                </>
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

        <div className="contact-info">
          <h4>Otras formas de contacto:</h4>
          <div className="contact-methods">
            <div className="contact-method">
              <span className="icon">
                <MailIcon />
              </span>
              <span>contacto@plantcare.com</span>
            </div>
            <div className="contact-method">
              <span className="icon">
                <PhoneIcon />
              </span>
              <span>+56 9 1234 5678</span>
            </div>
            <div className="contact-method">
              <span className="icon">
                <ClockIcon />
              </span>
              <span>Lun-Vie 9:00-18:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
