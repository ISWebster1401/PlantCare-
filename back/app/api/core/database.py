import asyncio
import os
import sys
import json
from typing import Optional, Dict, Any
from datetime import datetime
from pgdbtoolkit import AsyncPgDbToolkit
from .config import settings
from .log import logger, log_error_with_context

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Lock para inicialización de base de datos
_db_lock = asyncio.Lock()

# Configuración de la base de datos usando variables de entorno
DB_CONFIG = {
    'host': settings.DB_HOST,
    'port': int(settings.DB_PORT),
    'user': settings.DB_USER,
    'password': settings.DB_PASSWORD,
    'dbname': settings.DB_DATABASE,
    'sslmode': settings.DB_SSLMODE,
    'connect_timeout': int(settings.DB_CONNECT_TIMEOUT)
}

_db: Optional[AsyncPgDbToolkit] = None

async def init_db() -> AsyncPgDbToolkit:
    """
    Inicializa la base de datos y crea las tablas necesarias (ESQUEMA V2 CON ROLES)
    """
    async with _db_lock:
        global _db
        if _db is not None:
            return _db
            
        try:
            logger.info("🔌 Conectando a la base de datos...")
            db = AsyncPgDbToolkit(db_config=DB_CONFIG)
            
            # Verificar conexión
            await db.execute_query("SELECT 1")
            logger.info("✅ Conexión a la base de datos establecida")
            
            # Crear tablas si no existen
            await _create_tables(db)
            
            # Crear índices para optimizar consultas
            await _create_indexes(db)
            
            _db = db
            logger.info("📊 Base de datos inicializada correctamente")
            return db
            
        except Exception as e:
            log_error_with_context(e, "database_init")
            raise

