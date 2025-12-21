-- ============================================================
-- MIGRACIÓN 002: Rediseño de Sensors y Sensor Readings con UUID
-- ============================================================
-- Esta migración rediseña las tablas sensors y sensor_readings:
-- - Cambia IDs de SERIAL a UUID
-- - Agrega nuevos campos en sensor_readings
-- - Separa air_humidity de soil_moisture
-- - Agrega light_intensity y electrical_conductivity
-- 
-- IMPORTANTE: Esta migración asume que puedes eliminar datos existentes.
-- Si necesitas preservar datos, crea una migración de datos antes.
-- ============================================================

-- Habilitar extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PASO 1: ELIMINAR TABLAS ANTIGUAS (SI EXISTEN)
-- ============================================================
-- ⚠️ ADVERTENCIA: Esto eliminará todos los datos existentes
-- Descomenta solo si quieres empezar desde cero

-- DROP TABLE IF EXISTS sensor_readings CASCADE;
-- DROP TABLE IF EXISTS sensors CASCADE;

-- ============================================================
-- PASO 2: CREAR NUEVA TABLA SENSORS (CON UUID)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'esp8266',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    last_connection TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sensors
CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors(device_id);
CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_plant_id ON sensors(plant_id);
CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);

-- ============================================================
-- PASO 3: CREAR NUEVA TABLA SENSOR_READINGS (CON UUID Y NUEVOS CAMPOS)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
    temperature INTEGER NOT NULL CHECK (temperature >= -20 AND temperature <= 60),
    air_humidity FLOAT NOT NULL CHECK (air_humidity >= 0 AND air_humidity <= 100),
    soil_moisture FLOAT NOT NULL CHECK (soil_moisture >= 0 AND soil_moisture <= 100),
    light_intensity INTEGER,
    electrical_conductivity FLOAT CHECK (electrical_conductivity IS NULL OR electrical_conductivity >= 0),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices compuestos para sensor_readings (optimizados para queries por tiempo)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id ON sensor_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_plant_id ON sensor_readings(plant_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_timestamp ON sensor_readings(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_timestamp ON sensor_readings(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_plant_timestamp ON sensor_readings(plant_id, timestamp DESC);

-- ============================================================
-- COMENTARIOS EN TABLAS
-- ============================================================
COMMENT ON TABLE sensors IS 'Sensores IoT (ESP8266/ESP32) - Rediseñado con UUID v2';
COMMENT ON TABLE sensor_readings IS 'Lecturas de sensores en tiempo real - Rediseñado con UUID y nuevos campos v2';

COMMENT ON COLUMN sensors.device_id IS 'ID único del dispositivo Wemos desde Arduino (ej: WEMOS_001)';
COMMENT ON COLUMN sensors.status IS 'Estado del sensor: active, inactive, maintenance';
COMMENT ON COLUMN sensor_readings.temperature IS 'Temperatura en grados Celsius (entero, -20 a 60)';
COMMENT ON COLUMN sensor_readings.air_humidity IS 'Humedad del aire en porcentaje (0-100)';
COMMENT ON COLUMN sensor_readings.soil_moisture IS 'Humedad del suelo en porcentaje (0-100)';
COMMENT ON COLUMN sensor_readings.light_intensity IS 'Intensidad de luz en Lux o valor analógico';
COMMENT ON COLUMN sensor_readings.electrical_conductivity IS 'Conductividad eléctrica en mS/cm o similar';

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('sensors', 'sensor_readings')
ORDER BY table_name;

-- Verificar estructura de sensors
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensors'
ORDER BY ordinal_position;

-- Verificar estructura de sensor_readings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sensor_readings'
ORDER BY ordinal_position;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
