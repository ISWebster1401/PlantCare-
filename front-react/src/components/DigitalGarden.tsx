import React, { useEffect, useState } from 'react';
import { plantsAPI } from '../services/api';
import { PlantCard } from './PlantCard';
import { PlantScanner } from './PlantScanner';
import './DigitalGarden.css';

export const DigitalGarden: React.FC = () => {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      const data = await plantsAPI.getMyPlants();
      setPlants(data);
      setError('');
    } catch (error: any) {
      console.error('Error fetching plants:', error);
      setError('Error cargando el jardín');
    } finally {
      setLoading(false);
    }
  };

  const handlePlantCreated = (newPlant: any) => {
    setPlants([newPlant, ...plants]);
    setShowScanner(false);
    // Mostrar mensaje de éxito
    setTimeout(() => {
      alert(`¡${newPlant.plant_name} ha sido añadido a tu jardín! 🌱✨`);
    }, 100);
  };

  if (loading) {
    return (
      <div className="digital-garden">
        <div className="garden-loading">
          <div className="loading-spinner"></div>
          <p>Cargando tu jardín... 🌱</p>
        </div>
      </div>
    );
  }

  return (
    <div className="digital-garden">
      {/* Header del jardín */}
      <div className="garden-header">
        <div className="garden-title-section">
          <h1>🌿 TU JARDIN</h1>
          <p className="garden-subtitle">
            {plants.length === 0 
              ? 'Comienza a cultivar tu jardín digital' 
              : `${plants.length} ${plants.length === 1 ? 'planta' : 'plantas'} en tu jardín`}
          </p>
        </div>
        <button 
          className="btn-add-plant"
          onClick={() => setShowScanner(true)}
        >
          <span className="btn-icon">➕</span>
          Añadir Planta
        </button>
      </div>

      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}

      {/* Contenido del jardín */}
      {plants.length === 0 ? (
        <div className="empty-garden">
          <div className="empty-garden-content">
            <div className="empty-icon">🌱</div>
            <h2>¡Tu jardín está vacío!</h2>
            <p>Comienza añadiendo tu primera planta. Toma una foto y nuestra IA la identificará automáticamente.</p>
            <button 
              className="btn-add-first-plant"
              onClick={() => setShowScanner(true)}
            >
              <span className="btn-icon">📷</span>
              Añadir Mi Primera Planta
            </button>
          </div>
        </div>
      ) : (
        <div className="plants-grid">
          {plants.map(plant => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}

      {/* Botón flotante para añadir plantas */}
      {plants.length > 0 && (
        <button 
          className="fab-add-plant"
          onClick={() => setShowScanner(true)}
          title="Añadir nueva planta"
        >
          ➕
        </button>
      )}

      {/* Modal del escáner de plantas */}
      {showScanner && (
        <div className="scanner-modal-overlay" onClick={() => setShowScanner(false)}>
          <div className="scanner-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-modal-header">
              <h2>Añadir Nueva Planta</h2>
              <button 
                className="btn-close-modal"
                onClick={() => setShowScanner(false)}
              >
                ✕
              </button>
            </div>
            <PlantScanner onPlantCreated={handlePlantCreated} />
          </div>
        </div>
      )}
    </div>
  );
};
