import React, { useState, useEffect } from 'react';
import { plantsAPI } from '../services/api';
import './PlantScanner.css';

interface PlantScannerProps {
  onPlantCreated: (plant: any) => void;
}

interface PlantModel {
  id: number;
  plant_type: string;
  name: string;
  model_3d_url: string;
  default_render_url: string | null;
  is_default: boolean;
}

export const PlantScanner: React.FC<PlantScannerProps> = ({ onPlantCreated }) => {
  const [step, setStep] = useState<'name' | 'photo' | 'identifying' | 'identified' | 'creating'>('name');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [plantName, setPlantName] = useState('');
  const [identifiedData, setIdentifiedData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<PlantModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

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
      const data = await plantsAPI.identifyPlant(file);
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
      const plant = await plantsAPI.createPlant(image, plantName);
      
      // Si se seleccionó un modelo, asignarlo a la planta
      if (selectedModelId && plant.id) {
        try {
          await plantsAPI.assignModelToPlant(plant.id, selectedModelId);
        } catch (modelError: any) {
          console.error('Error assigning model to plant:', modelError);
          // No fallar la creación si falla la asignación del modelo
        }
      }
      
      onPlantCreated(plant);
      // Reset form
      setImage(null);
      setPreview('');
      setPlantName('');
      setIdentifiedData(null);
      setSelectedModelId(null);
      setStep('name');
    } catch (error: any) {
      console.error('Error creating plant:', error);
      setError(error.response?.data?.detail || 'Error creando la planta');
      setStep('identified');
    }
  };

  useEffect(() => {
    // Cargar modelos disponibles al montar el componente
    const loadAvailableModels = async () => {
      try {
        setLoadingModels(true);
        const models = await plantsAPI.getAvailableModels();
        setAvailableModels(models);
      } catch (error: any) {
        console.error('Error loading available models:', error);
        // No mostrar error al usuario, simplemente no mostrar modelos
      } finally {
        setLoadingModels(false);
      }
    };
    loadAvailableModels();
  }, []);

  const handleBack = () => {
    if (step === 'photo') {
      setStep('name');
      setImage(null);
      setPreview('');
    } else if (step === 'identified') {
      setStep('photo');
      setIdentifiedData(null);
      setSelectedModelId(null);
    }
  };

  return (
    <div className="plant-scanner">
      {/* Paso 1: Nombre de la planta */}
      {step === 'name' && (
        <div className="scanner-step">
          <div className="step-icon">🌱</div>
          <h3>Paso 1: Nombre tu planta</h3>
          <p className="step-description">
            Dale un nombre especial a tu nueva planta. Puede ser cualquier nombre que te guste.
          </p>
          <form onSubmit={handleNameSubmit} className="name-form">
            <input
              type="text"
              placeholder="Ej: Pepito, Rosita, Verde..."
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              className="name-input"
              autoFocus
            />
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

          {/* Selector de modelo 3D */}
          {availableModels.length > 0 && (
            <div className="model-selector-card">
              <h4>🎨 Seleccionar Modelo 3D (opcional)</h4>
              <p className="model-selector-description">
                Elige un modelo 3D para tu planta. Si no seleccionas uno, se asignará automáticamente según el tipo.
              </p>
              <select
                value={selectedModelId || ''}
                onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
                className="model-select"
              >
                <option value="">Asignación automática</option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.plant_type} - {model.name}
                  </option>
                ))}
              </select>
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
