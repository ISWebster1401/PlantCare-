import React, { useState, useEffect } from 'react';
import { humedadAPI, deviceAPI, aiAPI } from '../services/api';
import './HumedadView.css';

interface HumedadData {
  id: number;
  valor: number;
  fecha: string;
  device_id: number;
  device_name?: string;
}

interface Device {
  id: number;
  name: string;
  device_code: string;
}

interface AIResponse {
  recomendacion: string;
  contexto?: string;
  timestamp?: string;
}

const HumedadView: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [humedadData, setHumedadData] = useState<HumedadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');

  useEffect(() => {
    loadDevices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadHumedadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      const response = await deviceAPI.getMyDevices();
      setDevices(response.devices);
      if (response.devices.length > 0 && !selectedDevice) {
        setSelectedDevice(response.devices[0].id);
      }
    } catch (error: any) {
      setError('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const loadHumedadData = async () => {
    if (!selectedDevice) return;
    
    try {
      setLoading(true);
      const data = await humedadAPI.getHumedadData(selectedDevice, 50);
      setHumedadData(data);
    } catch (error: any) {
      setError('Error al cargar datos de humedad');
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendation = async () => {
    if (!selectedDevice) return;
    
    try {
      setLoadingAI(true);
      const response = await aiAPI.analyzeDevice(selectedDevice);
      setAiRecommendation({
        recomendacion: response.response,
        contexto: `Análisis para ${response.device_info?.name} - ${response.device_info?.plant_type}`,
        timestamp: response.timestamp
      });
    } catch (error: any) {
      setError('Error al obtener recomendaciones de IA');
    } finally {
      setLoadingAI(false);
    }
  };

  const askAIQuestion = async () => {
    if (!aiQuestion.trim()) return;
    
    try {
      setLoadingAI(true);
      
      let response;
      if (selectedDevice) {
        // Pregunta específica sobre el dispositivo
        response = await aiAPI.analyzeDevice(selectedDevice, aiQuestion);
      } else {
        // Pregunta general
        response = await aiAPI.askGeneral(aiQuestion);
      }
      
      setAiRecommendation({
        recomendacion: response.response,
        contexto: selectedDevice 
          ? `Consulta sobre ${response.device_info?.name}` 
          : 'Consulta general',
        timestamp: response.timestamp
      });
      setAiQuestion('');
    } catch (error: any) {
      setError('Error al consultar a la IA');
    } finally {
      setLoadingAI(false);
    }
  };

  const getHumidityLevel = (valor: number) => {
    if (valor < 30) return { level: 'low', text: 'Baja', color: '#ef4444' };
    if (valor < 60) return { level: 'medium', text: 'Media', color: '#f59e0b' };
    return { level: 'high', text: 'Alta', color: '#22c55e' };
  };

  const getLatestReading = () => {
    if (humedadData.length === 0) return null;
    return humedadData[0];
  };

  const getAverageHumidity = () => {
    if (humedadData.length === 0) return 0;
    const sum = humedadData.reduce((acc, item) => acc + item.valor, 0);
    return Math.round(sum / humedadData.length);
  };

  if (loading && devices.length === 0) {
    return (
      <div className="humedad-view">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="humedad-view">
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No hay dispositivos disponibles</h3>
          <p>Conecta un dispositivo primero para ver los datos de humedad</p>
        </div>
      </div>
    );
  }

  const latestReading = getLatestReading();
  const averageHumidity = getAverageHumidity();
  const humidityLevel = latestReading ? getHumidityLevel(latestReading.valor) : null;

  return (
    <div className="humedad-view">
      <div className="view-header">
        <h1>Datos de Humedad</h1>
        <div className="device-selector">
          <label>Dispositivo:</label>
          <select 
            value={selectedDevice || ''} 
            onChange={(e) => setSelectedDevice(Number(e.target.value))}
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.device_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Resumen actual */}
      <div className="summary-cards">
        <div className="summary-card current">
          <div className="card-icon">💧</div>
          <div className="card-content">
            <div className="card-title">Humedad Actual</div>
            <div className="card-value">
              {latestReading ? `${latestReading.valor}%` : 'N/A'}
            </div>
            {humidityLevel && (
              <div className="card-status" style={{ color: humidityLevel.color }}>
                {humidityLevel.text}
              </div>
            )}
          </div>
        </div>

        <div className="summary-card average">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-title">Promedio</div>
            <div className="card-value">{averageHumidity}%</div>
            <div className="card-status">Últimas {humedadData.length} lecturas</div>
          </div>
        </div>

        <div className="summary-card readings">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <div className="card-title">Total Lecturas</div>
            <div className="card-value">{humedadData.length}</div>
            <div className="card-status">Registros disponibles</div>
          </div>
        </div>

        <div className="summary-card last-update">
          <div className="card-icon">⏰</div>
          <div className="card-content">
            <div className="card-title">Última Lectura</div>
            <div className="card-value">
              {latestReading 
                ? new Date(latestReading.fecha).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'N/A'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico visual simple */}
      <div className="chart-section">
        <h2>Historial de Humedad</h2>
        <div className="simple-chart">
          {humedadData.length > 0 ? (
            <div className="chart-bars">
              {humedadData.slice(0, 20).reverse().map((item, index) => {
                const height = Math.max(item.valor, 5); // Mínimo 5% para visibilidad
                const level = getHumidityLevel(item.valor);
                return (
                  <div key={item.id} className="chart-bar-container">
                    <div 
                      className="chart-bar"
                      style={{ 
                        height: `${height}%`, 
                        backgroundColor: level.color,
                        opacity: 0.7 + (index * 0.015) // Más opaco para lecturas más recientes
                      }}
                      title={`${item.valor}% - ${new Date(item.fecha).toLocaleDateString('es-ES')}`}
                    />
                    <div className="chart-label">
                      {item.valor}%
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-data">
              <p>No hay datos disponibles para mostrar</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de datos */}
      <div className="data-table-section">
        <h2>Registros Detallados</h2>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando datos...</p>
          </div>
        ) : humedadData.length > 0 ? (
          <div className="data-table">
            <div className="table-header">
              <div className="table-cell">Fecha y Hora</div>
              <div className="table-cell">Humedad</div>
              <div className="table-cell">Estado</div>
            </div>
            {humedadData.map((item) => {
              const level = getHumidityLevel(item.valor);
              return (
                <div key={item.id} className="table-row">
                  <div className="table-cell">
                    {new Date(item.fecha).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="table-cell">
                    <span className="humidity-value">{item.valor}%</span>
                  </div>
                  <div className="table-cell">
                    <span 
                      className="humidity-status"
                      style={{ color: level.color }}
                    >
                      {level.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-data">
            <p>No hay datos disponibles para este dispositivo</p>
          </div>
        )}
      </div>

      {/* Sección de IA */}
      <div className="ai-section">
        <h2>🤖 Asistente IA</h2>
        
        <div className="ai-actions">
          <button 
            className="ai-btn recommend-btn"
            onClick={getAIRecommendation}
            disabled={loadingAI}
          >
            {loadingAI ? 'Analizando...' : 'Obtener Recomendaciones'}
          </button>
          
          <div className="ai-question">
            <input
              type="text"
              placeholder={selectedDevice 
                ? "Pregunta sobre este dispositivo (ej: ¿Por qué la humedad está baja?)" 
                : "Pregunta general sobre plantas (ej: ¿Cómo cuidar una rosa?)"
              }
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askAIQuestion()}
            />
            <button 
              className="ai-btn ask-btn"
              onClick={askAIQuestion}
              disabled={loadingAI || !aiQuestion.trim()}
            >
              {selectedDevice ? 'Analizar Dispositivo' : 'Preguntar'}
            </button>
          </div>
        </div>

        {aiRecommendation && (
          <div className="ai-response">
            <div className="ai-response-header">
              <span className="ai-icon">🤖</span>
              <span>Recomendación de PlantCare IA</span>
            </div>
            <div className="ai-response-content">
              {aiRecommendation.recomendacion}
            </div>
            {aiRecommendation.contexto && (
              <div className="ai-response-context">
                <strong>Contexto:</strong> {aiRecommendation.contexto}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HumedadView;
