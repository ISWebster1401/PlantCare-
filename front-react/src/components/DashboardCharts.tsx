import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { deviceAPI, humedadAPI } from '../services/api';
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
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DeviceCardIcon, ChartIcon, HumidityIcon, AlertIcon, BellIcon, RefreshIcon, LineChartIcon } from './Icons';
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

interface Device {
  id: number;
  device_code: string;
  name: string;
  location?: string;
  plant_type?: string;
  device_type: string;
  connected: boolean;
  last_seen?: string;
  created_at: string;
}

interface DeviceListResponse {
  devices: Device[];
  total: number;
  connected: number;
  active: number;
  offline: number;
}

interface HumedadReading {
  id: number;
  valor: number;
  fecha: string;
  temperatura?: number | null;
  presion?: number | null;
  altitud?: number | null;
  device_id: number;
}

interface DashboardAlert {
  id: string;
  device_id: number;
  device_name: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  action?: string;
}

interface ChartEntry {
  bucket: string;
  device_id: number;
  humidity: number | null;
  temperature: number | null;
  pressure: number | null;
  altitude: number | null;
}

interface DashboardData {
  devices: Device[];
  summary: {
    total_devices: number;
    active_devices: number;
    connected_devices: number;
    offline_devices: number;
    total_readings: number;
    averages: Record<MetricKey, number>;
  };
  chart_data: ChartEntry[];
  alerts: DashboardAlert[];
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

type MetricKey = 'humidity' | 'temperature' | 'pressure' | 'altitude';
type Timeframe = 'minute' | 'hour' | 'day';

const METRIC_INFO: Record<
  MetricKey,
  { label: string; unit: string; min: number; max: number; decimals: number; icon: string }
> = {
  humidity: {
    label: 'Humedad',
    unit: '%',
    min: 0,
    max: 100,
    decimals: 0,
    icon: '💧',
  },
  temperature: {
    label: 'Temperatura',
    unit: '°C',
    min: -10,
    max: 50,
    decimals: 1,
    icon: '🌡️',
  },
  pressure: {
    label: 'Presión',
    unit: 'hPa',
    min: 900,
    max: 1100,
    decimals: 1,
    icon: '🌬️',
  },
  altitude: {
    label: 'Altitud',
    unit: 'm',
    min: 0,
    max: 3000,
    decimals: 0,
    icon: '🏔️',
  },
};

const METRIC_ORDER: MetricKey[] = ['humidity', 'temperature', 'pressure', 'altitude'];
const TIMEFRAME_OPTIONS: { key: Timeframe; label: string }[] = [
  { key: 'minute', label: 'Minuto' },
  { key: 'hour', label: 'Hora' },
  { key: 'day', label: 'Día' },
];

const TIMEFRAME_STEP_MS: Record<Timeframe, number> = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const timeframeFriendlyLabel: Record<Timeframe, string> = {
  minute: 'por minuto',
  hour: 'por hora',
  day: 'por día',
};

const DashboardCharts: React.FC = () => {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedDeviceReport, setSelectedDeviceReport] = useState<DeviceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('line');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('humidity');
  const [timeframe, setTimeframe] = useState<Timeframe>('hour');

  const truncateDateToTimeframe = useCallback((date: Date, frame: Timeframe): Date | null => {
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const step = TIMEFRAME_STEP_MS[frame];
    const truncated = new Date(Math.floor(date.getTime() / step) * step);
    return truncated;
  }, []);

  const formatBucketLabel = useCallback((isoString: string, frame: Timeframe): string => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }

