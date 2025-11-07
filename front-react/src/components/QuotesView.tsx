import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { quotesAPI } from '../services/api';
import QuoteRequest from './QuoteRequest';
import './QuotesView.css';

interface Quote {
  id: number;
  reference_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  vineyard_name?: string;
  num_devices: number;
  budget_range?: string;
  status: string;
  created_at: string;
  quoted_price?: number;
  quoted_at?: string;
}

const QuotesView: React.FC = () => {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    quoted: 0, 
    accepted: 0 
  });

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const response = await quotesAPI.getMyQuotes();
      setQuotes(response.quotes || []);
      setStats({
        total: response.total || 0,
        pending: response.pending || 0,
        quoted: response.quoted || 0,
        accepted: response.accepted || 0
      });
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      pending: { label: 'Pendiente', className: 'status-pending' },
      contacted: { label: 'Contactado', className: 'status-contacted' },
      quoted: { label: 'Cotizado', className: 'status-quoted' },
      accepted: { label: 'Aceptada', className: 'status-accepted' },
      rejected: { label: 'Rechazada', className: 'status-rejected' },
      cancelled: { label: 'Cancelada', className: 'status-cancelled' }
    };
    const statusInfo = statusMap[status] || { label: status, className: 'status-pending' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="quotes-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando cotizaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quotes-view">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadQuotes}>Reintentar</button>
        </div>
      </div>
    );
  }

  // Si no hay cotizaciones o se solicita mostrar el formulario, mostrar formulario
  if (quotes.length === 0 || showQuoteForm) {
    return (
      <div className="quotes-view">
        <div className="quotes-header">
          <div className="header-content">
            <h1>Solicitar Cotización</h1>
            {quotes.length > 0 && (
              <button 
                className="btn-secondary"
                onClick={() => setShowQuoteForm(false)}
              >
                Ver Mis Cotizaciones
              </button>
            )}
          </div>
        </div>
        <QuoteRequest onClose={quotes.length > 0 ? () => {
          setShowQuoteForm(false);
          loadQuotes();
        } : undefined} />
      </div>
    );
  }

  return (
    <div className="quotes-view">
      <div className="quotes-header">
        <div className="header-content">
          <h1>Mis Cotizaciones</h1>
          <button 
            className="btn-primary"
            onClick={() => setShowQuoteForm(true)}
          >
            Nueva Cotización
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="quotes-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pendientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.quoted}</div>
          <div className="stat-label">Cotizadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.accepted}</div>
          <div className="stat-label">Aceptadas</div>
        </div>
      </div>

      {/* Lista de cotizaciones */}
      <div className="quotes-list">
        <div className="quotes-grid">
          {quotes.map(quote => (
            <div key={quote.id} className="quote-card">
              <div className="quote-card-header">
                <div>
                  <h3>{quote.company || quote.vineyard_name || 'Sin nombre'}</h3>
                  <p className="quote-reference">Ref: {quote.reference_id}</p>
                </div>
                {getStatusBadge(quote.status)}
              </div>
              <div className="quote-card-body">
                <div className="quote-info">
                  <div className="info-row">
                    <span className="info-label">Contacto:</span>
                    <span>{quote.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span>{quote.email}</span>
                  </div>
                  {quote.phone && (
                    <div className="info-row">
                      <span className="info-label">Teléfono:</span>
                      <span>{quote.phone}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Dispositivos:</span>
                    <span>{quote.num_devices}</span>
                  </div>
                  {quote.quoted_price && (
                    <div className="info-row">
                      <span className="info-label">Precio Cotizado:</span>
                      <span className="quote-price">{formatPrice(quote.quoted_price)}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Fecha:</span>
                    <span>{formatDate(quote.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuotesView;