async def _create_tables(db: AsyncPgDbToolkit):
    """Crea las tablas necesarias en la base de datos (ESQUEMA V2 CON ROLES)"""
    try:
        tables = await db.get_tables()
        
        # ============================================
        # PASO 1: CREAR TABLA ROLES PRIMERO (ES REFERENCIADA POR USERS)
        # ============================================
        if "roles" not in tables:
            logger.info("📋 Creando tabla roles...")
            await db.create_table("roles", {
                "id": "SERIAL PRIMARY KEY",
                "name": "VARCHAR(50) UNIQUE NOT NULL",
                "description": "TEXT",
                "permissions": "JSONB",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            
            # Insertar roles por defecto
            logger.info("📋 Insertando roles por defecto...")
            await db.execute_query("""
                INSERT INTO roles (id, name, description, permissions) VALUES
                (1, 'user', 'Usuario regular con acceso básico', '{"can_create_plants": true, "can_manage_sensors": true, "can_view_garden": true}'),
                (2, 'admin', 'Administrador con acceso completo', '{"can_create_plants": true, "can_manage_sensors": true, "can_view_garden": true, "can_manage_users": true, "can_view_stats": true, "can_delete_any_plant": true}')
            """)
            
            # Resetear secuencia para que el siguiente ID sea 3
            await db.execute_query("SELECT setval('roles_id_seq', 2, true)")
            
            logger.info("✅ Tabla roles creada con roles por defecto (user=1, admin=2)")
        else:
            logger.info("✅ Tabla roles ya existe")
        
        # ============================================
        # PASO 2: CREAR/ACTUALIZAR TABLA USERS CON role_id
        # ============================================
        if "users" not in tables:
            logger.info("📋 Creando tabla users (v2 con role_id)...")
            await db.create_table("users", {
                "id": "SERIAL PRIMARY KEY",
                "email": "VARCHAR(255) UNIQUE NOT NULL",
                "hashed_password": "VARCHAR(255) NOT NULL",
                "full_name": "VARCHAR(255)",
                "role_id": "INTEGER REFERENCES roles(id) DEFAULT 1",
                "is_active": "BOOLEAN DEFAULT TRUE",
                "is_verified": "BOOLEAN DEFAULT FALSE",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla users (v2) creada exitosamente con role_id")
        else:
            # Migración: verificar si tiene columna role_id o role (string)
            logger.info("📋 Verificando estructura de tabla users...")
            try:
                # Intentar seleccionar role_id e is_verified
                await db.execute_query("SELECT role_id, is_verified FROM users LIMIT 1")
                logger.info("✅ Tabla users ya tiene columnas role_id e is_verified")
            except:
                # No tiene role_id, necesita migración
                logger.info("📋 Migrando tabla users a esquema v2 con role_id...")
                try:
                    # Agregar columnas nuevas si no existen
                    await db.execute_query("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)")
                    # Agregar columnas nuevas si no existen
                    try:
                        await db.execute_query("SELECT is_verified FROM users LIMIT 1")
                    except:
                        await db.execute_query("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE")
                        logger.info("✅ Columna is_verified agregada")
                    
                    try:
                        await db.execute_query("SELECT hashed_password FROM users LIMIT 1")
                    except:
                        await db.execute_query("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)")
                        logger.info("✅ Columna hashed_password agregada")
                    
                    try:
                        await db.execute_query("SELECT role_id FROM users LIMIT 1")
                    except:
                        await db.execute_query("ALTER TABLE users ADD COLUMN role_id INTEGER")
                        logger.info("✅ Columna role_id agregada")
                    
                    try:
                        await db.execute_query("SELECT is_active FROM users LIMIT 1")
                    except:
                        await db.execute_query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
                        logger.info("✅ Columna is_active agregada")
                    
                    try:
                        await db.execute_query("SELECT updated_at FROM users LIMIT 1")
                    except:
                        await db.execute_query("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                        logger.info("✅ Columna updated_at agregada")
                    
                    # Migrar datos de columnas antiguas
                    try:
                        # Migrar first_name + last_name → full_name
                        await db.execute_query("""
                            UPDATE users 
                            SET full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
                            WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL)
                        """)
                        logger.info("✅ Migrado first_name + last_name → full_name")
                    except Exception as e:
                        logger.warning(f"No se pudo migrar full_name: {e}")
                    
                    try:
                        # Migrar password_hash → hashed_password
                        await db.execute_query("""
                            UPDATE users 
                            SET hashed_password = password_hash
                            WHERE hashed_password IS NULL AND password_hash IS NOT NULL
                        """)
                        logger.info("✅ Migrado password_hash → hashed_password")
                    except Exception as e:
                        logger.warning(f"No se pudo migrar hashed_password: {e}")
                    
                    try:
                        # Migrar active → is_active
                        await db.execute_query("""
                            UPDATE users 
                            SET is_active = active
                            WHERE is_active IS NULL AND active IS NOT NULL
                        """)
                        logger.info("✅ Migrado active → is_active")
                    except Exception as e:
                        logger.warning(f"No se pudo migrar is_active: {e}")
                    
                    try:
                        # Migrar role (string) → role_id (FK)
                        # Caso 1: Si existe columna 'role' como string
                        await db.execute_query("""
                            UPDATE users 
                            SET role_id = CASE 
                                WHEN role = 'admin' THEN 2
                                WHEN role = 'user' THEN 1
                                ELSE 1
                            END
                            WHERE role_id IS NULL
                        """)
                        logger.info("✅ Migrado role (string) → role_id")
                    except Exception as e:
                        # Caso 2: Si tiene role_id viejo (antes de FK)
                        try:
                            await db.execute_query("""
                                UPDATE users 
                                SET role_id = CASE 
                                    WHEN role_id = 2 THEN 2
                                    ELSE 1
                                END
                                WHERE role_id IS NOT NULL
                            """)
                            logger.info("✅ Normalizado role_id existente")
                        except Exception as e2:
                            logger.warning(f"No se pudo migrar role_id: {e2}")
                    
                    # Establecer role_id=1 por defecto si es NULL
                    await db.execute_query("""
                        UPDATE users 
                        SET role_id = 1
                        WHERE role_id IS NULL
                    """)
                    
                    # Agregar constraint FK a roles
                    try:
                        await db.execute_query("""
                            ALTER TABLE users 
                            ADD CONSTRAINT fk_users_role_id 
                            FOREIGN KEY (role_id) REFERENCES roles(id)
                        """)
                        logger.info("✅ Foreign key role_id → roles(id) agregada")
                    except Exception as e:
                        logger.warning(f"FK ya existe o error: {e}")
                    
                    # Establecer DEFAULT para nuevos registros
                    try:
                        await db.execute_query("""
                            ALTER TABLE users 
                            ALTER COLUMN role_id SET DEFAULT 1
                        """)
                        logger.info("✅ DEFAULT 1 establecido para role_id")
                    except Exception as e:
                        logger.warning(f"Error estableciendo DEFAULT: {e}")
                    
                    logger.info("✅ Tabla users migrada exitosamente a esquema v2 con role_id")
                except Exception as e:
                    logger.error(f"❌ Error en migración de users: {e}")
                    raise
        
        # ============================================
        # PASO 3: CREAR TABLA PLANTS (ANTES QUE SENSORS PORQUE SENSORS REFERENCIA PLANTS)
        # ============================================
        if "plants" not in tables:
            logger.info("📋 Creando tabla plants...")
            await db.create_table("plants", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "sensor_id": "UUID",  # Se agregará FK después de crear sensors (UUID para coincidir con sensors.id)
                "plant_name": "VARCHAR(100) NOT NULL",
                "plant_type": "VARCHAR(100)",
                "scientific_name": "VARCHAR(200)",
                "care_level": "VARCHAR(20)",
                "care_tips": "TEXT",
                "original_photo_url": "TEXT",
                "character_image_url": "TEXT",
                "character_personality": "TEXT",
                "character_mood": "VARCHAR(50) DEFAULT 'happy'",
                "health_status": "VARCHAR(20) DEFAULT 'healthy'",
                "last_watered": "TIMESTAMP",
                "optimal_humidity_min": "FLOAT",
                "optimal_humidity_max": "FLOAT",
                "optimal_temp_min": "FLOAT",
                "optimal_temp_max": "FLOAT",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla plants creada exitosamente")
        else:
            logger.info("✅ Tabla plants ya existe")
        
        # ============================================
        # PASO 4: CREAR TABLA PLANT_POKEDEX
        # ============================================
        if "plant_pokedex" not in tables:
            logger.info("📋 Creando tabla plant_pokedex...")
            await db.create_table("plant_pokedex", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "plant_type": "VARCHAR(100)",
                "scientific_name": "VARCHAR(200)",
                "care_level": "VARCHAR(20)",
                "care_tips": "TEXT",
                "original_photo_url": "TEXT",
                "optimal_humidity_min": "FLOAT",
                "optimal_humidity_max": "FLOAT",
                "optimal_temp_min": "FLOAT",
                "optimal_temp_max": "FLOAT",
                "discovered_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            # Crear índice en user_id para consultas rápidas
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_plant_pokedex_user_id 
                ON plant_pokedex(user_id)
            """)
            # Crear índice en discovered_at para ordenamiento
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_plant_pokedex_discovered_at 
                ON plant_pokedex(discovered_at DESC)
            """)
            # Crear constraint único para evitar duplicados
            await db.execute_query("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_plant_pokedex_unique 
                ON plant_pokedex(user_id, plant_type, scientific_name)
            """)
            logger.info("✅ Tabla plant_pokedex creada exitosamente")
        else:
            logger.info("✅ Tabla plant_pokedex ya existe")
            # Migrar sensor_id a UUID si existe como INTEGER (para coincidir con sensors.id UUID)
            try:
                result = await db.execute_query("""
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'plants' AND column_name = 'sensor_id'
                """)
                if result is not None and not result.empty:
                    current_type = result.iloc[0]['data_type']
                    if current_type == 'integer':
                        logger.info("📋 Migrando plants.sensor_id de INTEGER a UUID...")
                        # Primero eliminar la FK si existe
                        await db.execute_query("""
                            ALTER TABLE plants 
                            DROP CONSTRAINT IF EXISTS fk_plants_sensor_id
                        """)
                        # Cambiar el tipo de columna (los valores INTEGER no se pueden convertir a UUID, se ponen NULL)
                        await db.execute_query("""
                            ALTER TABLE plants 
                            ALTER COLUMN sensor_id TYPE UUID USING NULL
                        """)
                        logger.info("✅ plants.sensor_id migrado a UUID (valores existentes se perdieron - se requerirá reasignar sensores)")
            except Exception as e:
                logger.warning(f"No se pudo verificar/migrar sensor_id: {e}")
        
        # ============================================
        # PASO 4: CREAR TABLA SENSORS (REDISEÑADA CON UUID)
        # ============================================
        if "sensors" not in tables:
            logger.info("📋 Creando tabla sensors (v2 con UUID)...")
            # Primero habilitar extensión UUID si no existe
            await db.execute_query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
            
            await db.execute_query("""
                CREATE TABLE sensors (
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
                )
            """)
            logger.info("✅ Tabla sensors creada exitosamente (v2 con UUID)")
            
            # Agregar foreign key de plants.sensor_id → sensors.id después de crear sensors
            try:
                await db.execute_query("""
                    ALTER TABLE plants 
                    ADD CONSTRAINT fk_plants_sensor_id 
                    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL
                """)
                logger.info("✅ Foreign key plants.sensor_id → sensors(id) agregada")
            except Exception as e:
                logger.warning(f"FK plants.sensor_id ya existe o error: {e}")
        else:
            logger.info("✅ Tabla sensors ya existe")
            # Verificar si necesita migración (si tiene device_key en lugar de device_id)
            try:
                check_query = """
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'sensors' AND column_name = 'device_key'
                """
                result = await db.execute_query(check_query)
                if result is not None and not result.empty:
                    logger.warning("⚠️ Tabla sensors tiene estructura antigua. Se requiere migración manual.")
            except Exception:
                pass
            
            # Asegurar que la FK de plants.sensor_id existe
            try:
                await db.execute_query("""
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint 
                            WHERE conname = 'fk_plants_sensor_id'
                        ) THEN
                            ALTER TABLE plants 
                            ADD CONSTRAINT fk_plants_sensor_id 
                            FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE SET NULL;
                        END IF;
                    END $$;
                """)
                logger.info("✅ Foreign key plants.sensor_id → sensors(id) verificada")
            except Exception as e:
                logger.warning(f"Error verificando FK plants.sensor_id: {e}")
        
        # ============================================
        # PASO 5: CREAR TABLA SENSOR_READINGS (REDISEÑADA CON UUID Y NUEVOS CAMPOS)
        # ============================================
        # ============================================
        if "sensor_readings" not in tables:
            logger.info("📋 Creando tabla sensor_readings (v2 con UUID y nuevos campos)...")
            # Primero habilitar extensión UUID si no existe
            await db.execute_query("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
            
            await db.execute_query("""
                CREATE TABLE sensor_readings (
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
                )
            """)
            logger.info("✅ Tabla sensor_readings creada exitosamente (v2 con UUID)")
        else:
            logger.info("✅ Tabla sensor_readings ya existe")
            # Verificar si necesita migración (si tiene reading_time en lugar de timestamp)
            try:
                check_query = """
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'sensor_readings' AND column_name = 'reading_time'
                """
                result = await db.execute_query(check_query)
                if result is not None and not result.empty:
                    logger.warning("⚠️ Tabla sensor_readings tiene estructura antigua. Se requiere migración manual.")
            except Exception:
                pass
        
        # ============================================
        # PASO 6: CREAR TABLA PLANT_PHOTOS
        # ============================================
        if "plant_photos" not in tables:
            logger.info("📋 Creando tabla plant_photos...")
            await db.create_table("plant_photos", {
                "id": "SERIAL PRIMARY KEY",
                "plant_id": "INTEGER REFERENCES plants(id) ON DELETE CASCADE",
                "photo_url": "TEXT NOT NULL",
                "notes": "TEXT",
                "taken_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla plant_photos creada exitosamente")
        else:
            logger.info("✅ Tabla plant_photos ya existe")
        
        # ============================================
        # PASO 7: CREAR TABLAS PARA MODELOS 3D Y ACCESORIOS
        # ============================================
        if "plant_models" not in tables:
            logger.info("📋 Creando tabla plant_models (modelos 3D por tipo de planta)...")
            await db.execute_query("""
                CREATE TABLE plant_models (
                    id SERIAL PRIMARY KEY,
                    plant_type VARCHAR(100) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    model_3d_url TEXT NOT NULL,
                    default_render_url TEXT,
                    is_default BOOLEAN DEFAULT FALSE,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ Tabla plant_models creada exitosamente")
        else:
            logger.info("✅ Tabla plant_models ya existe")

        if "plant_accessories" not in tables:
            logger.info("📋 Creando tabla plant_accessories (accesorios 3D)...")
            await db.execute_query("""
                CREATE TABLE plant_accessories (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    model_3d_url TEXT NOT NULL,
                    preview_image_url TEXT,
                    metadata JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ Tabla plant_accessories creada exitosamente")
        else:
            logger.info("✅ Tabla plant_accessories ya existe")

        if "plant_model_assignments" not in tables:
            logger.info("📋 Creando tabla plant_model_assignments (asignación de modelo por planta)...")
            await db.execute_query("""
                CREATE TABLE plant_model_assignments (
                    id SERIAL PRIMARY KEY,
                    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                    model_id INTEGER NOT NULL REFERENCES plant_models(id) ON DELETE CASCADE,
                    custom_render_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ Tabla plant_model_assignments creada exitosamente")
        else:
            logger.info("✅ Tabla plant_model_assignments ya existe")

        if "plant_accessory_assignments" not in tables:
            logger.info("📋 Creando tabla plant_accessory_assignments (accesorios activos por planta)...")
            await db.execute_query("""
                CREATE TABLE plant_accessory_assignments (
                    id SERIAL PRIMARY KEY,
                    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
                    accessory_id INTEGER NOT NULL REFERENCES plant_accessories(id) ON DELETE CASCADE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logger.info("✅ Tabla plant_accessory_assignments creada exitosamente")
        else:
            logger.info("✅ Tabla plant_accessory_assignments ya existe")

        # ============================================
        # PASO 8: CREAR TABLA ACHIEVEMENTS
        # ============================================
        if "achievements" not in tables:
            logger.info("📋 Creando tabla achievements...")
            await db.create_table("achievements", {
                "id": "SERIAL PRIMARY KEY",
                "name": "VARCHAR(100) NOT NULL",
                "description": "TEXT",
                "icon_url": "TEXT",
                "points": "INTEGER DEFAULT 0",
                "requirement_type": "VARCHAR(50)",
                "requirement_value": "INTEGER"
            })
            
            # Insertar achievements por defecto
            logger.info("📋 Insertando achievements por defecto...")
            await db.execute_query("""
                INSERT INTO achievements (name, description, points, requirement_type, requirement_value) VALUES
                ('Primera Planta', 'Registra tu primera planta', 10, 'plants_count', 1),
                ('Jardinero Dedicado', 'Riega una planta 7 días seguidos', 50, 'water_streak', 7),
                ('Pulgar Verde', 'Mantén una planta saludable 30 días', 100, 'days_alive', 30),
                ('Coleccionista', 'Registra 5 plantas diferentes', 75, 'plants_count', 5),
                ('Hidratación Perfecta', 'Mantén la humedad ideal por 14 días', 60, 'optimal_humidity_streak', 14),
                ('Maestro Botánico', 'Identifica 10 plantas diferentes', 80, 'plants_identified', 10),
                ('Guardián del Jardín', 'Mantén 3 plantas saludables simultáneamente', 90, 'healthy_plants_simultaneous', 3)
            """)
            logger.info("✅ Tabla achievements creada con logros por defecto")
        else:
            logger.info("✅ Tabla achievements ya existe")
        
        # ============================================
        # PASO 9: CREAR TABLA USER_ACHIEVEMENTS
        # ============================================
        if "user_achievements" not in tables:
            logger.info("📋 Creando tabla user_achievements...")
            await db.create_table("user_achievements", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "achievement_id": "INTEGER REFERENCES achievements(id) ON DELETE CASCADE",
                "earned_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            
            # Crear constraint único
            try:
                await db.execute_query("""
                    ALTER TABLE user_achievements 
                    ADD CONSTRAINT user_achievements_unique UNIQUE(user_id, achievement_id)
                """)
                logger.info("✅ Constraint único agregado a user_achievements")
            except Exception as e:
                logger.warning(f"Constraint único ya existe: {e}")
            
            logger.info("✅ Tabla user_achievements creada exitosamente")
        else:
            logger.info("✅ Tabla user_achievements ya existe")
        
        # ============================================
        # PASO 10: CREAR TABLA NOTIFICATIONS
        # ============================================
        if "notifications" not in tables:
            logger.info("📋 Creando tabla notifications...")
            await db.create_table("notifications", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "plant_id": "INTEGER REFERENCES plants(id) ON DELETE CASCADE",
                "notification_type": "VARCHAR(50)",
                "message": "TEXT NOT NULL",
                "is_read": "BOOLEAN DEFAULT FALSE",
                "sent_via_email": "BOOLEAN DEFAULT FALSE",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla notifications creada exitosamente")
        else:
            logger.info("✅ Tabla notifications ya existe")
        
        # ============================================
        # PASO 11: CREAR TABLA EMAIL_VERIFICATION_TOKENS
        # ============================================
        if "email_verification_tokens" not in tables:
            logger.info("📋 Creando tabla email_verification_tokens...")
            await db.create_table("email_verification_tokens", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE",
                "token": "VARCHAR(255) UNIQUE NOT NULL",
                "expires_at": "TIMESTAMP NOT NULL",
                "used_at": "TIMESTAMP",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla email_verification_tokens creada exitosamente")
        else:
            logger.info("✅ Tabla email_verification_tokens ya existe")
        
        # ============================================
        # TABLA: email_change_requests (para cambio de email con verificación)
        # ============================================
        if "email_change_requests" not in tables:
            logger.info("📋 Creando tabla email_change_requests...")
            await db.create_table("email_change_requests", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE",
                "new_email": "VARCHAR(255) NOT NULL",
                "token": "VARCHAR(4) NOT NULL",
                "expires_at": "TIMESTAMP NOT NULL",
                "used_at": "TIMESTAMP",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            logger.info("✅ Tabla email_change_requests creada exitosamente")
        else:
            logger.info("✅ Tabla email_change_requests ya existe")
        
        # ============================================
        # PASO 12: INSERTAR MODELOS 3D PREDETERMINADOS
        # ============================================
        await _seed_plant_models(db)
            
    except Exception as e:
        log_error_with_context(e, "create_tables")
        raise

async def _seed_plant_models(db: AsyncPgDbToolkit):
    """Inserta modelos 3D predeterminados para tipos de plantas comunes"""
    try:
        logger.info("🌱 Insertando modelos 3D predeterminados...")
        
        # Verificar si ya existen modelos
        existing_models = await db.execute_query(
            "SELECT COUNT(*) as count FROM plant_models"
        )
        
        if existing_models is not None and not existing_models.empty:
            count = existing_models.iloc[0]["count"]
            if count > 0:
                logger.info(f"✅ Ya existen {count} modelos 3D en la base de datos, omitiendo inserción")
                return
        
        # Modelos base con URLs placeholder
        models = [
            {
                "plant_type": "Cactus",
                "name": "Cactus Default",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/cactus_default.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/cactus_default_render.jpg",
                "is_default": True,
                "metadata": {"category": "succulent", "scale": 1.0}
            },
            {
                "plant_type": "Suculenta",
                "name": "Suculenta Default",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/suculenta_default.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/suculenta_default_render.jpg",
                "is_default": True,
                "metadata": {"category": "succulent", "scale": 1.0}
            },
            {
                "plant_type": "Monstera",
                "name": "Monstera Default",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/monstera_default.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/monstera_default_render.jpg",
                "is_default": True,
                "metadata": {"category": "tropical", "scale": 1.2}
            },
            {
                "plant_type": "Helecho",
                "name": "Helecho Default",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/helecho_default.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/helecho_default_render.jpg",
                "is_default": True,
                "metadata": {"category": "fern", "scale": 1.1}
            },
            {
                "plant_type": "Rosa",
                "name": "Rosa Default",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/rosa_default.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/rosa_default_render.jpg",
                "is_default": True,
                "metadata": {"category": "flower", "scale": 0.8}
            },
            {
                "plant_type": "Planta",
                "name": "Planta Genérica",
                "model_3d_url": "PLACEHOLDER_upload_to_supabase/planta_generica.glb",
                "default_render_url": "PLACEHOLDER_upload_to_supabase/planta_generica_render.jpg",
                "is_default": True,
                "metadata": {"category": "generic", "scale": 1.0}
            }
        ]
        
        # Insertar modelos usando execute_query
        for model in models:
            try:
                await db.execute_query("""
                    INSERT INTO plant_models (plant_type, name, model_3d_url, default_render_url, is_default, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                    ON CONFLICT DO NOTHING
                """, (
                    model["plant_type"],
                    model["name"],
                    model["model_3d_url"],
                    model.get("default_render_url"),
                    model["is_default"],
                    json.dumps(model.get("metadata", {}))
                ))
            except Exception as e:
                logger.warning(f"Error insertando modelo {model['name']}: {e}")
        
        logger.info(f"✅ Modelos 3D predeterminados insertados: {len(models)} modelos")
        
    except Exception as e:
        logger.error(f"❌ Error insertando modelos 3D predeterminados: {e}")
        # No lanzar excepción - los modelos pueden insertarse manualmente después
        logger.warning("⚠️ Continuando sin modelos predeterminados (pueden insertarse manualmente después)")


async def _create_indexes(db: AsyncPgDbToolkit):
    """Crea índices para optimizar las consultas"""
    try:
        logger.info("🔍 Creando índices de optimización...")
        
        # Índices para roles
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
        """)
        logger.info("✅ Índices para tabla roles creados")
        
        # Índices para usuarios
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
            CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
            CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
            CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
        """)
        logger.info("✅ Índices para tabla users creados")
        
        # Índices para sensores (v2 - ya se crean en _create_tables, pero por si acaso)
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors(device_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors(user_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_plant_id ON sensors(plant_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
        """)
        logger.info("✅ Índices para tabla sensors creados")
        
        # Índices para plantas
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_plants_user_id ON plants(user_id);
            CREATE INDEX IF NOT EXISTS idx_plants_sensor_id ON plants(sensor_id);
            CREATE INDEX IF NOT EXISTS idx_plants_health_status ON plants(health_status);
            CREATE INDEX IF NOT EXISTS idx_plants_character_mood ON plants(character_mood);
            CREATE INDEX IF NOT EXISTS idx_plants_created_at ON plants(created_at DESC);
        """)
        logger.info("✅ Índices para tabla plants creados")
        
        # Índices para modelos 3D y accesorios
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_plant_models_plant_type ON plant_models(plant_type);
            CREATE INDEX IF NOT EXISTS idx_plant_models_is_default ON plant_models(is_default);
            CREATE INDEX IF NOT EXISTS idx_plant_accessories_code ON plant_accessories(code);
            CREATE INDEX IF NOT EXISTS idx_plant_model_assignments_plant_id ON plant_model_assignments(plant_id);
            CREATE INDEX IF NOT EXISTS idx_plant_model_assignments_model_id ON plant_model_assignments(model_id);
            CREATE INDEX IF NOT EXISTS idx_plant_accessory_assignments_plant_id ON plant_accessory_assignments(plant_id);
            CREATE INDEX IF NOT EXISTS idx_plant_accessory_assignments_accessory_id ON plant_accessory_assignments(accessory_id);
            CREATE INDEX IF NOT EXISTS idx_plant_accessory_assignments_is_active ON plant_accessory_assignments(is_active);
        """)
        logger.info("✅ Índices para tablas de modelos 3D y accesorios creados")
        
        # Índices para sensors (v2)
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors(device_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_user_id ON sensors(user_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_plant_id ON sensors(plant_id);
            CREATE INDEX IF NOT EXISTS idx_sensors_status ON sensors(status);
        """)
        logger.info("✅ Índices para tabla sensors creados")
        
        # Índices para sensor_readings (v2)
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id ON sensor_readings(sensor_id);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_id ON sensor_readings(user_id);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_plant_id ON sensor_readings(plant_id);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_timestamp ON sensor_readings(sensor_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_user_timestamp ON sensor_readings(user_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_sensor_readings_plant_timestamp ON sensor_readings(plant_id, timestamp DESC);
        """)
        logger.info("✅ Índices para tabla sensor_readings creados")
        
        # Índices para plant_photos
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_plant_photos_plant_id ON plant_photos(plant_id);
            CREATE INDEX IF NOT EXISTS idx_plant_photos_taken_at ON plant_photos(taken_at DESC);
        """)
        logger.info("✅ Índices para tabla plant_photos creados")
        
        # Índices para achievements
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_achievements_requirement_type ON achievements(requirement_type);
            CREATE INDEX IF NOT EXISTS idx_achievements_points ON achievements(points DESC);
        """)
        logger.info("✅ Índices para tabla achievements creados")
        
        # Índices para user_achievements
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
            CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);
        """)
        logger.info("✅ Índices para tabla user_achievements creados")
        
        # Índices para notifications
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_plant_id ON notifications(plant_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
        """)
        logger.info("✅ Índices para tabla notifications creados")
        
        # Índices para email_verification_tokens
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_verification_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_verification_tokens(token);
            CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_verification_tokens(expires_at);
            CREATE INDEX IF NOT EXISTS idx_email_tokens_used_at ON email_verification_tokens(used_at);
        """)
        logger.info("✅ Índices para tabla email_verification_tokens creados")
        
        logger.info("✅ Todos los índices creados exitosamente")
        
    except Exception as e:
        log_error_with_context(e, "create_indexes")
        logger.warning(f"Algunos índices no se pudieron crear: {str(e)}")

async def get_db() -> AsyncPgDbToolkit:
    """
    Obtiene o crea una instancia de AsyncPgDbToolkit
    """
    if _db is None:
        return await init_db()
    return _db

async def close_db():
    """
    Cierra la conexión a la base de datos
    """
    global _db
    async with _db_lock:
        if _db is not None:
            try:
                await _db.close()
                logger.info("🔌 Conexión a la base de datos cerrada")
            except Exception as e:
                log_error_with_context(e, "close_database")
            finally:
                _db = None

async def health_check() -> Dict[str, Any]:
    """
    Verifica el estado de la base de datos
    """
    try:
        db = await get_db()
        result = await db.execute_query("SELECT 1 as health")
        
        if result is not None and not result.empty:
            return {
                "status": "healthy",
                "database": "connected",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "error": "No se pudo obtener respuesta de la base de datos"
            }
    except Exception as e:
        log_error_with_context(e, "health_check")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

async def get_database_stats() -> Dict[str, Any]:
    """
    Obtiene estadísticas de la base de datos
    """
    try:
        db = await get_db()
        
        stats = {}
        tables = ["users", "roles", "sensors", "plants", "sensor_readings", "notifications", "user_achievements", "achievements"]
        
        for table in tables:
            try:
                result = await db.execute_query(f"SELECT COUNT(*) as count FROM {table}")
                if result is not None and not result.empty:
                    stats[f"{table}_count"] = int(result.iloc[0]["count"])
                else:
                    stats[f"{table}_count"] = 0
            except Exception as e:
                logger.warning(f"Error contando registros de {table}: {e}")
                stats[f"{table}_count"] = 0
        
        try:
            size_result = await db.execute_query("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """)
            if size_result is not None and not size_result.empty:
                stats["database_size"] = size_result.iloc[0]["size"]
            else:
                stats["database_size"] = "Unknown"
        except Exception as e:
            logger.warning(f"Error obteniendo tamaño de DB: {e}")
            stats["database_size"] = "Unknown"
        
        return stats
        
    except Exception as e:
        log_error_with_context(e, "database_stats")
        return {"error": str(e)}

async def get_role_by_name(role_name: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un rol por su nombre
    """
    try:
        db = await get_db()
        result = await db.fetch_records(
            "roles",
            conditions={"name": role_name}
        )
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
        
    except Exception as e:
        log_error_with_context(e, "get_role_by_name")
        return None

async def get_role_by_id(role_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un rol por su ID
    """
    try:
        db = await get_db()
        result = await db.fetch_records(
            "roles",
            conditions={"id": role_id}
        )
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
        
    except Exception as e:
        log_error_with_context(e, "get_role_by_id")
        return None