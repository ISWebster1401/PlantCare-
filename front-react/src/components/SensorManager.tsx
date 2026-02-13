import React, { useState, useEffect } from 'react';
import { sensorsAPI, plantsAPI } from '../services/api';
import './SensorManager.css';

export const SensorManager: React.FC = () => {
  const [sensors, setSensors] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [deviceKey, setDeviceKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sensorsData, plantsData] = await Promise.all([
        sensorsAPI.getMySensors(),
        plantsAPI.getMyPlants()
      ]);
      setSensors(sensorsData);
      setPlants(plantsData.filter((p: any) => !p.sensor_id));
      setError('');
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSensor = async () => {
    if (!deviceKey.trim()) {
      setError('El código del sensor es requerido');
      return;
    }

    try {
      setError('');
      await sensorsAPI.registerSensor(deviceKey, 'esp8266');
      setDeviceKey('');
      await fetchData();
    } catch (error: any) {
      console.error('Error registering sensor:', error);
      setError(error.response?.data?.detail || 'Error registrando sensor');
    }
  };

  const handleAssignSensor = async (sensorId: number, plantId: number) => {
    try {
      setError('');
      await sensorsAPI.assignSensor(sensorId, plantId);
      await fetchData();
    } catch (error: any) {
      console.error('Error assigning sensor:', error);
      setError(error.response?.data?.detail || 'Error asignando sensor');
    }
  };

  const handleToggleSensor = async (sensorId: number, isActive: boolean) => {
    try {
      setError('');
      await sensorsAPI.toggleSensor(sensorId, !isActive);
      await fetchData();
    } catch (error: any) {
      console.error('Error toggling sensor:', error);
      setError(error.response?.data?.detail || 'Error cambiando estado del sensor');
    }
  };

  if (loading) {
    return <div className="sensor-manager loading">Cargando sensores...</div>;
  }

  return (
    <div className="sensor-manager">
      <h2>Gestión de Sensores 📡</h2>

      {error && (
        <div className="error-message">⚠️ {error}</div>
      )}

      {/* Registrar nuevo sensor */}
      <div className="register-sensor">
        <h3>Registrar Nuevo Sensor</h3>
        <div className="register-form">
          <input
            type="text"
            placeholder="Código del sensor (device_key)"
            value={deviceKey}
            onChange={(e) => setDeviceKey(e.target.value)}
            className="device-key-input"
          />
          <button onClick={handleRegisterSensor} className="btn-register">
            Registrar Sensor
          </button>
        </div>
      </div>

      {/* Lista de sensores */}
      <div className="sensors-list">
        <h3>Mis Sensores</h3>
        {sensors.length === 0 ? (
          <p className="no-sensors">No tienes sensores registrados</p>
        ) : (
          sensors.map(sensor => (
            <div key={sensor.id} className="sensor-item">
              <div className="sensor-header">
                <div>
                  <strong>{sensor.device_key}</strong>
                  <span className={`status-badge ${sensor.is_active ? 'active' : 'inactive'}`}>
                    {sensor.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {sensor.is_assigned && (
                    <span className="status-badge assigned">Asignado</span>
                  )}
                </div>
                <button
                  onClick={() => handleToggleSensor(sensor.id, sensor.is_active)}
                  className={`btn-toggle ${sensor.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                >
                  {sensor.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>

              {sensor.last_connection && (
                <p className="last-connection">
                  Última conexión: {new Date(sensor.last_connection).toLocaleString('es-ES')}
                </p>
              )}

              {!sensor.is_assigned && plants.length > 0 && (
                <div className="assign-section">
                  <select
                    onChange={(e) => {
                      const plantId = parseInt(e.target.value);
                      if (plantId) {
                        handleAssignSensor(sensor.id, plantId);
                      }
                    }}
                    className="plant-select"
                  >
                    <option value="">Asignar a planta...</option>
                    {plants.map(plant => (
                      <option key={plant.id} value={plant.id}>
                        {plant.plant_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sensor.is_assigned && (
                <p className="assigned-plant">
                  ✅ Sensor asignado a una planta
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
