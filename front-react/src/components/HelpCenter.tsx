import React, { useState, useEffect } from 'react';
import ContactForm from './ContactForm';
import QuoteRequest from './QuoteRequest';
import './HelpCenter.css';
import api from '../services/api';
import {
  HelpIcon,
  ChatIcon,
  QuoteIcon,
  StatusIcon,
  PhoneIcon,
  MailIcon,
  AnalyticsIcon,
  IdeaIcon,
  TargetIcon,
  RocketIcon,
  QuestionIcon
} from './Icons';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

interface HelpCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  article_count: number;
}

interface HelpCenterProps {
  onClose?: () => void;
  onRequestQuote?: () => void;
}

const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  {
    id: 1,
    question: '¿Cómo conecto mi sensor PlantCare?',
    answer:
      "Ve a 'Dispositivos' > 'Agregar Dispositivo' e ingresa el código que viene en la caja. Sigue las instrucciones para completar la configuración.",
    category: 'configuracion',
    helpful_count: 45,
  },
  {
    id: 2,
    question: '¿Con qué frecuencia debo regar mis plantas?',
    answer:
      'Depende de la planta, la época del año y las condiciones. PlantCare analiza estos factores y te recomienda cuándo regar.',
    category: 'cuidado',
    helpful_count: 38,
  },
  {
    id: 3,
    question: '¿Qué significa cada nivel de humedad?',
    answer:
      '0-20% (muy seco), 21-40% (seco), 41-60% (óptimo), 61-80% (húmedo) y 81-100% (muy húmedo, revisar drenaje).',
    category: 'interpretacion',
    helpful_count: 52,
  },
  {
    id: 4,
    question: '¿Puedo usar PlantCare en exteriores?',
    answer:
      'Sí, los sensores son IP65 y funcionan entre -10°C y 60°C. Para proyectos grandes contáctanos para planes empresariales.',
    category: 'producto',
    helpful_count: 29,
  },
  {
    id: 5,
    question: '¿Cómo funciona la IA de recomendaciones?',
    answer:
      'La IA analiza datos históricos, clima, tipo de planta y buenas prácticas para generar sugerencias cada vez más precisas.',
    category: 'ia',
    helpful_count: 41,
  },
  {
    id: 6,
    question: '¿Qué hago si mi sensor no envía datos?',
    answer:
      'Verifica WiFi, batería y que el código esté registrado. Si persiste usa "Soporte Técnico" para contactarnos.',
    category: 'problemas',
    helpful_count: 33,
  },
];

const DEFAULT_CATEGORIES: HelpCategory[] = [
  {
    id: 1,
    name: 'Primeros Pasos',
    description: 'Configuración inicial y conexión de sensores',
    icon: 'rocket',
    article_count: 8,
  },
  {
    id: 2,
    name: 'Cuidado de Plantas',
    description: 'Guías para el cuidado óptimo de tus plantas',
    icon: 'idea',
    article_count: 12,
  },
  {
    id: 3,
    name: 'Interpretación de Datos',
    description: 'Cómo entender las lecturas y gráficos',
    icon: 'analytics',
    article_count: 6,
  },
  {
    id: 4,
    name: 'Solución de Problemas',
    description: 'Resolución de problemas comunes',
    icon: 'status',
    article_count: 10,
  },
  {
    id: 5,
    name: 'Inteligencia Artificial',
    description: 'Cómo funciona y usar las recomendaciones de IA',
    icon: 'target',
    article_count: 5,
  },
  {
    id: 6,
    name: 'Cuenta y Facturación',
    description: 'Gestión de cuenta, planes y pagos',
    icon: 'mail',
    article_count: 7,
  },
];

const categoryIcons: Record<string, React.ReactNode> = {
  rocket: <RocketIcon />,
  '🚀': <RocketIcon />,
  idea: <IdeaIcon />,
  '🌱': <IdeaIcon />,
  analytics: <AnalyticsIcon />,
  '📊': <AnalyticsIcon />,
  status: <StatusIcon />,
  '🔧': <StatusIcon />,
  target: <TargetIcon />,
  '🤖': <TargetIcon />,
  mail: <MailIcon />,
  '💳': <MailIcon />,
};

