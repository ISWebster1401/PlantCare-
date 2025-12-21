-- ============================================================
-- SCRIPT DE MIGRACIÓN V2 - PlantCare (Gamificación)
-- ============================================================
-- Este script crea el nuevo esquema de base de datos para
-- el sistema gamificado de cuidado de plantas.
-- 
-- IMPORTANTE: Este es un esquema NUEVO. Para migración desde v1,
-- se recomienda crear una nueva base de datos o hacer backup.
-- ============================================================

-- ============================================================
-- TABLA: users (MANTENER estructura, adaptar)
-- ============================================================
-- Mantenemos la estructura básica pero simplificamos campos
-- que ya no son relevantes (vineyard_name, hectares, etc.)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',  -- 'admin' o 'user'
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,  -- Verificación de email
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- TABLA: sensors (NUEVA - adaptar de "devices" anterior)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identificación del sensor
    device_key VARCHAR(100) UNIQUE NOT NULL,       -- Código único del dispositivo
    device_type VARCHAR(50) DEFAULT 'esp8266',     -- 'esp8266' o 'esp32'
    
    -- Estado
    is_active BOOLEAN DEFAULT FALSE,               -- Si está encendido/apagado
    is_assigned BOOLEAN DEFAULT FALSE,             -- Si está asignado a una planta
    last_connection TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors(user_id);
CREATE INDEX IF NOT EXISTS idx_sensors_device_key ON sensors(device_key);
CREATE INDEX IF NOT EXISTS idx_sensors_is_active ON sensors(is_active);
CREATE INDEX IF NOT EXISTS idx_sensors_is_assigned ON sensors(is_assigned);

-- ============================================================
-- TABLA: plants (NUEVA - núcleo del sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS plants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,  -- Puede ser NULL
    
    -- Info básica de la planta
    plant_name VARCHAR(100) NOT NULL,              -- "Pepito", "Rosa", etc
    plant_type VARCHAR(100),                       -- "Cactus", "Helecho", etc (detectado por IA)
    scientific_name VARCHAR(200),                  -- "Opuntia microdasys"
    care_level VARCHAR(20),                        -- "Fácil", "Medio", "Difícil"
    care_tips TEXT,                                -- Tips JSON de cuidado de IA
    
    -- IA y personaje
    original_photo_url TEXT,                       -- URL en Cloudinary de foto original
    character_image_url TEXT,                      -- URL en Cloudinary del personaje generado
    character_personality TEXT,                    -- "Aventurero", "Tímido", etc
    character_mood VARCHAR(50) DEFAULT 'happy',    -- happy, sad, sick, thirsty, overwatered
    
    -- Salud de la planta
    health_status VARCHAR(20) DEFAULT 'healthy',   -- healthy, warning, critical
    last_watered TIMESTAMP,
    optimal_humidity_min FLOAT,                    -- % mínimo ideal
    optimal_humidity_max FLOAT,                    -- % máximo ideal
    optimal_temp_min FLOAT,                        -- °C mínimo ideal
    optimal_temp_max FLOAT,                        -- °C máximo ideal
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_sensor_id ON plants(sensor_id);
CREATE INDEX IF NOT EXISTS idx_plants_health_status ON plants(health_status);
CREATE INDEX IF NOT EXISTS idx_plants_character_mood ON plants(character_mood);

-- ============================================================
-- TABLA: sensor_readings (NUEVA - datos de sensores)
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
    
    -- Lecturas
    humidity FLOAT,              -- Humedad del suelo (%)
    temperature FLOAT,           -- Temperatura (°C)
    pressure FLOAT,              -- Presión atmosférica (hPa) - si hay BMP180
    
    -- Timestamp
    reading_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_plant_id ON sensor_readings(plant_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time ON sensor_readings(reading_time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, reading_time DESC);

-- ============================================================
-- TABLA: plant_photos (NUEVA - historial de fotos)
-- ============================================================
CREATE TABLE IF NOT EXISTS plant_photos (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,                       -- URL en Cloudinary
    notes TEXT,                                    -- Notas del usuario
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plant_photos_plant_id ON plant_photos(plant_id);
CREATE INDEX IF NOT EXISTS idx_plant_photos_taken_at ON plant_photos(taken_at DESC);

-- ============================================================
-- TABLA: achievements (NUEVA - gamificación)
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,                                 -- URL del icono
    points INTEGER DEFAULT 0,
    requirement_type VARCHAR(50),                  -- 'water_streak', 'days_alive', 'plants_count'
    requirement_value INTEGER
);

-- Logros de ejemplo a insertar después
INSERT INTO achievements (name, description, points, requirement_type, requirement_value) VALUES
('Primera Planta', 'Registra tu primera planta', 10, 'plants_count', 1),
('Jardinero Dedicado', 'Riega una planta 7 días seguidos', 50, 'water_streak', 7),
('Pulgar Verde', 'Mantén una planta saludable 30 días', 100, 'days_alive', 30),
('Coleccionista', 'Registra 5 plantas diferentes', 75, 'plants_count', 5),
('Hidratación Perfecta', 'Mantén la humedad ideal por 14 días', 60, 'days_alive', 14)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_achievements_requirement_type ON achievements(requirement_type);

-- ============================================================
-- TABLA: user_achievements (NUEVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)  -- Un usuario no puede ganar el mismo logro 2 veces
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- ============================================================
-- TABLA: notifications (NUEVA)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50),                 -- 'water_needed', 'health_warning', 'achievement'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_plant_id ON notifications(plant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- ============================================================
-- COMENTARIOS EN TABLAS
-- ============================================================

COMMENT ON TABLE users IS 'Usuarios del sistema PlantCare v2';
COMMENT ON TABLE sensors IS 'Sensores IoT (ESP8266/ESP32) conectados al sistema';
COMMENT ON TABLE plants IS 'Plantas registradas con personajes generados por IA';
COMMENT ON TABLE sensor_readings IS 'Lecturas de sensores en tiempo real';
COMMENT ON TABLE plant_photos IS 'Historial de fotos de plantas';
COMMENT ON TABLE achievements IS 'Logros y achievements del sistema de gamificación';
COMMENT ON TABLE user_achievements IS 'Logros ganados por usuarios';
COMMENT ON TABLE notifications IS 'Notificaciones del sistema para usuarios';

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================

-- Verificar que todas las tablas fueron creadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'sensors', 'plants', 'sensor_readings', 
                       'plant_photos', 'achievements', 'user_achievements', 'notifications')
ORDER BY table_name;

-- Verificar achievements insertados
SELECT * FROM achievements;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
