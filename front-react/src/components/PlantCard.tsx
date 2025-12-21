import React, { useState } from 'react';
import './PlantCard.css';

interface PlantCardProps {
  plant: {
    id: number;
    plant_name: string;
    plant_type: string;
    character_image_url: string;
    character_mood: string;
    health_status: string;
  };
  onPlantClick?: (plantId: number) => void;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onPlantClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getMoodEmoji = (mood: string) => {
    const emojis: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      thirsty: '💧',
      overwatered: '🌊',
      sick: '🤒',
      // Estados adicionales
      excited: '🤩',
      tired: '😴',
      worried: '😟',
      content: '😌'
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

  const handleClick = () => {
    if (onPlantClick) {
      onPlantClick(plant.id);
    } else {
      // Por ahora, mostrar detalles en un modal o alert
      setShowDetails(true);
    }
  };

  return (
    <>
      <div 
        className="plant-card"
        onClick={handleClick}
        style={{ borderColor: getHealthColor(plant.health_status) }}
      >
        {/* Imagen del personaje */}
        <div className="character-image">
          {plant.character_image_url ? (
            <img 
              src={plant.character_image_url} 
              alt={plant.plant_name}
              onError={(e) => {
                // Si la imagen falla al cargar, mostrar placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.parentElement?.querySelector('.character-placeholder');
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div 
            className="character-placeholder"
            style={{ display: plant.character_image_url ? 'none' : 'flex' }}
          >
            <span className="placeholder-icon">🌱</span>
            <span className="placeholder-text">Generando personaje...</span>
          </div>
          <span className="mood-emoji">{getMoodEmoji(plant.character_mood)}</span>
        </div>
        
        {/* Info */}
        <div className="plant-info">
          <h3>{plant.plant_name}</h3>
          <p className="plant-type">{plant.plant_type}</p>
          <div 
            className="health-indicator"
            style={{ backgroundColor: getHealthColor(plant.health_status) }}
          >
            {plant.health_status}
          </div>
        </div>
      </div>
      
      {/* Modal de detalles (fuera del card para evitar problemas de z-index) */}
      {showDetails && (
        <div className="plant-details-modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="plant-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{plant.plant_name}</h2>
              <button className="close-btn" onClick={() => setShowDetails(false)}>✕</button>
            </div>
            <div className="modal-content">
              <div className="plant-image-large">
                <img src={plant.character_image_url} alt={plant.plant_name} />
                <span className="mood-large">{getMoodEmoji(plant.character_mood)}</span>
              </div>
              <div className="plant-info-detailed">
                <p><strong>Tipo:</strong> {plant.plant_type}</p>
                <p><strong>Estado:</strong> <span style={{ color: getHealthColor(plant.health_status) }}>{plant.health_status}</span></p>
                <p><strong>Ánimo:</strong> {plant.character_mood}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