const HelpCenter: React.FC<HelpCenterProps> = ({ onClose, onRequestQuote }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'quote' | 'status'>('faq');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    loadFAQ();
    loadCategories();
    loadSystemStatus();
  }, []);

  const loadFAQ = async () => {
    try {
      const { data } = await api.get<FAQItem[]>('/contact/faq');
      setFaqItems(data.length ? data : DEFAULT_FAQ_ITEMS);
    } catch (error) {
      console.error('Error cargando FAQ:', error);
      setFaqItems(DEFAULT_FAQ_ITEMS);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get<HelpCategory[]>('/contact/help-categories');
      setCategories(data.length ? data : DEFAULT_CATEGORIES);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setCategories(DEFAULT_CATEGORIES);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const { data } = await api.get('/contact/system-status');
      setSystemStatus(data);
    } catch (error) {
      console.error('Error cargando estado del sistema:', error);
    }
  };

  const filteredFAQ = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  if (showContactForm) {
    return <ContactForm onClose={() => setShowContactForm(false)} />;
  }

  if (showQuoteForm) {
    return <QuoteRequest onClose={() => setShowQuoteForm(false)} />;
  }

  const handleQuoteRedirect = () => {
    if (onRequestQuote) {
      if (onClose) {
        onClose();
      }
      onRequestQuote();
    } else {
      setShowQuoteForm(true);
    }
  };

  return (
    <div className="help-center-container">
      <div className="help-center">
        <div className="help-header">
          <div className="help-title">
            <span className="help-icon">
              <HelpIcon />
            </span>
            <h2>Centro de Ayuda</h2>
          </div>
          <p>Encuentra respuestas rápidas o contáctanos para obtener soporte personalizado</p>
          {onClose && (
            <button className="close-btn" onClick={onClose}>×</button>
          )}
        </div>

        <div className="help-tabs">
          <button 
            className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => setActiveTab('faq')}
          >
            <QuestionIcon className="tab-icon" /> Preguntas Frecuentes
          </button>
          <button 
            className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => setActiveTab('contact')}
          >
            <ChatIcon className="tab-icon" /> Contacto
          </button>
          <button 
            className={`tab-btn ${activeTab === 'quote' ? 'active' : ''}`}
            onClick={() => setActiveTab('quote')}
          >
            <QuoteIcon className="tab-icon" /> Cotizaciones
          </button>
          <button 
            className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <StatusIcon className="tab-icon" /> Estado del Sistema
          </button>
        </div>

        <div className="help-content">
          {activeTab === 'faq' && (
            <div className="faq-section">
              <div className="faq-controls">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Buscar en preguntas frecuentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="category-filter">
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    <option value="configuracion">Configuración</option>
                    <option value="cuidado">Cuidado de Plantas</option>
                    <option value="interpretacion">Interpretación</option>
                    <option value="producto">Producto</option>
                    <option value="ia">Inteligencia Artificial</option>
                    <option value="problemas">Problemas</option>
                  </select>
                </div>
              </div>

              <div className="categories-grid">
                {categories.map(category => (
                  <div key={category.id} className="category-card">
                    <div className="category-icon">
                      {categoryIcons[category.icon] ?? <HelpIcon />}
                    </div>
                    <h4>{category.name}</h4>
                    <p>{category.description}</p>
                    <span className="article-count">{category.article_count} artículos</span>
                  </div>
                ))}
              </div>

              <div className="faq-list">
                {filteredFAQ.length === 0 ? (
                  <div className="no-results">
                    <p>No se encontraron preguntas que coincidan con tu búsqueda.</p>
                    <button 
                      className="btn-primary"
                      onClick={() => setShowContactForm(true)}
                    >
                      Hacer una pregunta
                    </button>
                  </div>
                ) : (
                  filteredFAQ.map(item => (
                    <div key={item.id} className="faq-item">
                      <button 
                        className="faq-question"
                        onClick={() => toggleFAQ(item.id)}
                      >
                        <span>{item.question}</span>
                        <span className={`faq-arrow ${expandedFAQ === item.id ? 'expanded' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {expandedFAQ === item.id && (
                        <div className="faq-answer">
                          <p>{item.answer}</p>
                          <div className="faq-meta">
                            <span className="helpful-count">
                              👍 {item.helpful_count} personas encontraron esto útil
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="contact-section">
              <div className="contact-options">
                <div className="contact-option">
                  <div className="option-icon">
                    <ChatIcon />
                  </div>
                  <h3>Soporte General</h3>
                  <p>¿Tienes una pregunta o necesitas ayuda? Envíanos un mensaje y te responderemos pronto.</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowContactForm(true)}
                  >
                    Enviar Mensaje
                  </button>
                </div>

                <div className="contact-option">
                  <div className="option-icon">
                    <StatusIcon />
                  </div>
                  <h3>Soporte Técnico</h3>
                  <p>¿Problemas con tu sensor o la plataforma? Nuestro equipo técnico te ayudará.</p>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setShowContactForm(true);
                    }}
                  >
                    Soporte Técnico
                  </button>
                </div>

                <div className="contact-option">
                  <div className="option-icon">
                    <PhoneIcon />
                  </div>
                  <h3>Llamada Directa</h3>
                  <p>Para consultas urgentes, puedes llamarnos directamente.</p>
                  <div className="phone-info">
                    <strong>+56 9 1234 5678</strong>
                    <br />
                    <small>Lun-Vie 9:00-18:00</small>
                  </div>
                </div>

                <div className="contact-option">
                  <div className="option-icon">
                    <MailIcon />
                  </div>
                  <h3>Email Directo</h3>
                  <p>También puedes escribirnos directamente a nuestro email.</p>
                  <div className="email-info">
                    <strong>contacto@plantcare.com</strong>
                    <br />
                    <small>Respuesta en 24 horas</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quote' && (
            <div className="quote-section">
              <div className="quote-intro">
                <h3>
                  <QuoteIcon className="section-icon" /> Solicita una Cotización Personalizada
                </h3>
                <p>¿Interesado en implementar PlantCare en tu empresa o proyecto? Obtén una cotización personalizada.</p>
              </div>

              <div className="quote-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon"><AnalyticsIcon /></span>
                  <div>
                    <h4>Análisis Personalizado</h4>
                    <p>Evaluamos tus necesidades específicas</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon"><IdeaIcon /></span>
                  <div>
                    <h4>Solución a Medida</h4>
                    <p>Diseñamos la mejor solución para tu caso</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon"><TargetIcon /></span>
                  <div>
                    <h4>Precios Competitivos</h4>
                    <p>Ofertas especiales para proyectos grandes</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon"><RocketIcon /></span>
                  <div>
                    <h4>Implementación Rápida</h4>
                    <p>Te ayudamos con la instalación y configuración</p>
                  </div>
                </div>
              </div>

              <div className="quote-cta">
                <button 
                  className="btn-primary large"
                  onClick={handleQuoteRedirect}
                >
                  <QuoteIcon className="cta-icon" /> Ir a Cotizaciones
                </button>
                <p className="cta-note">
                  Sin compromiso • Respuesta en 12 horas • Consulta gratuita
                </p>
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="status-section">
              {systemStatus ? (
                <>
                  <div className="status-overview">
                    <div className={`status-indicator ${systemStatus.status}`}>
                      <span className="status-dot"></span>
                      <span className="status-text">
                        {systemStatus.status === 'operational' ? 'Todos los sistemas operativos' : 'Problemas detectados'}
                      </span>
                    </div>
                    <div className="last-updated">
                      Última actualización: {new Date(systemStatus.last_updated).toLocaleString()}
                    </div>
                  </div>

                  <div className="services-status">
                    <h4>Estado de los Servicios</h4>
                    <div className="services-grid">
                      {Object.entries(systemStatus.services).map(([service, data]: [string, any]) => (
                        <div key={service} className="service-item">
                          <div className="service-header">
                            <span className={`service-status ${data.status}`}></span>
                            <span className="service-name">
                              {service === 'api' ? 'API Principal' :
                               service === 'database' ? 'Base de Datos' :
                               service === 'ai_service' ? 'Servicio de IA' :
                               service === 'email_service' ? 'Servicio de Email' :
                               service === 'sensor_network' ? 'Red de Sensores' : service}
                            </span>
                          </div>
                          <div className="service-metrics">
                            {data.response_time && (
                              <span className="metric">⚡ {data.response_time}</span>
                            )}
                            {data.uptime && (
                              <span className="metric">📈 {data.uptime}</span>
                            )}
                            {data.active_sensors && (
                              <span className="metric">📡 {data.active_sensors} sensores activos</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {systemStatus.announcements && systemStatus.announcements.length > 0 && (
                    <div className="announcements">
                      <h4>Anuncios del Sistema</h4>
                      {systemStatus.announcements.map((announcement: any, index: number) => (
                        <div key={index} className={`announcement ${announcement.type}`}>
                          <div className="announcement-header">
                            <span className="announcement-title">{announcement.title}</span>
                            <span className="announcement-date">{announcement.date}</span>
                          </div>
                          <p className="announcement-message">{announcement.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="loading-status">
                  <div className="spinner"></div>
                  <p>Cargando estado del sistema...</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="help-footer">
          <p>¿No encontraste lo que buscabas?</p>
          <div className="footer-actions">
            <button 
              className="btn-secondary"
              onClick={() => setShowContactForm(true)}
            >
              <ChatIcon className="footer-icon" /> Contáctanos
            </button>
            <button 
              className="btn-primary"
              onClick={handleQuoteRedirect}
            >
              <QuoteIcon className="footer-icon" /> Solicitar Cotización
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
