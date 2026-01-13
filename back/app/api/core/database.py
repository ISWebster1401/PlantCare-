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
        
        # ============================================
        # PASO 5: CREAR TABLA POKEDEX_CATALOG (catálogo maestro de 100 plantas)
        # ============================================
        if "pokedex_catalog" not in tables:
            logger.info("📋 Creando tabla pokedex_catalog...")
            await db.create_table("pokedex_catalog", {
                "id": "SERIAL PRIMARY KEY",
                "entry_number": "INTEGER UNIQUE NOT NULL",  # 001, 002, ..., 100
                "plant_type": "VARCHAR(100) NOT NULL",  # Nombre común
                "scientific_name": "VARCHAR(200) NOT NULL",  # Nombre científico
                "common_names": "TEXT",  # Variaciones de nombres comunes separados por coma
                "family": "VARCHAR(100)",  # Familia botánica
                "care_level": "VARCHAR(20)",
                "care_tips": "TEXT",
                "optimal_humidity_min": "FLOAT",
                "optimal_humidity_max": "FLOAT",
                "optimal_temp_min": "FLOAT",
                "optimal_temp_max": "FLOAT",
                "silhouette_url": "TEXT",  # URL de silueta para estado bloqueado
                "is_active": "BOOLEAN DEFAULT TRUE",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            # Crear índice en entry_number para ordenamiento
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_pokedex_catalog_entry_number 
                ON pokedex_catalog(entry_number)
            """)
            # Crear índice en plant_type y scientific_name para matching
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_pokedex_catalog_names 
                ON pokedex_catalog(plant_type, scientific_name)
            """)
            logger.info("✅ Tabla pokedex_catalog creada exitosamente")
            
            # Insertar las 100 plantas predefinidas
            await _seed_pokedex_catalog(db)
        else:
            logger.info("✅ Tabla pokedex_catalog ya existe")
        
        # ============================================
        # PASO 6: CREAR TABLA POKEDEX_USER_UNLOCKS (plantas desbloqueadas por usuario)
        # ============================================
        if "pokedex_user_unlocks" not in tables:
            logger.info("📋 Creando tabla pokedex_user_unlocks...")
            await db.create_table("pokedex_user_unlocks", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "catalog_entry_id": "INTEGER REFERENCES pokedex_catalog(id) ON DELETE CASCADE",
                "discovered_photo_url": "TEXT",  # Foto que el usuario escaneó
                "discovered_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            # Constraint único: un usuario solo puede desbloquear una entrada una vez
            await db.execute_query("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_pokedex_user_unlocks_unique 
                ON pokedex_user_unlocks(user_id, catalog_entry_id)
            """)
            # Índices para consultas rápidas
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_pokedex_user_unlocks_user_id 
                ON pokedex_user_unlocks(user_id)
            """)
            await db.execute_query("""
                CREATE INDEX IF NOT EXISTS idx_pokedex_user_unlocks_catalog_id 
                ON pokedex_user_unlocks(catalog_entry_id)
            """)
            logger.info("✅ Tabla pokedex_user_unlocks creada exitosamente")
        else:
            logger.info("✅ Tabla pokedex_user_unlocks ya existe")
        
        # NOTA: Las tablas sensors, sensor_readings, etc. se crean más adelante en esta función
        # pero necesitamos que la función _create_tables continúe después de este punto.
        # (Este código se mueve más abajo para mantener el orden correcto de creación)
        
        # ============================================
        # PASO 7: INSERTAR MODELOS 3D PREDETERMINADOS (si no existen)
        # ============================================
        await _seed_plant_models(db)
            
    except Exception as e:
        log_error_with_context(e, "create_tables")
        raise

async def _seed_pokedex_catalog(db: AsyncPgDbToolkit):
    """Inserta las 100 plantas predefinidas en el catálogo de pokedex"""
    try:
        logger.info("🌱 Insertando 100 plantas predefinidas en pokedex_catalog...")
        
        # Verificar si ya existen entradas
        existing_count = await db.execute_query("SELECT COUNT(*) as count FROM pokedex_catalog")
        if existing_count is not None and not existing_count.empty:
            count = existing_count.iloc[0]["count"]
            if count > 0:
                logger.info(f"✅ Ya existen {count} plantas en el catálogo, omitiendo inserción")
                return
        
        # Lista de 100 plantas comunes con sus datos
        plants_catalog = [
            # Entry 1-20: Araceae (Monstera, Pothos, Philodendron, etc.)
            (1, "Monstera deliciosa", "Monstera deliciosa", "Monstera, Costilla de Adán, Ceriman", "Araceae", "Fácil", "Luz indirecta brillante; Riego moderado cuando el suelo se seca; Humedad alta", 60.0, 80.0, 18.0, 27.0),
            (2, "Monstera adansonii", "Monstera adansonii", "Monstera Adansonii, Swiss Cheese Vine", "Araceae", "Fácil", "Luz indirecta; Mantener suelo húmedo; Prefiere humedad alta", 60.0, 80.0, 18.0, 27.0),
            (3, "Epipremnum aureum", "Epipremnum aureum", "Pothos, Potus, Hiedra del Diablo", "Araceae", "Fácil", "Luz indirecta; Riego cuando el suelo se seca; Tolera poca luz", 40.0, 70.0, 15.0, 30.0),
            (4, "Philodendron hederaceum", "Philodendron hederaceum", "Philodendron Trepador, Philodendron Cordatum", "Araceae", "Fácil", "Luz indirecta; Mantener suelo húmedo; Podar regularmente", 50.0, 70.0, 18.0, 27.0),
            (5, "Philodendron bipinnatifidum", "Philodendron bipinnatifidum", "Philodendron Selloum, Tree Philodendron", "Araceae", "Medio", "Luz indirecta brillante; Riego moderado; Espacio amplio", 50.0, 70.0, 18.0, 27.0),
            (6, "Anthurium andraeanum", "Anthurium andraeanum", "Anturio, Flamingo Flower", "Araceae", "Medio", "Luz indirecta brillante; Alta humedad; Riego regular", 60.0, 80.0, 18.0, 27.0),
            (7, "Spathiphyllum wallisii", "Spathiphyllum wallisii", "Espatifilo, Lirio de la Paz", "Araceae", "Fácil", "Luz indirecta; Mantener suelo húmedo; Alta humedad", 50.0, 70.0, 18.0, 27.0),
            (8, "Zamioculcas zamiifolia", "Zamioculcas zamiifolia", "Zamioculca, ZZ Plant", "Araceae", "Fácil", "Luz baja a brillante; Riego muy espaciado; Tolera sequía", 30.0, 60.0, 15.0, 30.0),
            (9, "Aglaonema commutatum", "Aglaonema commutatum", "Aglaonema, Chinese Evergreen", "Araceae", "Fácil", "Luz indirecta; Riego moderado; Alta humedad", 50.0, 70.0, 18.0, 27.0),
            (10, "Dieffenbachia seguine", "Dieffenbachia seguine", "Dieffenbachia, Dumb Cane", "Araceae", "Medio", "Luz indirecta brillante; Mantener húmedo; Alta humedad", 50.0, 70.0, 18.0, 27.0),
            (11, "Syngonium podophyllum", "Syngonium podophyllum", "Syngonium, Arrowhead Plant", "Araceae", "Fácil", "Luz indirecta; Riego regular; Podar para mantener forma", 50.0, 70.0, 18.0, 27.0),
            (12, "Alocasia amazonica", "Alocasia amazonica", "Alocasia, Elephant Ear", "Araceae", "Medio", "Luz indirecta brillante; Alta humedad; Riego regular", 60.0, 80.0, 20.0, 27.0),
            (13, "Caladium bicolor", "Caladium bicolor", "Caladium, Angel Wings", "Araceae", "Medio", "Luz indirecta brillante; Alta humedad; Mantener húmedo", 60.0, 80.0, 20.0, 27.0),
            (14, "Colocasia esculenta", "Colocasia esculenta", "Colocasia, Taro", "Araceae", "Medio", "Luz indirecta brillante; Suelo muy húmedo; Alta humedad", 60.0, 80.0, 18.0, 27.0),
            (15, "Xanthosoma sagittifolium", "Xanthosoma sagittifolium", "Xanthosoma, Elephant Ear", "Araceae", "Medio", "Luz indirecta brillante; Suelo húmedo; Alta humedad", 60.0, 80.0, 18.0, 27.0),
            (16, "Epipremnum pinnatum", "Epipremnum pinnatum", "Epipremnum Pinnatum, Dragon Tail", "Araceae", "Fácil", "Luz indirecta; Riego moderado; Prefiere humedad", 50.0, 70.0, 18.0, 27.0),
            (17, "Scindapsus pictus", "Scindapsus pictus", "Scindapsus, Satin Pothos", "Araceae", "Fácil", "Luz indirecta; Riego cuando se seca; Similar al Pothos", 40.0, 70.0, 18.0, 27.0),
            (18, "Rhaphidophora tetrasperma", "Rhaphidophora tetrasperma", "Mini Monstera, Philodendron Ginny", "Araceae", "Fácil", "Luz indirecta brillante; Riego moderado; Humedad media", 50.0, 70.0, 18.0, 27.0),
            (19, "Pothos Marble Queen", "Epipremnum aureum", "Pothos Marble Queen, Variegated Pothos", "Araceae", "Fácil", "Luz indirecta brillante; Riego moderado; Más luz para variegación", 40.0, 70.0, 18.0, 27.0),
            (20, "Philodendron Xanadu", "Philodendron xanadu", "Philodendron Xanadu, Winterbourn", "Araceae", "Fácil", "Luz indirecta; Riego moderado; Espacio medio", 50.0, 70.0, 18.0, 27.0),
            
            # Entry 21-40: Ficus
            (21, "Ficus lyrata", "Ficus lyrata", "Ficus Lira, Fiddle Leaf Fig", "Moraceae", "Medio", "Luz indirecta brillante; Riego cuando se seca; No mover frecuentemente", 50.0, 70.0, 18.0, 27.0),
            (22, "Ficus elastica", "Ficus elastica", "Ficus de Goma, Rubber Plant", "Moraceae", "Fácil", "Luz indirecta brillante; Riego moderado; Limpiar hojas", 40.0, 70.0, 18.0, 27.0),
            (23, "Ficus benjamina", "Ficus benjamina", "Ficus Benjamina, Weeping Fig", "Moraceae", "Medio", "Luz indirecta brillante; Riego regular; No cambios bruscos", 50.0, 70.0, 18.0, 27.0),
            (24, "Ficus microcarpa", "Ficus microcarpa", "Ficus Microcarpa, Chinese Banyan", "Moraceae", "Fácil", "Luz indirecta; Riego moderado; Podar para forma", 40.0, 70.0, 18.0, 27.0),
            (25, "Ficus pumila", "Ficus pumila", "Ficus Pumila, Creeping Fig", "Moraceae", "Fácil", "Luz indirecta; Mantener húmedo; Trepadora", 50.0, 70.0, 15.0, 27.0),
            (26, "Ficus audrey", "Ficus benghalensis", "Ficus Audrey, Banyan Fig", "Moraceae", "Medio", "Luz indirecta brillante; Riego moderado; Espacio amplio", 50.0, 70.0, 18.0, 27.0),
            (27, "Ficus altissima", "Ficus altissima", "Ficus Altissima, Council Tree", "Moraceae", "Medio", "Luz indirecta brillante; Riego regular; Alta humedad", 50.0, 70.0, 18.0, 27.0),
            (28, "Ficus triangularis", "Ficus triangularis", "Ficus Triangularis, Triangle Fig", "Moraceae", "Medio", "Luz indirecta brillante; Riego moderado; Forma triangular", 50.0, 70.0, 18.0, 27.0),
            
            # Entry 29-50: Suculentas y Cactus
            (29, "Echeveria elegans", "Echeveria elegans", "Echeveria, Rosa de Alabastro", "Crassulaceae", "Fácil", "Luz directa a indirecta brillante; Riego espaciado; Drenaje excelente", 30.0, 50.0, 10.0, 27.0),
            (30, "Crassula ovata", "Crassula ovata", "Árbol de Jade, Jade Plant", "Crassulaceae", "Fácil", "Luz brillante; Riego muy espaciado; Tolerante a sequía", 30.0, 50.0, 10.0, 27.0),
            (31, "Aloe vera", "Aloe vera", "Aloe Vera, Sábila", "Asphodelaceae", "Fácil", "Luz brillante; Riego espaciado; Propiedades medicinales", 30.0, 50.0, 10.0, 27.0),
            (32, "Haworthia fasciata", "Haworthia fasciata", "Haworthia, Zebra Plant", "Asphodelaceae", "Fácil", "Luz indirecta brillante; Riego espaciado; Tamaño pequeño", 30.0, 50.0, 10.0, 27.0),
            (33, "Kalanchoe blossfeldiana", "Kalanchoe blossfeldiana", "Kalanchoe, Calanchoe", "Crassulaceae", "Fácil", "Luz brillante; Riego moderado; Florece en invierno", 40.0, 60.0, 15.0, 27.0),
            (34, "Sedum morganianum", "Sedum morganianum", "Sedum, Cola de Burro, Donkey Tail", "Crassulaceae", "Fácil", "Luz brillante; Riego espaciado; Colgante", 30.0, 50.0, 10.0, 27.0),
            (35, "Schlumbergera truncata", "Schlumbergera truncata", "Cactus de Navidad, Christmas Cactus", "Cactaceae", "Fácil", "Luz indirecta; Riego regular; Florece en invierno", 40.0, 60.0, 18.0, 24.0),
            (36, "Opuntia ficus-indica", "Opuntia ficus-indica", "Nopal, Prickly Pear", "Cactaceae", "Fácil", "Luz directa; Riego muy espaciado; Resistente", 20.0, 40.0, 10.0, 35.0),
            (37, "Mammillaria", "Mammillaria", "Mammillaria, Cactus esférico", "Cactaceae", "Fácil", "Luz directa brillante; Riego espaciado; Varias especies", 20.0, 40.0, 10.0, 32.0),
            (38, "Echinocactus grusonii", "Echinocactus grusonii", "Cactus Barril Dorado, Golden Barrel", "Cactaceae", "Fácil", "Luz directa; Riego muy espaciado; Forma esférica", 20.0, 40.0, 10.0, 35.0),
            (39, "Cereus", "Cereus", "Cereus, Cactus columnar", "Cactaceae", "Fácil", "Luz directa; Riego espaciado; Crecimiento vertical", 20.0, 40.0, 10.0, 35.0),
            (40, "Gymnocalycium", "Gymnocalycium", "Gymnocalycium, Moon Cactus", "Cactaceae", "Fácil", "Luz brillante; Riego espaciado; Varios colores", 30.0, 50.0, 10.0, 30.0),
            (41, "Echeveria Perle von Nürnberg", "Echeveria 'Perle von Nürnberg'", "Echeveria Perla de Núremberg", "Crassulaceae", "Fácil", "Luz brillante; Riego espaciado; Colores rosados", 30.0, 50.0, 10.0, 27.0),
            (42, "Crassula tetragona", "Crassula tetragona", "Crassula Tetragona, Mini Pine Tree", "Crassulaceae", "Fácil", "Luz brillante; Riego espaciado; Forma de árbol", 30.0, 50.0, 10.0, 27.0),
            (43, "Graptopetalum paraguayense", "Graptopetalum paraguayense", "Graptopetalum, Ghost Plant", "Crassulaceae", "Fácil", "Luz brillante; Riego espaciado; Colores pastel", 30.0, 50.0, 10.0, 27.0),
            (44, "Aeonium", "Aeonium", "Aeonium, Rosa Negra", "Crassulaceae", "Fácil", "Luz brillante; Riego moderado; Rosetas", 40.0, 60.0, 10.0, 27.0),
            (45, "Sempervivum", "Sempervivum", "Sempervivum, Siempreviva", "Crassulaceae", "Fácil", "Luz brillante; Riego espaciado; Resistente al frío", 30.0, 50.0, 5.0, 27.0),
            (46, "Lithops", "Lithops", "Lithops, Piedras Vivas", "Aizoaceae", "Medio", "Luz brillante; Riego muy espaciado; Apariencia de piedra", 20.0, 40.0, 10.0, 27.0),
            (47, "Senecio rowleyanus", "Senecio rowleyanus", "Senecio, String of Pearls", "Asteraceae", "Fácil", "Luz brillante; Riego espaciado; Colgante", 30.0, 50.0, 15.0, 27.0),
            (48, "Senecio radicans", "Senecio radicans", "String of Bananas, Plátanos Colgantes", "Asteraceae", "Fácil", "Luz brillante; Riego espaciado; Colgante", 30.0, 50.0, 15.0, 27.0),
            (49, "Portulacaria afra", "Portulacaria afra", "Portulacaria, Elefante Enano", "Portulacaceae", "Fácil", "Luz brillante; Riego espaciado; Similar a Jade", 30.0, 50.0, 10.0, 27.0),
            (50, "Hoya carnosa", "Hoya carnosa", "Hoya, Wax Plant", "Apocynaceae", "Fácil", "Luz indirecta brillante; Riego moderado; Flores fragantes", 40.0, 60.0, 18.0, 27.0),
            
            # Entry 51-70: Sansevieria, Dracaena, Helechos
            (51, "Sansevieria trifasciata", "Sansevieria trifasciata", "Sansevieria, Lengua de Suegra, Snake Plant", "Asparagaceae", "Fácil", "Luz baja a brillante; Riego muy espaciado; Muy resistente", 30.0, 60.0, 10.0, 30.0),
            (52, "Sansevieria cylindrica", "Sansevieria cylindrica", "Sansevieria Cilíndrica, Spear Sansevieria", "Asparagaceae", "Fácil", "Luz brillante; Riego espaciado; Forma cilíndrica", 30.0, 60.0, 10.0, 30.0),
            (53, "Sansevieria laurentii", "Sansevieria trifasciata 'Laurentii'", "Sansevieria Laurentii, Variegated Snake Plant", "Asparagaceae", "Fácil", "Luz brillante; Riego espaciado; Bordes amarillos", 30.0, 60.0, 10.0, 30.0),
            (54, "Dracaena marginata", "Dracaena marginata", "Dracaena Marginata, Madagascar Dragon Tree", "Asparagaceae", "Fácil", "Luz indirecta; Riego moderado; Hojas estrechas", 40.0, 70.0, 18.0, 27.0),
            (55, "Dracaena fragrans", "Dracaena fragrans", "Dracaena Fragrans, Corn Plant", "Asparagaceae", "Fácil", "Luz indirecta; Riego moderado; Hojas anchas", 40.0, 70.0, 18.0, 27.0),
            (56, "Dracaena deremensis", "Dracaena deremensis", "Dracaena Deremensis, Janet Craig", "Asparagaceae", "Fácil", "Luz indirecta; Riego moderado; Hojas verdes oscuras", 40.0, 70.0, 18.0, 27.0),
            (57, "Nephrolepis exaltata", "Nephrolepis exaltata", "Helecho Espada, Boston Fern", "Nephrolepidaceae", "Medio", "Luz indirecta; Alta humedad; Mantener húmedo", 60.0, 80.0, 18.0, 24.0),
            (58, "Adiantum capillus-veneris", "Adiantum capillus-veneris", "Culantrillo, Maidenhair Fern", "Pteridaceae", "Medio", "Luz indirecta; Alta humedad constante; Frágil", 70.0, 85.0, 18.0, 24.0),
            (59, "Pteris cretica", "Pteris cretica", "Pteris, Helecho Creta", "Pteridaceae", "Fácil", "Luz indirecta; Humedad media; Riego regular", 50.0, 70.0, 18.0, 24.0),
            (60, "Asplenium nidus", "Asplenium nidus", "Asplenium, Nido de Ave", "Aspleniaceae", "Fácil", "Luz indirecta; Alta humedad; Hojas en forma de nido", 60.0, 80.0, 18.0, 27.0),
            (61, "Platycerium bifurcatum", "Platycerium bifurcatum", "Cuerno de Alce, Staghorn Fern", "Polypodiaceae", "Medio", "Luz indirecta brillante; Alta humedad; Epífita", 60.0, 80.0, 18.0, 27.0),
            (62, "Davallia fejeensis", "Davallia fejeensis", "Davallia, Helecho de Conejo", "Davalliaceae", "Medio", "Luz indirecta; Alta humedad; Rizomas aéreos", 60.0, 80.0, 18.0, 24.0),
            
            # Entry 63-80: Otras plantas comunes
            (63, "Pilea peperomioides", "Pilea peperomioides", "Pilea, Planta del Dólar, Chinese Money Plant", "Urticaceae", "Fácil", "Luz indirecta brillante; Riego moderado; Hojas circulares", 40.0, 60.0, 15.0, 27.0),
            (64, "Peperomia obtusifolia", "Peperomia obtusifolia", "Peperomia, Baby Rubber Plant", "Piperaceae", "Fácil", "Luz indirecta; Riego moderado; Hojas gruesas", 40.0, 60.0, 18.0, 27.0),
            (65, "Calathea orbifolia", "Calathea orbifolia", "Calathea Orbifolia", "Marantaceae", "Medio", "Luz indirecta; Alta humedad; Sensible al agua dura", 60.0, 80.0, 18.0, 27.0),
            (66, "Calathea makoyana", "Calathea makoyana", "Calathea Makoyana, Peacock Plant", "Marantaceae", "Medio", "Luz indirecta; Alta humedad; Patrones llamativos", 60.0, 80.0, 18.0, 27.0),
            (67, "Maranta leuconeura", "Maranta leuconeura", "Maranta, Prayer Plant", "Marantaceae", "Medio", "Luz indirecta; Alta humedad; Se cierra de noche", 60.0, 80.0, 18.0, 27.0),
            (68, "Stromanthe sanguinea", "Stromanthe sanguinea", "Stromanthe, Triostar", "Marantaceae", "Medio", "Luz indirecta brillante; Alta humedad; Colores vibrantes", 60.0, 80.0, 18.0, 27.0),
            (69, "Tradescantia zebrina", "Tradescantia zebrina", "Tradescantia, Zebrina, Inch Plant", "Commelinaceae", "Fácil", "Luz indirecta brillante; Riego regular; Colgante", 40.0, 60.0, 15.0, 27.0),
            (70, "Chlorophytum comosum", "Chlorophytum comosum", "Cinta, Spider Plant", "Asparagaceae", "Fácil", "Luz indirecta; Riego regular; Produce hijuelos", 40.0, 60.0, 15.0, 27.0),
            (71, "Hedera helix", "Hedera helix", "Hiedra, English Ivy", "Araliaceae", "Fácil", "Luz indirecta; Riego moderado; Trepadora", 40.0, 60.0, 10.0, 24.0),
            (72, "Schefflera arboricola", "Schefflera arboricola", "Schefflera, Umbrella Tree", "Araliaceae", "Fácil", "Luz indirecta brillante; Riego moderado; Hojas palmeadas", 40.0, 70.0, 15.0, 27.0),
            (73, "Yucca elephantipes", "Yucca elephantipes", "Yuca, Spineless Yucca", "Asparagaceae", "Fácil", "Luz brillante; Riego espaciado; Forma de árbol", 30.0, 60.0, 10.0, 30.0),
            (74, "Beaucarnea recurvata", "Beaucarnea recurvata", "Nolina, Ponytail Palm", "Asparagaceae", "Fácil", "Luz brillante; Riego muy espaciado; Base hinchada", 30.0, 50.0, 10.0, 30.0),
            (75, "Aspidistra elatior", "Aspidistra elatior", "Aspidistra, Iron Plant", "Asparagaceae", "Fácil", "Luz baja; Riego moderado; Muy resistente", 40.0, 60.0, 10.0, 24.0),
            (76, "Cyperus alternifolius", "Cyperus alternifolius", "Cyperus, Umbrella Plant", "Cyperaceae", "Medio", "Luz indirecta brillante; Mantener suelo muy húmedo; Acuática", 60.0, 80.0, 18.0, 27.0),
            
            # Entry 77-100: Hierbas, aromáticas y otras
            (77, "Lavandula angustifolia", "Lavandula angustifolia", "Lavanda, Lavender", "Lamiaceae", "Medio", "Luz directa brillante; Riego moderado; Aromática", 30.0, 50.0, 15.0, 27.0),
            (78, "Rosmarinus officinalis", "Rosmarinus officinalis", "Romero, Rosemary", "Lamiaceae", "Fácil", "Luz directa brillante; Riego espaciado; Aromática", 30.0, 50.0, 10.0, 27.0),
            (79, "Mentha", "Mentha", "Menta, Mint", "Lamiaceae", "Fácil", "Luz indirecta a brillante; Mantener húmedo; Aromática", 50.0, 70.0, 15.0, 24.0),
            (80, "Ocimum basilicum", "Ocimum basilicum", "Albahaca, Basil", "Lamiaceae", "Fácil", "Luz brillante; Riego regular; Aromática culinaria", 50.0, 70.0, 18.0, 27.0),
            (81, "Petroselinum crispum", "Petroselinum crispum", "Perejil, Parsley", "Apiaceae", "Fácil", "Luz brillante; Riego regular; Culinaria", 50.0, 70.0, 10.0, 24.0),
            (82, "Thymus vulgaris", "Thymus vulgaris", "Tomillo, Thyme", "Lamiaceae", "Fácil", "Luz directa brillante; Riego espaciado; Aromática", 30.0, 50.0, 10.0, 27.0),
            (83, "Origanum vulgare", "Origanum vulgare", "Orégano, Oregano", "Lamiaceae", "Fácil", "Luz directa brillante; Riego moderado; Aromática", 30.0, 50.0, 10.0, 27.0),
            (84, "Salvia officinalis", "Salvia officinalis", "Salvia, Sage", "Lamiaceae", "Fácil", "Luz directa brillante; Riego moderado; Aromática", 30.0, 50.0, 10.0, 27.0),
            (85, "Howea forsteriana", "Howea forsteriana", "Palma de Kentia, Kentia Palm", "Arecaceae", "Fácil", "Luz indirecta; Riego moderado; Muy elegante", 40.0, 70.0, 15.0, 27.0),
            (86, "Chamaedorea elegans", "Chamaedorea elegans", "Palma de Salón, Parlor Palm", "Arecaceae", "Fácil", "Luz indirecta; Riego moderado; Compacta", 40.0, 70.0, 18.0, 27.0),
            (87, "Dypsis lutescens", "Dypsis lutescens", "Palma Areca, Areca Palm", "Arecaceae", "Medio", "Luz indirecta brillante; Riego regular; Alta humedad", 50.0, 70.0, 18.0, 27.0),
            (88, "Phoenix roebelenii", "Phoenix roebelenii", "Palmera Enana, Pygmy Date Palm", "Arecaceae", "Medio", "Luz indirecta brillante; Riego moderado; Tamaño pequeño", 40.0, 70.0, 18.0, 27.0),
            (89, "Tulipa", "Tulipa", "Tulipán, Tulip", "Liliaceae", "Medio", "Luz brillante; Riego moderado; Bulbosa de primavera", 40.0, 60.0, 10.0, 20.0),
            (90, "Rosa", "Rosa", "Rosa, Rose", "Rosaceae", "Medio", "Luz directa brillante; Riego regular; Florece", 40.0, 70.0, 15.0, 27.0),
            (91, "Pelargonium", "Pelargonium", "Geranio, Geranium", "Geraniaceae", "Fácil", "Luz directa brillante; Riego moderado; Flores coloridas", 40.0, 60.0, 15.0, 27.0),
            (92, "Begonia", "Begonia", "Begonia", "Begoniaceae", "Medio", "Luz indirecta brillante; Riego regular; Muchas variedades", 50.0, 70.0, 18.0, 24.0),
            (93, "Impatiens walleriana", "Impatiens walleriana", "Impatiens, Balsamina", "Balsaminaceae", "Fácil", "Luz indirecta; Riego regular; Flores todo el año", 50.0, 70.0, 18.0, 27.0),
            (94, "Petunia", "Petunia", "Petunia", "Solanaceae", "Fácil", "Luz directa brillante; Riego regular; Flores abundantes", 40.0, 60.0, 15.0, 27.0),
            (95, "Coleus scutellarioides", "Coleus scutellarioides", "Coleo, Coleus", "Lamiaceae", "Fácil", "Luz indirecta brillante; Riego regular; Hojas coloridas", 50.0, 70.0, 18.0, 27.0),
            (96, "Pachira aquatica", "Pachira aquatica", "Pachira, Money Tree", "Malvaceae", "Fácil", "Luz indirecta brillante; Riego moderado; Tronco trenzado", 40.0, 70.0, 15.0, 27.0),
            (97, "Codiaeum variegatum", "Codiaeum variegatum", "Croton, Crotón", "Euphorbiaceae", "Medio", "Luz brillante; Alta humedad; Hojas muy coloridas", 50.0, 70.0, 18.0, 27.0),
            (98, "Caladium", "Caladium", "Caladium, Corazón de María", "Araceae", "Medio", "Luz indirecta brillante; Alta humedad; Hojas decorativas", 60.0, 80.0, 20.0, 27.0),
            (99, "Cyclamen persicum", "Cyclamen persicum", "Ciclamen, Cyclamen", "Primulaceae", "Medio", "Luz indirecta brillante; Riego desde abajo; Flor de invierno", 50.0, 60.0, 10.0, 18.0),
            (100, "Pteris ensiformis", "Pteris ensiformis", "Pteris Ensiformis, Sword Brake Fern", "Pteridaceae", "Fácil", "Luz indirecta; Humedad media; Helecho ornamental", 50.0, 70.0, 18.0, 24.0),
        ]
        
        # Insertar las 100 plantas
        for entry in plants_catalog:
            entry_num, plant_type, scientific_name, common_names, family, care_level, care_tips, hum_min, hum_max, temp_min, temp_max = entry
            await db.execute_query("""
                INSERT INTO pokedex_catalog (
                    entry_number, plant_type, scientific_name, common_names, family,
                    care_level, care_tips, optimal_humidity_min, optimal_humidity_max,
                    optimal_temp_min, optimal_temp_max
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (entry_number) DO NOTHING
            """, (
                entry_num, plant_type, scientific_name, common_names, family,
                care_level, care_tips, hum_min, hum_max, temp_min, temp_max
            ))
        
        logger.info(f"✅ 100 plantas predefinidas insertadas en pokedex_catalog")
        
    except Exception as e:
        logger.error(f"❌ Error insertando catálogo de pokedex: {e}", exc_info=True)


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