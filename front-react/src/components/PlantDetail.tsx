import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { plantsAPI } from '../services/api';
import './PlantDetail.css';

export const PlantDetail: React.FC = () => {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (plantId) {
      fetchPlantDetail();
    }
  }, [plantId]);

  const fetchPlantDetail = async () => {
    try {
      setLoading(true);
      const data = await plantsAPI.getPlant(parseInt(plantId!));
      setPlant(data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching plant:', error);
      setError('Error cargando la planta');
    } finally {
      setLoading(false);
    }
  };

  const handleWaterPlant = async () => {
    if (!plant) return;
    try {
      const now = new Date().toISOString();
      await plantsAPI.updatePlant(plant.id, { last_watered: now });
      await fetchPlantDetail(); // Refresh
    } catch (error: any) {
      console.error('Error watering plant:', error);
      alert('Error registrando riego');
    }
  };

  if (loading) {
    return <div className="plant-detail loading">Cargando...</div>;
  }

  if (error || !plant) {
    return (
      <div className="plant-detail">
        <div className="error-message">⚠️ {error || 'Planta no encontrada'}</div>
        <button onClick={() => navigate('/garden')} className="btn-back">
          Volver al jardín
        </button>
      </div>
    );
  }

  return (
    <div className="plant-detail">
      <button onClick={() => navigate('/garden')} className="btn-back">
        ← Volver al jardín
      </button>

      {/* Personaje grande */}
      <div className="character-hero">
        <img src={plant.character_image_url} alt={plant.plant_name} />
        <h1>{plant.plant_name}</h1>
        <p className="plant-type">{plant.plant_type}</p>
        {plant.scientific_name && (
          <p className="scientific-name">{plant.scientific_name}</p>
        )}
      </div>

      {/* Stats */}
      <div className="plant-stats">
        <div className="stat">
          <label>Salud:</label>
          <span className={`status-${plant.health_status}`}>{plant.health_status}</span>
        </div>
        <div className="stat">
          <label>Humor:</label>
          <span>{plant.character_mood}</span>
        </div>
        <div className="stat">
          <label>Última vez regada:</label>
          <span>
            {plant.last_watered 
              ? new Date(plant.last_watered).toLocaleDateString('es-ES')
              : 'Nunca'}
          </span>
        </div>
        <div className="stat">
          <label>Nivel de cuidado:</label>
          <span>{plant.care_level || 'N/A'}</span>
        </div>
      </div>

      {/* Botón de regar */}
      <div className="action-section">
        <button onClick={handleWaterPlant} className="btn-water">
          💧 Marcar como regada
        </button>
      </div>

      {/* Tips de cuidado */}
      {plant.care_tips && (
        <div className="care-tips">
          <h2>Tips de Cuidado 💡</h2>
          <p>{plant.care_tips}</p>
        </div>
      )}

      {/* Sensor info */}
      {plant.sensor_id ? (
        <div className="sensor-info">
          <h2>Sensor Conectado 📡</h2>
          <p>Tu planta tiene un sensor activo que monitorea su salud en tiempo real.</p>
        </div>
      ) : (
        <div className="sensor-info">
          <h2>Sin Sensor</h2>
          <p>Asigna un sensor para monitorear la salud de {plant.plant_name} automáticamente.</p>
        </div>
      )}
    </div>
  );
};
