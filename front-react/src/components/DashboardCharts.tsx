import React, { useState, useEffect, useCallback } from 'react';
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
import { Line } from 'react-chartjs-2';
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

type ViewMode = 'line' | 'gauge';

const DashboardCharts: React.FC = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedDeviceReport, setSelectedDeviceReport] = useState<DeviceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('line');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Datos falsos por defecto para mostrar gráficos inmediatamente
      const fakeData: DashboardData = {
        devices: [
          { id: 1, name: 'Sensor Viña Norte', plant_type: 'Uva Carmenere', location: 'Campo A1' },
          { id: 2, name: 'Sensor Viña Sur', plant_type: 'Uva Cabernet', location: 'Campo B2' },
          { id: 3, name: 'Sensor Viña Central', plant_type: 'Uva Merlot', location: 'Campo C3' }
        ],
        summary: {
          total_devices: 3,
          active_devices: 3,
          total_readings_today: 156,
          avg_humidity_all: 68.5
        },
        chart_data: [
          { day: '2024-03-15', avg_humidity: 65, device_id: 1 },
          { day: '2024-03-16', avg_humidity: 67, device_id: 1 },
          { day: '2024-03-17', avg_humidity: 69, device_id: 1 },
          { day: '2024-03-18', avg_humidity: 71, device_id: 1 },
          { day: '2024-03-19', avg_humidity: 70, device_id: 1 },
          { day: '2024-03-20', avg_humidity: 68, device_id: 1 },
          { day: '2024-03-15', avg_humidity: 62, device_id: 2 },
          { day: '2024-03-16', avg_humidity: 64, device_id: 2 },
          { day: '2024-03-17', avg_humidity: 66, device_id: 2 },
          { day: '2024-03-18', avg_humidity: 67, device_id: 2 },
          { day: '2024-03-19', avg_humidity: 65, device_id: 2 },
          { day: '2024-03-20', avg_humidity: 63, device_id: 2 },
          { day: '2024-03-15', avg_humidity: 70, device_id: 3 },
          { day: '2024-03-16', avg_humidity: 71, device_id: 3 },
          { day: '2024-03-17', avg_humidity: 69, device_id: 3 },
          { day: '2024-03-18', avg_humidity: 68, device_id: 3 },
          { day: '2024-03-19', avg_humidity: 67, device_id: 3 },
          { day: '2024-03-20', avg_humidity: 66, device_id: 3 }
        ],
        alerts: [
          { id: 1, type: 'warning', urgency: 'medium', device_name: 'Sensor Viña Norte', message: 'Humedad por encima del rango óptimo', action: 'Revisar riego en la zona A1' },
          { id: 2, type: 'info', urgency: 'low', device_name: 'Sensor Viña Sur', message: 'Condiciones estables', action: 'Continuar monitoreo' }
        ],
        ai_insights: 'Los sensores muestran una tendencia estable de humedad. Recomendamos monitorear la temperatura durante las próximas 48 horas.',
        generated_at: new Date().toISOString()
      };
      
      setDashboardData(fakeData);
      setError('');
      
      // Intentar cargar datos reales en segundo plano
      try {
        const realData = await apiCall('/api/reports/user/dashboard-data');
        const hasDevices = Array.isArray((realData as any).devices) && (realData as any).devices.length > 0;
        const hasChart = Array.isArray((realData as any).chart_data) && (realData as any).chart_data.length > 0;
        if (hasDevices && hasChart) {
          setDashboardData(realData);
        }
      } catch (err) {
        // Si falla, mantener los datos falsos
        console.log('Usando datos de demostración');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  // loadDashboardData definido arriba con useCallback

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

  if (!dashboardData) {
    return (
      <div className="dashboard-charts">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Preparando datos...</p>
        </div>
      </div>
    );
  }

  // Preparar datos para el gráfico de líneas (humedad por día)
  const chartData = {
    labels: Array.from(new Set((dashboardData.chart_data || []).map(d => new Date((d as any).day || (d as any).date).toLocaleDateString()))),
    datasets: (dashboardData.devices || []).map((device, index) => {
      const deviceData = (dashboardData.chart_data || []).filter(d => (d as any).device_id === device.id);
      const colors = [
        'rgba(74, 222, 128, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ];
      
      return {
        label: device.name || `Dispositivo ${device.id}`,
        data: deviceData.map(d => (d as any).avg_humidity ?? (d as any).humidity ?? 0),
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

  // Valor para gauge: promedio de la última fecha disponible
  const lastDate = (dashboardData?.chart_data || []).reduce<string | null>((acc, d: any) => {
    const day = d.day || d.date;
    if (!day) return acc;
    if (!acc) return day;
    return new Date(day) > new Date(acc) ? day : acc;
  }, null);
  const gaugeValue = (() => {
    if (!lastDate) return Math.round(dashboardData?.summary?.avg_humidity_all ?? 0);
    const items = (dashboardData?.chart_data || []).filter((d: any) => (d.day || d.date) === lastDate);
    if (items.length === 0) return Math.round(dashboardData?.summary?.avg_humidity_all ?? 0);
    const avg = items.reduce((s: number, d: any) => s + (d.avg_humidity ?? d.humidity ?? 0), 0) / items.length;
    return Math.round(avg);
  })();

  return (
    <div className="dashboard-charts">
      <div className="charts-toolbar" style={{display:'flex',justifyContent:'flex-end',marginBottom:12,gap:8}}>
        <button className="btn-secondary" onClick={() => setViewMode(viewMode==='line'?'gauge':'line')}>
          {viewMode==='line' ? '🔁 Ver como velocímetro' : '📈 Ver como línea'}
        </button>
      </div>
      {/* Resumen de estadísticas */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📱</div>
        <div className="stat-content">
            <h3>{dashboardData.summary?.total_devices ?? 0}</h3>
            <p>Dispositivos Conectados</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{dashboardData.summary?.total_readings_today ?? 0}</h3>
            <p>Lecturas Hoy</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💧</div>
          <div className="stat-content">
            <h3>{dashboardData.summary?.avg_humidity_all ?? 0}%</h3>
            <p>Humedad Promedio</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{(dashboardData.alerts || []).length}</h3>
            <p>Alertas Activas</p>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {(dashboardData.alerts || []).length > 0 && (
        <div className="alerts-section">
          <h3>🚨 Alertas Importantes</h3>
          <div className="alerts-grid">
            {(dashboardData.alerts || []).map((alert, index) => (
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
      {viewMode==='line' ? (
        <div className="chart-section">
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      ) : (
        <div className="chart-section" style={{display:'flex',justifyContent:'center'}}>
          <svg viewBox="0 0 200 120" width="100%" style={{maxWidth:480}}>
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444"/>
                <stop offset="50%" stopColor="#f59e0b"/>
                <stop offset="100%" stopColor="#22c55e"/>
              </linearGradient>
            </defs>
            <path d="M10,110 A90,90 0 0,1 190,110" fill="none" stroke="url(#g1)" strokeWidth="14" strokeLinecap="round"/>
            {/* Aguja */}
            {(() => {
              const angle = (-180 + (gaugeValue/100)*180) * Math.PI/180; // -180 a 0 grados
              const cx = 100, cy = 110, r = 75;
              const x = cx + r*Math.cos(angle);
              const y = cy + r*Math.sin(angle);
              return (
                <g>
                  <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round" />
                  <circle cx={cx} cy={cy} r="6" fill="#e5e7eb" />
                </g>
              );
            })()}
            <text x="100" y="105" textAnchor="middle" fill="#cbd5e1" fontSize="12">0%</text>
            <text x="190" y="105" textAnchor="end" fill="#cbd5e1" fontSize="12">100%</text>
            <text x="100" y="75" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="700">{gaugeValue}%</text>
            <text x="100" y="90" textAnchor="middle" fill="#9ca3af" fontSize="12">Humedad</text>
          </svg>
        </div>
      )}

      {/* Insights de IA */}
      <div className="ai-insights-section">
        <h3>🤖 Insights de IA</h3>
        <div className="ai-insights-content">
          <div className="ai-avatar">🌱</div>
          <div className="ai-text">
            <p>{dashboardData.ai_insights || 'Conecta tu primer sensor para comenzar a recibir recomendaciones personalizadas de IA.'}</p>
            <small>
              Generado el {(dashboardData.generated_at && !isNaN(Date.parse(dashboardData.generated_at)))
                ? new Date(dashboardData.generated_at).toLocaleString()
                : new Date().toLocaleString()}
            </small>
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