    if (frame === 'day') {
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      });
    }

    if (frame === 'hour') {
      const dayPart = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const hourPart = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return `${dayPart} ${hourPart}`;
    }

    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const deviceResponse: DeviceListResponse = await deviceAPI.getMyDevices();
      const devices = deviceResponse.devices || [];

      if (devices.length === 0) {
        setDashboardData({
          devices: [],
          summary: {
            total_devices: 0,
            active_devices: 0,
            connected_devices: 0,
            offline_devices: 0,
            total_readings: 0,
            averages: {
              humidity: 0,
              temperature: 0,
              pressure: 0,
              altitude: 0,
            },
          },
          chart_data: [],
          alerts: [],
          ai_insights: 'Conecta tu primer sensor para comenzar a recibir métricas y recomendaciones.',
          generated_at: new Date().toISOString(),
        });
        return;
      }

      const readingsByDevice = await Promise.all(
        devices.map(async (device) => {
          try {
            const readings: HumedadReading[] = await humedadAPI.getHumedadData(device.device_code, 200);
            return { device, readings };
          } catch (err) {
            console.error(`Error cargando lecturas para ${device.device_code}`, err);
            return { device, readings: [] as HumedadReading[] };
          }
        })
      );

      const chartEntries: ChartEntry[] = [];
      const totals: Record<MetricKey, { sum: number; count: number }> = {
        humidity: { sum: 0, count: 0 },
        temperature: { sum: 0, count: 0 },
        pressure: { sum: 0, count: 0 },
        altitude: { sum: 0, count: 0 },
      };
      let totalReadings = 0;
      const alerts: DashboardAlert[] = [];

      const calculateAverage = (values: number[], decimals = 2): number | null => {
        if (!values.length) {
          return null;
        }
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return Number(average.toFixed(decimals));
      };

      readingsByDevice.forEach(({ device, readings }) => {
        if (!Array.isArray(readings) || readings.length === 0) {
          return;
        }

        const grouped = readings.reduce<
          Record<string, { humidity: number[]; temperature: number[]; pressure: number[]; altitude: number[] }>
        >((acc, reading) => {
          const date = new Date(reading.fecha);
          const bucketDate = truncateDateToTimeframe(date, timeframe);
          if (!bucketDate) {
            return acc;
          }

          const bucketKey = bucketDate.toISOString();
          if (!acc[bucketKey]) {
            acc[bucketKey] = {
              humidity: [],
              temperature: [],
              pressure: [],
              altitude: [],
            };
          }

          acc[bucketKey].humidity.push(Number(reading.valor));

          if (reading.temperatura !== null && reading.temperatura !== undefined) {
            acc[bucketKey].temperature.push(Number(reading.temperatura));
          }
          if (reading.presion !== null && reading.presion !== undefined) {
            acc[bucketKey].pressure.push(Number(reading.presion));
          }
          if (reading.altitud !== null && reading.altitud !== undefined) {
            acc[bucketKey].altitude.push(Number(reading.altitud));
          }
          return acc;
        }, {});

        readings.forEach((reading) => {
          totalReadings += 1;
          const humidityValue = Number(reading.valor);
          totals.humidity.sum += humidityValue;
          totals.humidity.count += 1;

          if (reading.temperatura !== null && reading.temperatura !== undefined) {
            const tempValue = Number(reading.temperatura);
            totals.temperature.sum += tempValue;
            totals.temperature.count += 1;
          }
          if (reading.presion !== null && reading.presion !== undefined) {
            const pressureValue = Number(reading.presion);
            totals.pressure.sum += pressureValue;
            totals.pressure.count += 1;
          }
          if (reading.altitud !== null && reading.altitud !== undefined) {
            const altitudeValue = Number(reading.altitud);
            totals.altitude.sum += altitudeValue;
            totals.altitude.count += 1;
          }
        });

        Object.entries(grouped).forEach(([bucket, values]) => {
          chartEntries.push({
            bucket,
            device_id: device.id,
            humidity: calculateAverage(values.humidity, 2),
            temperature: calculateAverage(values.temperature, METRIC_INFO.temperature.decimals),
            pressure: calculateAverage(values.pressure, METRIC_INFO.pressure.decimals),
            altitude: calculateAverage(values.altitude, METRIC_INFO.altitude.decimals),
          });
        });

        const latest = readings[0];
        if (latest) {
          if (latest.valor <= 30 || latest.valor >= 75) {
            alerts.push({
              id: `${device.id}-${latest.id}`,
              device_id: device.id,
              device_name: device.name || device.device_code,
              severity: latest.valor <= 30 ? 'low' : 'medium',
              message:
                latest.valor <= 30
                  ? `Humedad baja detectada (${latest.valor.toFixed(1)}%).`
                  : `Humedad alta detectada (${latest.valor.toFixed(1)}%).`,
              action:
                latest.valor <= 30
                  ? 'Considera aumentar el riego o revisar el sistema de irrigación.'
                  : 'Verifica el riego y drenaje para evitar exceso de humedad.',
            });
          }
        }
      });

      chartEntries.sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime());

      const summary = {
        total_devices: deviceResponse.total ?? devices.length,
        active_devices: deviceResponse.active ?? deviceResponse.connected ?? devices.filter((d) => d.connected).length,
        connected_devices: deviceResponse.connected ?? devices.filter((d) => d.connected).length,
        offline_devices: deviceResponse.offline ?? devices.filter((d) => !d.connected).length,
        total_readings: totalReadings,
        averages: {
          humidity:
            totals.humidity.count > 0
              ? Number((totals.humidity.sum / totals.humidity.count).toFixed(METRIC_INFO.humidity.decimals))
              : 0,
          temperature:
            totals.temperature.count > 0
              ? Number((totals.temperature.sum / totals.temperature.count).toFixed(METRIC_INFO.temperature.decimals))
              : 0,
          pressure:
            totals.pressure.count > 0
              ? Number((totals.pressure.sum / totals.pressure.count).toFixed(METRIC_INFO.pressure.decimals))
              : 0,
          altitude:
            totals.altitude.count > 0
              ? Number((totals.altitude.sum / totals.altitude.count).toFixed(METRIC_INFO.altitude.decimals))
              : 0,
        } as Record<MetricKey, number>,
      };

      setDashboardData({
        devices,
        summary,
        chart_data: chartEntries,
        alerts,
        ai_insights:
          totalReadings > 0
            ? 'Tus métricas se están generando en base a datos reales de tus sensores conectados.'
            : 'Tus dispositivos están conectados. Aguardamos lecturas para mostrar tendencias.',
        generated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error cargando el dashboard', err);
      setError(err.response?.data?.detail || err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, [timeframe, truncateDateToTimeframe]);

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

  // Preparar datos para el gráfico de líneas
  const chartLabelsIso = Array.from(
    new Set((dashboardData.chart_data || []).map((d) => d.bucket))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const chartLabels = chartLabelsIso.map((iso) => formatBucketLabel(iso, timeframe));

  const colorPalette = [
    'rgba(74, 222, 128, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(139, 92, 246, 0.8)',
  ];

  const metricInfo = METRIC_INFO[selectedMetric];
  const chartUnitSuffix =
    metricInfo.unit ? (metricInfo.unit === '%' ? metricInfo.unit : ` ${metricInfo.unit}`) : '';

  const formatMetricValue = (
    value: number | null | undefined,
    metric: MetricKey,
    options: { withUnit?: boolean; decimals?: number } = {}
  ): string => {
    const { withUnit = true, decimals } = options;
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '--';
    }
    const info = METRIC_INFO[metric];
    const precision = decimals ?? info.decimals;
    const formatted = Number(value).toFixed(precision);
    if (!withUnit || !info.unit) {
      return formatted;
    }
    const suffix = info.unit === '%' ? info.unit : ` ${info.unit}`;
    return `${formatted}${suffix}`;
  };

  const chartData = {
    labels: chartLabels,
    datasets: (dashboardData.devices || []).map((device, index) => {
      const deviceData = (dashboardData.chart_data || []).filter(
        (entry) => entry.device_id === device.id
      );
      const valuesByDay = deviceData.reduce<Record<string, number | null>>((acc, entry) => {
        const value = entry[selectedMetric];
        acc[entry.bucket] = value !== null && value !== undefined ? Number(value) : null;
        return acc;
      }, {});

      return {
        label: device.name || `Dispositivo ${device.id}`,
        data: chartLabelsIso.map((day) =>
          valuesByDay[day] !== undefined ? valuesByDay[day] : null
        ),
        borderColor: colorPalette[index % colorPalette.length],
        backgroundColor: colorPalette[index % colorPalette.length].replace('0.8', '0.2'),
        spanGaps: true,
        fill: false,
        tension: 0.4,
      };
    }),
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Tendencia de ${metricInfo.label} (${timeframeFriendlyLabel[timeframe]})`,
      },
    },
    scales: {
      y: {
        min: metricInfo.min,
        max: metricInfo.max,
        title: {
          display: true,
          text: `${metricInfo.label}${chartUnitSuffix}`,
        },
        ticks: {
          callback: (value: string | number) =>
            `${value}${metricInfo.unit ? (metricInfo.unit === '%' ? metricInfo.unit : ` ${metricInfo.unit}`) : ''}`,
        },
      },
    },
  };

  const selectedAverageValue =
    dashboardData.summary?.averages?.[selectedMetric] ?? null;
  const selectedAverageDisplay = formatMetricValue(selectedAverageValue, selectedMetric);
  const connectedDevices = dashboardData.summary?.connected_devices ?? 0;
  const totalDevices = dashboardData.summary?.total_devices ?? 0;
  const totalReadings = dashboardData.summary?.total_readings ?? 0;
  const alertsCount = (dashboardData.alerts || []).length;

  // Valor para gauge: promedio de la última fecha disponible del metric seleccionado
  const lastDate = (dashboardData?.chart_data || []).reduce<string | null>((acc, entry) => {
    const day = entry.bucket;
    if (!day) return acc;
    if (!acc) return day;
    return new Date(day) > new Date(acc) ? day : acc;
  }, null);

  const gaugeDisplayValue = (() => {
    if (!lastDate) {
      return selectedAverageValue;
    }
    const items = (dashboardData?.chart_data || []).filter((entry) => entry.bucket === lastDate);
    const values = items
      .map((entry) => entry[selectedMetric])
      .filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value));

    if (values.length === 0) {
      return selectedAverageValue;
    }

    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Number(avg.toFixed(metricInfo.decimals));
  })();

  const metricRange = Math.max(metricInfo.max - metricInfo.min, 1);
  const gaugeRatio =
    gaugeDisplayValue !== null && gaugeDisplayValue !== undefined
      ? (gaugeDisplayValue - metricInfo.min) / metricRange
      : 0;
  const gaugeClamped = Math.max(0, Math.min(1, gaugeRatio));
  const gaugeValuePercent = gaugeClamped * 100;
  const gaugeDisplayText = formatMetricValue(gaugeDisplayValue, selectedMetric);
  const gaugeTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="dashboard-charts">
      {/* Resumen de estadísticas */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <DeviceCardIcon />
          </div>
          <div className="stat-content">
            <h3>{connectedDevices}</h3>
            <p>Dispositivos Conectados</p>
            {totalDevices > 0 && (
              <small className="stat-subtext">de {totalDevices} totales</small>
            )}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <ChartIcon />
          </div>
          <div className="stat-content">
            <h3>{totalReadings}</h3>
            <p>Lecturas Registradas</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <HumidityIcon />
          </div>
          <div className="stat-content">
            <h3>{selectedAverageDisplay}</h3>
            <p>Promedio {metricInfo.label}</p>
            <small className="stat-subtext">Métrica seleccionada</small>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <AlertIcon />
          </div>
          <div className="stat-content">
            <h3>{alertsCount}</h3>
            <p>Alertas Activas</p>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {(dashboardData.alerts || []).length > 0 && (
        <div className="alerts-section">
          <h3>
            <span style={{marginRight: 8, display: 'inline-flex', color: '#ef4444'}}>
              <BellIcon className="nav-icon" />
            </span>
            Alertas Importantes
          </h3>
          <div className="alerts-grid">
            {(dashboardData.alerts || []).map((alert) => (
              <div key={alert.id} className={`alert-card ${alert.severity}`}>
                <div className="alert-header">
                  <span className="alert-type">
                    {alert.severity === 'high' ? '🔴' :
                     alert.severity === 'medium' ? '🟡' : '🔵'}
                  </span>
                  <span className="device-name">{alert.device_name}</span>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.action && (
                  <p className="alert-action">
                    <strong>Acción:</strong> {alert.action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selector de métricas */}
      <div className="metric-tabs">
        {METRIC_ORDER.map((metric) => {
          const info = METRIC_INFO[metric];
          return (
            <button
              key={metric}
              className={`metric-tab ${selectedMetric === metric ? 'active' : ''}`}
              onClick={() => setSelectedMetric(metric)}
            >
              <span className="metric-icon">{info.icon}</span>
              {info.label}
            </button>
          );
        })}
      </div>

      <div className="timeframe-tabs">
        {TIMEFRAME_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`timeframe-tab ${timeframe === option.key ? 'active' : ''}`}
            onClick={() => setTimeframe(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Gráfico principal */}
      <div className="chart-section">
        <h3 className="chart-title">
          {viewMode === 'line'
            ? `Tendencia de ${metricInfo.label} (${timeframeFriendlyLabel[timeframe]})`
            : `Indicador de ${metricInfo.label}`}
        </h3>
        {viewMode === 'line' ? (
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="gauge-container">
            <svg viewBox="0 0 220 140" width="100%" style={{maxWidth: 500}}>
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8"/>
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Arco del medidor */}
              <path 
                d="M20,120 A90,90 0 0,1 200,120" 
                fill="none" 
                stroke="url(#gaugeGradient)" 
                strokeWidth="16" 
                strokeLinecap="round"
                filter="url(#glow)"
              />
              {/* Marcas de escala */}
              {gaugeTicks.map((ratio, i) => {
                const angle = (-180 + ratio * 180) * Math.PI / 180;
                const cx = 110, cy = 120, r = 85;
                const x1 = cx + (r-10)*Math.cos(angle);
                const y1 = cy + (r-10)*Math.sin(angle);
                const x2 = cx + r*Math.cos(angle);
                const y2 = cy + r*Math.sin(angle);
                const tickValue =
                  metricInfo.min + ratio * (metricInfo.max - metricInfo.min);
                const tickLabel = formatMetricValue(tickValue, selectedMetric);
                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2"/>
                    <text 
                      x={x1 - 5} 
                      y={y1 + 5} 
                      textAnchor="middle" 
                      fill="#cbd5e1" 
                      fontSize="11"
                      fontWeight="500"
                    >
                      {tickLabel}
                    </text>
                  </g>
                );
              })}
              {/* Aguja */}
              {(() => {
                const angle = (-180 + (gaugeValuePercent / 100) * 180) * Math.PI / 180;
                const cx = 110, cy = 120, r = 80;
                const x = cx + r*Math.cos(angle);
                const y = cy + r*Math.sin(angle);
                return (
                  <g>
                    <line 
                      x1={cx} 
                      y1={cy} 
                      x2={x} 
                      y2={y} 
                      stroke="#ffffff" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                      filter="url(#glow)"
                    />
                    <circle cx={cx} cy={cy} r="8" fill="#ffffff" filter="url(#glow)"/>
                    <circle cx={cx} cy={cy} r="4" fill="#0f172a"/>
                  </g>
                );
              })()}
              {/* Valor central */}
              <text 
                x="110" 
                y="90" 
                textAnchor="middle" 
                fill="#ffffff" 
                fontSize="32" 
                fontWeight="700"
                filter="url(#glow)"
              >
                {gaugeDisplayText}
              </text>
              <text 
                x="110" 
                y="110" 
                textAnchor="middle" 
                fill="#94a3b8" 
                fontSize="14"
                fontWeight="500"
              >
                {metricInfo.label}
              </text>
            </svg>
          </div>
        )}
      </div>
      
      {/* Botón de cambio de vista */}
      <div className="charts-toolbar">
        <button className="btn-secondary" onClick={() => setViewMode(viewMode==='line'?'gauge':'line')}>
          {viewMode==='line' ? (
            <>
              <RefreshIcon className="nav-icon" />
              Cambiar a Indicador
            </>
          ) : (
            <>
              <LineChartIcon className="nav-icon" />
              Cambiar a Tendencia
            </>
          )}
        </button>
      </div>

      {/* Insights de IA */}
      <div className="ai-insights-section">
        <h3>Insights de IA</h3>
        <div className="ai-insights-content">
          <div className="ai-avatar">
            <img src="/Plantcareblanco-removebg-preview.png" alt="PlantCare AI" style={{width: '40px', height: '40px'}} />
          </div>
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
