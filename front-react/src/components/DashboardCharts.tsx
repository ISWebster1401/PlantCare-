import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { plantsAPI, sensorsAPI } from '../services/api';
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
import { ChartIcon, HumidityIcon, AlertIcon, BellIcon, RefreshIcon, LineChartIcon } from './Icons';
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

interface Plant {
  id: number;
  plant_name: string;
  plant_type: string;
  character_image_url: string;
  character_mood: string;
  health_status: string;
  sensor_id: number | null;
  optimal_humidity_min: number | null;
  optimal_humidity_max: number | null;
  optimal_temp_min: number | null;
  optimal_temp_max: number | null;
}

interface SensorReading {
  id: number;
  sensor_id: number;
  humidity: number;
  temperature: number | null;
  reading_time: string;
}

interface ChartEntry {
  bucket: string;
  plant_id: number;
  humidity: number | null;
  temperature: number | null;
}

type Timeframe = 'hour' | 'day' | 'week';

const TIMEFRAME_OPTIONS: { key: Timeframe; label: string }[] = [
  { key: 'hour', label: 'Última Hora' },
  { key: 'day', label: 'Último Día' },
  { key: 'week', label: 'Última Semana' },
];

const DashboardCharts: React.FC = () => {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('day');
  const [selectedMetric, setSelectedMetric] = useState<'humidity' | 'temperature'>('humidity');

  useEffect(() => {
    loadPlants();
  }, []);

  useEffect(() => {
    if (selectedPlant) {
      loadPlantData();
    }
  }, [selectedPlant, timeframe]);

  const loadPlants = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await plantsAPI.getMyPlants();
      setPlants(data);
      
      // Seleccionar primera planta por defecto si hay plantas
      if (data.length > 0 && !selectedPlant) {
        setSelectedPlant(data[0]);
      }
    } catch (err: any) {
      console.error('Error cargando plantas:', err);
      setError('Error cargando tus plantas');
    } finally {
      setLoading(false);
    }
  };

  const loadPlantData = async () => {
    if (!selectedPlant || !selectedPlant.sensor_id) {
      setChartData([]);
      return;
    }

    try {
      setLoading(true);
      
      // Calcular límite según timeframe
      let limit = 24; // 1 día por hora
      if (timeframe === 'hour') limit = 60; // 1 hora por minuto
      if (timeframe === 'week') limit = 168; // 1 semana por hora

      // Obtener lecturas del sensor
      const readingsResponse = await sensorsAPI.getSensorReadings(
        selectedPlant.sensor_id,
        limit
      );
      
      // Asegurar que sea un array
      const readings: SensorReading[] = Array.isArray(readingsResponse) 
        ? readingsResponse 
        : readingsResponse.readings || [];

      // Agrupar por timeframe
      const grouped: Record<string, { humidity: number[]; temperature: number[] }> = {};
      
      readings.forEach(reading => {
        const date = new Date(reading.reading_time);
        let bucket: string;
        
        if (timeframe === 'hour') {
          bucket = date.toISOString().slice(0, 16); // Por minuto
        } else if (timeframe === 'day') {
          bucket = date.toISOString().slice(0, 13); // Por hora
        } else {
          bucket = date.toISOString().slice(0, 10); // Por día
        }

        if (!grouped[bucket]) {
          grouped[bucket] = { humidity: [], temperature: [] };
        }
        
        grouped[bucket].humidity.push(reading.humidity);
        if (reading.temperature) {
          grouped[bucket].temperature.push(reading.temperature);
        }
      });

      // Convertir a formato de gráfico
      const entries: ChartEntry[] = Object.entries(grouped).map(([bucket, values]) => ({
        bucket,
        plant_id: selectedPlant.id,
        humidity: values.humidity.length > 0 
          ? values.humidity.reduce((a, b) => a + b, 0) / values.humidity.length 
          : null,
        temperature: values.temperature.length > 0
          ? values.temperature.reduce((a, b) => a + b, 0) / values.temperature.length
          : null,
      }));

      entries.sort((a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime());
      setChartData(entries);
    } catch (err: any) {
      console.error('Error cargando datos de planta:', err);
      setError('Error cargando datos del sensor');
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: string) => {
    const emojis: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      thirsty: '💧',
      overwatered: '🌊',
      sick: '🤒',
    };
    return emojis[mood.toLowerCase()] || '😐';
  };

  const getHealthColor = (status: string) => {
    const colors: { [key: string]: string } = {
      healthy: '#4ade80',
      warning: '#fbbf24',
      critical: '#ef4444'
    };
    return colors[status] || '#gray';
  };

  if (loading && plants.length === 0) {
    return (
      <div className="dashboard-charts">
        <div className="loading-container">
          <div className="spinner-large"></div>
          <p>Cargando tus plantas...</p>
        </div>
      </div>
    );
  }

  if (error && plants.length === 0) {
    return (
      <div className="dashboard-charts">
        <div className="error-container">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={loadPlants} className="btn-primary">
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="dashboard-charts">
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <h2>¡Aún no tienes plantas!</h2>
          <p>Ve a "Tu Jardín" para añadir tu primera planta y comenzar a monitorearla.</p>
        </div>
      </div>
    );
  }

  // Preparar datos del gráfico
  const labels = chartData.map(entry => {
    const date = new Date(entry.bucket);
    if (timeframe === 'hour') {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (timeframe === 'day') {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
  });

  const chartDataConfig = {
    labels,
    datasets: selectedPlant ? [{
      label: selectedMetric === 'humidity' ? 'Humedad (%)' : 'Temperatura (°C)',
      data: chartData.map(entry => entry[selectedMetric]),
      borderColor: selectedMetric === 'humidity' ? 'rgba(74, 222, 128, 0.8)' : 'rgba(59, 130, 246, 0.8)',
      backgroundColor: selectedMetric === 'humidity' 
        ? 'rgba(74, 222, 128, 0.2)' 
        : 'rgba(59, 130, 246, 0.2)',
      fill: true,
      tension: 0.4,
    }] : [],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: selectedPlant 
          ? `${selectedMetric === 'humidity' ? 'Humedad' : 'Temperatura'} de ${selectedPlant.plant_name}`
          : 'Selecciona una planta',
      },
    },
    scales: {
      y: {
        min: selectedMetric === 'humidity' ? 0 : undefined,
        max: selectedMetric === 'humidity' ? 100 : undefined,
        title: {
          display: true,
          text: selectedMetric === 'humidity' ? 'Humedad (%)' : 'Temperatura (°C)',
        },
      },
    },
  };

  // Calcular estadísticas
  const currentValue = chartData.length > 0 
    ? chartData[chartData.length - 1][selectedMetric]
    : null;
  
  const average = chartData.length > 0
    ? chartData.reduce((sum, entry) => sum + (entry[selectedMetric] || 0), 0) / chartData.length
    : null;

  return (
    <div className="dashboard-charts">
      <div className="plants-dashboard-header">
        <h1>📊 Dashboard de Plantas</h1>
        <p>Monitorea la salud de tus plantas en tiempo real</p>
      </div>

      {/* Selector de plantas */}
      <div className="plants-selector">
        <h3>Selecciona una planta:</h3>
        <div className="plants-grid-mini">
          {plants.map(plant => (
            <div
              key={plant.id}
              className={`plant-mini-card ${selectedPlant?.id === plant.id ? 'active' : ''}`}
              onClick={() => setSelectedPlant(plant)}
            >
              {plant.character_image_url ? (
                <img src={plant.character_image_url} alt={plant.plant_name} />
              ) : (
                <div className="plant-placeholder">🌱</div>
              )}
              <div className="plant-mini-info">
                <h4>{plant.plant_name}</h4>
                <span className="mood-mini">{getMoodEmoji(plant.character_mood)}</span>
                <span 
                  className="health-badge"
                  style={{ backgroundColor: getHealthColor(plant.health_status) }}
                >
                  {plant.health_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPlant && (
        <>
          {/* Información de la planta seleccionada */}
          <div className="selected-plant-info">
            <div className="plant-hero">
              {selectedPlant.character_image_url ? (
                <img src={selectedPlant.character_image_url} alt={selectedPlant.plant_name} />
              ) : (
                <div className="plant-hero-placeholder">🌱</div>
              )}
              <div className="plant-hero-details">
                <h2>{selectedPlant.plant_name}</h2>
                <p className="plant-type">{selectedPlant.plant_type}</p>
                <div className="plant-status">
                  <span className="mood-large">{getMoodEmoji(selectedPlant.character_mood)}</span>
                  <span 
                    className="health-status"
                    style={{ color: getHealthColor(selectedPlant.health_status) }}
                  >
                    {selectedPlant.health_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedPlant.sensor_id ? (
            <>
              {/* Selector de métrica y timeframe */}
              <div className="chart-controls">
                <div className="metric-tabs">
                  <button
                    className={`metric-tab ${selectedMetric === 'humidity' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('humidity')}
                  >
                    💧 Humedad
                  </button>
                  <button
                    className={`metric-tab ${selectedMetric === 'temperature' ? 'active' : ''}`}
                    onClick={() => setSelectedMetric('temperature')}
                  >
                    🌡️ Temperatura
                  </button>
                </div>

                <div className="timeframe-tabs">
                  {TIMEFRAME_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      className={`timeframe-tab ${timeframe === option.key ? 'active' : ''}`}
                      onClick={() => setTimeframe(option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estadísticas rápidas */}
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-icon">{selectedMetric === 'humidity' ? '💧' : '🌡️'}</div>
                  <div className="stat-content">
                    <h3>{currentValue !== null ? `${currentValue.toFixed(1)}${selectedMetric === 'humidity' ? '%' : '°C'}` : '--'}</h3>
                    <p>Valor Actual</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h3>{average !== null ? `${average.toFixed(1)}${selectedMetric === 'humidity' ? '%' : '°C'}` : '--'}</h3>
                    <p>Promedio</p>
                  </div>
                </div>
                {selectedPlant.optimal_humidity_min && selectedPlant.optimal_humidity_max && selectedMetric === 'humidity' && (
                  <div className="stat-card">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-content">
                      <h3>{selectedPlant.optimal_humidity_min}% - {selectedPlant.optimal_humidity_max}%</h3>
                      <p>Rango Óptimo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gráfico */}
              {chartData.length > 0 ? (
                <div className="chart-section">
                  <div className="chart-container">
                    <Line data={chartDataConfig} options={chartOptions} />
                  </div>
                </div>
              ) : (
                <div className="no-data-message">
                  <p>📡 No hay datos del sensor aún. Espera a que el sensor envíe lecturas.</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-sensor-message">
              <h3>📡 Sin Sensor Conectado</h3>
              <p>Esta planta no tiene un sensor asignado. Ve a "Dispositivos" para asignar un sensor a {selectedPlant.plant_name}.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardCharts;
