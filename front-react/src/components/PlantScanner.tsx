import React, { useState } from 'react';
import { plantsAPI } from '../services/api';
import './PlantScanner.css';

interface PlantScannerProps {
  onPlantCreated: (plant: any) => void;
}

export const PlantScanner: React.FC<PlantScannerProps> = ({ onPlantCreated }) => {
  const [step, setStep] = useState<'name' | 'photo' | 'identifying' | 'identified' | 'creating'>('name');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [plantName, setPlantName] = useState('');
  const [plantSpecies, setPlantSpecies] = useState(''); // Campo opcional para especie
  const [identifiedData, setIdentifiedData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plantName.trim()) {
      setStep('photo');
      setError('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError('');
      // Automáticamente identificar después de subir la imagen
      handleIdentify(file);
    }
  };

  const handleIdentify = async (fileToIdentify?: File) => {
    const file = fileToIdentify || image;
    if (!file) return;
    
    setStep('identifying');
    setError('');
    try {
      // Pasar especie si el usuario la proporcionó
      const data = await plantsAPI.identifyPlant(file, plantSpecies.trim() || undefined);
      setIdentifiedData(data);
      setStep('identified');
    } catch (error: any) {
      console.error('Error identifying plant:', error);
      setError(error.response?.data?.detail || 'Error identificando la planta');
      setStep('photo');
    }
  };

  const handleCreatePlant = async () => {
    if (!image || !plantName) return;
    
    setStep('creating');
    setError('');
    try {
      // Crear planta (el modelo se asigna automáticamente según el tipo)
      // Pasar especie si el usuario la proporcionó
      const plant = await plantsAPI.createPlant(image, plantName, plantSpecies.trim() || undefined);
      
      onPlantCreated(plant);
      // Reset form
      setImage(null);
      setPreview('');
      setPlantName('');
      setPlantSpecies('');
      setIdentifiedData(null);
      setStep('name');
    } catch (error: any) {
      console.error('Error creating plant:', error);
      setError(error.response?.data?.detail || 'Error creando la planta');
      setStep('identified');
    }
  };


  const handleBack = () => {
    if (step === 'photo') {
      setStep('name');
      setImage(null);
      setPreview('');
    } else if (step === 'identified') {
      setStep('photo');
      setIdentifiedData(null);
    }
  };

  return (
    <div className="plant-scanner">
      {/* Paso 1: Nombre de la planta y especie (opcional) */}
      {step === 'name' && (
        <div className="scanner-step">
          <div className="step-icon">🌱</div>
          <h3>Paso 1: Nombre tu planta</h3>
          <p className="step-description">
            Dale un nombre especial a tu nueva planta. Si conoces la especie, puedes ingresarla para mejorar la identificación.
          </p>
          <form onSubmit={handleNameSubmit} className="name-form">
            <input
              type="text"
              placeholder="Nombre de la planta (ej: Pepito, Rosita, Verde...)"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              className="name-input"
              autoFocus
              required
            />
            <input
              type="text"
              placeholder="Especie (opcional, ej: Monstera deliciosa, Ficus lyrata...)"
              value={plantSpecies}
              onChange={(e) => setPlantSpecies(e.target.value)}
              className="name-input"
            />
            <small className="species-hint" style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
              Si conoces la especie, ingrésala para una identificación más precisa
            </small>
            <button type="submit" className="btn-next" disabled={!plantName.trim()}>
              Continuar →
            </button>
          </form>
        </div>
      )}

      {/* Paso 2: Subir foto */}
      {step === 'photo' && (
        <div className="scanner-step">
          <button className="btn-back" onClick={handleBack}>← Volver</button>
          <div className="step-icon">📷</div>
          <h3>Paso 2: Toma una foto</h3>
          <p className="step-description">
            Toma o sube una foto de tu planta. Nuestra IA la identificará automáticamente.
          </p>
          
          <div className="image-upload-section">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              id="plant-image-input"
              className="file-input"
            />
            <label htmlFor="plant-image-input" className="file-label">
              {preview ? '📷 Cambiar foto' : '📷 Tomar o subir foto'}
            </label>
          </div>

          {preview && (
            <div className="preview-section">
              <img src={preview} alt="Preview" className="preview-image" />
            </div>
          )}
        </div>
      )}

      {/* Paso 3: Identificando */}
      {step === 'identifying' && (
        <div className="scanner-step">
          <div className="identifying-animation">
            <div className="spinner"></div>
            <h3>🔍 Identificando tu planta...</h3>
            <p>Nuestra IA está analizando la imagen</p>
          </div>
        </div>
      )}

      {/* Paso 4: Planta identificada con tips */}
      {step === 'identified' && identifiedData && (
        <div className="scanner-step">
          <button className="btn-back" onClick={handleBack}>← Volver</button>
          <div className="identified-header">
            <div className="success-icon">✨</div>
            <h3>¡Planta identificada!</h3>
          </div>
          
          <div className="plant-info-card">
            <div className="plant-info-row">
              <span className="info-label">Tipo:</span>
              <span className="info-value">{identifiedData.plant_type}</span>
            </div>
            {identifiedData.scientific_name && (
              <div className="plant-info-row">
                <span className="info-label">Nombre científico:</span>
                <span className="info-value scientific">{identifiedData.scientific_name}</span>
              </div>
            )}
            {identifiedData.care_level && (
              <div className="plant-info-row">
                <span className="info-label">Nivel de cuidado:</span>
                <span className="info-value">{identifiedData.care_level}</span>
              </div>
            )}
          </div>

          {identifiedData.care_tips && (
            <div className="care-tips-card">
              <h4>💡 Tips de cuidado</h4>
              <div className="tips-content">
                {typeof identifiedData.care_tips === 'string' 
                  ? identifiedData.care_tips.split('\n').map((tip: string, idx: number) => (
                      <p key={idx}>{tip}</p>
                    ))
                  : <p>{identifiedData.care_tips}</p>
                }
              </div>
            </div>
          )}


          <div className="plant-summary">
            <p className="plant-name-display">
              <strong>{plantName}</strong> será añadido a tu jardín
            </p>
          </div>

          <button 
            onClick={handleCreatePlant} 
            className="btn-create-plant"
          >
            Crear Planta y Personaje 🎨
          </button>
        </div>
      )}

      {/* Paso 5: Creando */}
      {step === 'creating' && (
        <div className="scanner-step">
          <div className="creating-animation">
            <div className="spinner"></div>
            <h3>🎨 Creando tu planta...</h3>
            <p>Generando el personaje único de <strong>{plantName}</strong></p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
