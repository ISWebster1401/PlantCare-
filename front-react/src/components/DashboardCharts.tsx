import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import DemoSetup from './DemoSetup';
import './DashboardCharts.css';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  devices: any[];
  summary: {
    total_devices: number;
    active_devices: number;
    total_readings_today: number;
    avg_humidity_all: number;
  };
  chart_data: any[];
  alerts: any[];
  ai_insights: string;
  generated_at: string;
}

interface DeviceReport {
  device_info: {
    id: number;
    name: string;
    plant_type?: string;
    location?: string;
  };
  statistics: {
    current_humidity: number;
    avg_humidity_48h: number;
    min_humidity: number;
    max_humidity: number;
    total_readings: number;
  };
  trend_analysis: {
    trend: string;
    trend_description: string;
  };
  ai_report: string;
  generated_at: string;
}

const DashboardCharts: React.FC = () => {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedDeviceReport, setSelectedDeviceReport] = useState<DeviceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `Error ${response.status}`);
    }

    return response.json();
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/reports/user/dashboard-data');
      setDashboardData(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceReport = async (deviceId: number) => {
    try {
      setLoading(true);
      const report = await apiCall(`/api/reports/device/${deviceId}/ai-report`);
      setSelectedDeviceReport(report);
      setSelectedDevice(deviceId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="dashboard-charts">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando tu dashboard personalizado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-charts">
        <div className="error-container">
          <h3>❌ Error cargando datos</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn-primary">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData || dashboardData.devices.length === 0) {
    return (
      <div className="dashboard-charts">
        <DemoSetup onComplete={loadDashboardData} />
      </div>
    );
  }

  // Preparar datos para el gráfico de líneas (humedad por día)
  const chartData = {
    labels: Array.from(new Set(dashboardData.chart_data.map(d => new Date(d.day).toLocaleDateString()))),
    datasets: dashboardData.devices.map((device, index) => {
      const deviceData = dashboardData.chart_data.filter(d => d.device_id === device.id);
      const colors = [
        'rgba(74, 222, 128, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ];
      
      return {
        label: device.name || `Dispositivo ${device.id}`,
        data: deviceData.map(d => d.avg_humidity),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('0.8', '0.2'),
        fill: false,
        tension: 0.4
      };
    })
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Humedad del Suelo - Últimos 7 Días'
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Humedad (%)'
        }
      }
    },
  };

  return (
    <div className="dashboard-charts">
      {/* Resumen de estadísticas */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-content">
            <h3>{dashboardData.summary.total_devices}</h3>
            <p>Dispositivos Conectados</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{dashboardData.summary.total_readings_today}</h3>
            <p>Lecturas Hoy</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <h3>{dashboardData.summary.avg_humidity_all}%</h3>
            <p>Humedad Promedio</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{dashboardData.alerts.length}</h3>
            <p>Alertas Activas</p>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {dashboardData.alerts.length > 0 && (
        <div className="alerts-section">
          <h3>🚨 Alertas Importantes</h3>
          <div className="alerts-grid">
            {dashboardData.alerts.map((alert, index) => (
              <div key={index} className={`alert-card ${alert.urgency}`}>
                <div className="alert-header">
                  <span className="alert-type">
                    {alert.type === 'critical' ? '🔴' : 
                     alert.type === 'warning' ? '🟡' : '🔵'}
                  </span>
                  <span className="device-name">{alert.device_name}</span>
                </div>
                <p className="alert-message">{alert.message}</p>
                <p className="alert-action"><strong>Acción:</strong> {alert.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico principal */}
      <div className="chart-section">
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Insights de IA */}
      <div className="ai-insights-section">
        <h3>🤖 Insights de IA</h3>
        <div className="ai-insights-content">
          <div className="ai-avatar">🌱</div>
          <div className="ai-text">
            <p>{dashboardData.ai_insights}</p>
            <small>Generado el {new Date(dashboardData.generated_at).toLocaleString()}</small>
          </div>
        </div>
      </div>

      {/* Lista de dispositivos con reportes */}
      <div className="devices-reports">
        <h3>📱 Mis Dispositivos</h3>
        <div className="devices-grid">
          {dashboardData.devices.map(device => (
            <div key={device.id} className="device-card">
              <div className="device-header">
                <h4>{device.name || `Dispositivo ${device.id}`}</h4>
                <span className={`device-status ${device.connected ? 'connected' : 'disconnected'}`}>
                  {device.connected ? '🟢 Conectado' : '🔴 Desconectado'}
                </span>
              </div>
              <div className="device-info">
                <p><strong>Tipo:</strong> {device.plant_type || 'No especificado'}</p>
                <p><strong>Ubicación:</strong> {device.location || 'No especificada'}</p>
                <p><strong>Código:</strong> <code>{device.device_code}</code></p>
              </div>
              <div className="device-actions">
                <button 
                  onClick={() => loadDeviceReport(device.id)}
                  className="btn-primary"
                  disabled={loading && selectedDevice === device.id}
                >
                  {loading && selectedDevice === device.id ? (
                    <>
                      <span className="spinner"></span>
                      Generando...
                    </>
                  ) : (
                    '📊 Ver Reporte IA'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de reporte de dispositivo */}
      {selectedDeviceReport && (
        <div className="report-modal">
          <div className="report-content">
            <div className="report-header">
              <h2>📊 Reporte de {selectedDeviceReport.device_info.name}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedDeviceReport(null)}
              >
                ×
              </button>
            </div>

            <div className="report-stats">
              <div className="stat-item">
                <span className="stat-label">Humedad Actual:</span>
                <span className="stat-value">{selectedDeviceReport.statistics.current_humidity}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Promedio 48h:</span>
                <span className="stat-value">{selectedDeviceReport.statistics.avg_humidity_48h.toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tendencia:</span>
                <span className={`trend-badge ${selectedDeviceReport.trend_analysis.trend}`}>
                  {selectedDeviceReport.trend_analysis.trend === 'subiendo' ? '📈' :
                   selectedDeviceReport.trend_analysis.trend === 'bajando' ? '📉' : '➡️'}
                  {selectedDeviceReport.trend_analysis.trend_description}
                </span>
              </div>
            </div>

            <div className="ai-report">
              <h3>🤖 Análisis de IA</h3>
              <div className="ai-report-content">
                {selectedDeviceReport.ai_report.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div className="report-footer">
              <small>
                Reporte generado el {new Date(selectedDeviceReport.generated_at).toLocaleString()}
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;
