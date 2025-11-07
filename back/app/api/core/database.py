import asyncio
import os
import sys
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
    Inicializa la base de datos y crea las tablas necesarias
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
    """Crea las tablas necesarias en la base de datos"""
    try:
        tables = await db.get_tables()
        
        # Tabla de roles
        if "roles" not in tables:
            logger.info("📋 Creando tabla roles...")
            await db.create_table("roles", {
                "id": "SERIAL PRIMARY KEY",
                "name": "VARCHAR(50) UNIQUE NOT NULL",
                "description": "VARCHAR(200)",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            })
            
            # Insertar roles por defecto
            await db.insert_records("roles", [
                {"id": 1, "name": "user", "description": "Usuario normal - Propietario de viñas"},
                {"id": 2, "name": "admin", "description": "Administrador - Gestión completa del sistema"}
            ])
            
            logger.info("✅ Tabla roles creada con roles por defecto")
        
        # Tabla de usuarios
        if "users" not in tables:
            logger.info("📋 Creando tabla users...")
            await db.create_table("users", {
                "id": "SERIAL PRIMARY KEY",
                "first_name": "VARCHAR(100) NOT NULL",
                "last_name": "VARCHAR(100) NOT NULL",
                "email": "VARCHAR(255) UNIQUE NOT NULL",
                "phone": "VARCHAR(20)",
                "region": "VARCHAR(100)",
                "vineyard_name": "VARCHAR(200)",
                "hectares": "DECIMAL(10,2) CHECK (hectares >= 0)",
                "grape_type": "VARCHAR(100)",
                "avatar_url": "VARCHAR(500)",
                "is_verified": "BOOLEAN DEFAULT false",
                "password_hash": "VARCHAR(255) NOT NULL",
                "role_id": "INTEGER DEFAULT 1 REFERENCES roles(id) ON DELETE RESTRICT",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "last_login": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true"
            })
            logger.info("✅ Tabla users creada exitosamente")
        else:
            # Verificar si existe la columna role_id, si no, agregarla
            try:
                await db.execute_query("SELECT role_id FROM users LIMIT 1")
            except:
                logger.info("📋 Agregando columna role_id a tabla users...")
                # Primero agregar la columna sin la referencia
                await db.execute_query("ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 1")
                # Actualizar usuarios existentes para que tengan rol de usuario (1)
                await db.execute_query("UPDATE users SET role_id = 1 WHERE role_id IS NULL")
                # Ahora agregar la referencia de clave foránea
                try:
                    await db.execute_query("ALTER TABLE users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id)")
                except Exception as fk_error:
                    logger.warning(f"No se pudo agregar la clave foránea: {fk_error}")
                logger.info("✅ Columna role_id agregada y usuarios actualizados")

            # Asegurar columna is_verified
            try:
                await db.execute_query("SELECT is_verified FROM users LIMIT 1")
            except Exception:
                logger.info("📋 Agregando columna is_verified a tabla users...")
                await db.execute_query("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false")
                # Index para verificación
                await db.execute_query("CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified)")
        
        # Tabla de dispositivos IoT
        if "devices" not in tables:
            logger.info("📋 Creando tabla devices...")
            await db.create_table("devices", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE",
                "device_code": "VARCHAR(12) UNIQUE NOT NULL",  # Código verificador único tipo patente
                "name": "VARCHAR(100)",
                "device_type": "VARCHAR(50) NOT NULL DEFAULT 'humidity_sensor'",
                "location": "VARCHAR(200)",
                "plant_type": "VARCHAR(100)",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "last_seen": "TIMESTAMP",
                "connected_at": "TIMESTAMP",  # Cuando se conectó por primera vez
                "active": "BOOLEAN DEFAULT true",
                "connected": "BOOLEAN DEFAULT false",  # Si está conectado a un usuario
                "config": "JSONB"
            })
            logger.info("✅ Tabla devices creada exitosamente")
            
            # Crear índice único para device_code
            await db.execute_query("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_code ON devices(device_code);
            """)
            logger.info("✅ Índice único para device_code creado")
        
        # Tabla de verificación de email
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

        # Tabla de sensores de humedad
        if "sensor_humedad_suelo" not in tables:
            logger.info("📋 Creando tabla sensor_humedad_suelo...")
            await db.create_table("sensor_humedad_suelo", {
                "id": "SERIAL PRIMARY KEY",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE ON UPDATE CASCADE",
                "valor": "DOUBLE PRECISION NOT NULL CHECK (valor >= 0 AND valor <= 100)",
                "luz": "DOUBLE PRECISION CHECK (luz >= 0)",
                "temperatura": "DOUBLE PRECISION CHECK (temperatura >= -20 AND temperatura <= 60)",
                "humedad_aire": "DOUBLE PRECISION CHECK (humedad_aire >= 0 AND humedad_aire <= 100)",
                "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "bateria": "DOUBLE PRECISION CHECK (bateria >= 0 AND bateria <= 100)",
                "senal": "INTEGER CHECK (senal >= -100 AND senal <= 0)"
            })
            logger.info("✅ Tabla sensor_humedad_suelo creada exitosamente")
        
        # Tabla de alertas
        if "alerts" not in tables:
            logger.info("📋 Creando tabla alerts...")
            await db.create_table("alerts", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE ON UPDATE CASCADE",
                "alert_type": "VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_humidity', 'high_humidity', 'device_offline', 'battery_low'))",
                "message": "TEXT NOT NULL",
                "severity": "VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'))",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "read_at": "TIMESTAMP",
                "resolved_at": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true",
                "deleted_at": "TIMESTAMP"  # Soft delete
            })
            logger.info("✅ Tabla alerts creada exitosamente")
        
        # Tabla de recomendaciones de IA
        if "ai_recommendations" not in tables:
            logger.info("📋 Creando tabla ai_recommendations...")
            await db.create_table("ai_recommendations", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE ON UPDATE CASCADE",
                "recommendation_type": "VARCHAR(50) NOT NULL",
                "title": "VARCHAR(200) NOT NULL",
                "description": "TEXT NOT NULL",
                "action_items": "JSONB",
                "priority": "VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "applied_at": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true",
                "deleted_at": "TIMESTAMP"  # Soft delete
            })
            logger.info("✅ Tabla ai_recommendations creada exitosamente")
        
        # Tabla de cotizaciones
        if "quotes" not in tables:
            logger.info("📋 Creando tabla quotes...")
            await db.create_table("quotes", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE",
                "reference_id": "VARCHAR(20) UNIQUE NOT NULL",
                "name": "VARCHAR(100) NOT NULL",
                "email": "VARCHAR(255) NOT NULL",
                "phone": "VARCHAR(20)",
                "company": "VARCHAR(200)",
                "vineyard_name": "VARCHAR(200)",
                "hectares": "DECIMAL(10,2)",
                "grape_type": "VARCHAR(100)",
                "region": "VARCHAR(100)",
                "location": "VARCHAR(200)",
                "num_devices": "INTEGER DEFAULT 1 CHECK (num_devices > 0)",
                "installation_type": "VARCHAR(50)",
                "budget_range": "VARCHAR(50)",
                "message": "TEXT",
                "status": "VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'quoted', 'accepted', 'rejected', 'cancelled'))",
                "assigned_to": "INTEGER REFERENCES users(id) ON DELETE SET NULL",
                "quoted_price": "DECIMAL(12,2)",
                "quoted_at": "TIMESTAMP",
                "ip_address": "VARCHAR(45)",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "updated_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "deleted_at": "TIMESTAMP"  # Soft delete
            })
            logger.info("✅ Tabla quotes creada exitosamente")
            
    except Exception as e:
        log_error_with_context(e, "create_tables")
        raise

async def _create_indexes(db: AsyncPgDbToolkit):
    """Crea índices para optimizar las consultas"""
    try:
        logger.info("🔍 Creando índices de optimización...")
        
        # Índices para usuarios (campos de búsqueda frecuente)
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
            CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
            CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
            CREATE INDEX IF NOT EXISTS idx_users_vineyard ON users(vineyard_name);
            CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
            CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
            CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
        """)
        logger.info("✅ Índices para tabla users creados")
        
        # Índices para dispositivos
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
            CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(active);
            CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
            CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);
            CREATE INDEX IF NOT EXISTS idx_devices_connected ON devices(connected);
        """)
        logger.info("✅ Índices para tabla devices creados")
        
        # Índices para sensores (optimización de consultas con agregaciones)
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_sensor_device_id ON sensor_humedad_suelo(device_id);
            CREATE INDEX IF NOT EXISTS idx_sensor_fecha ON sensor_humedad_suelo(fecha DESC);
            CREATE INDEX IF NOT EXISTS idx_sensor_device_fecha ON sensor_humedad_suelo(device_id, fecha DESC);
            CREATE INDEX IF NOT EXISTS idx_sensor_valor ON sensor_humedad_suelo(valor);
            CREATE INDEX IF NOT EXISTS idx_sensor_temperatura ON sensor_humedad_suelo(temperatura);
        """)
        logger.info("✅ Índices para tabla sensor_humedad_suelo creados")
        
        # Índices para alertas
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
            CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active);
            CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
        """)
        logger.info("✅ Índices para tabla alerts creados")
        
        # Índices para recomendaciones
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON ai_recommendations(user_id);
            CREATE INDEX IF NOT EXISTS idx_recommendations_device_id ON ai_recommendations(device_id);
            CREATE INDEX IF NOT EXISTS idx_recommendations_active ON ai_recommendations(active);
            CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON ai_recommendations(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_recommendations_type ON ai_recommendations(recommendation_type);
        """)
        logger.info("✅ Índices para tabla ai_recommendations creados")

        # Índices para verificación de email
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_verification_tokens(user_id);
            CREATE INDEX IF NOT EXISTS idx_email_tokens_expires_at ON email_verification_tokens(expires_at);
            CREATE INDEX IF NOT EXISTS idx_email_tokens_used_at ON email_verification_tokens(used_at);
        """)
        logger.info("✅ Índices para tabla email_verification_tokens creados")
        
        # Índices para cotizaciones
        await db.execute_query("""
            CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_reference_id ON quotes(reference_id);
            CREATE INDEX IF NOT EXISTS idx_quotes_email ON quotes(email);
            CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
            CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
        """)
        logger.info("✅ Índices para tabla quotes creados")
        
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
        
        # Verificar si el resultado es válido
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
        
        # Contar registros en cada tabla
        stats = {}
        tables = ["users", "devices", "sensor_humedad_suelo", "alerts", "ai_recommendations"]
        
        for table in tables:
            result = await db.execute_query(f"SELECT COUNT(*) as count FROM {table}")
            if result is not None and not result.empty:
                stats[f"{table}_count"] = result.iloc[0]["count"]
            else:
                stats[f"{table}_count"] = 0
        
        # Obtener tamaño de la base de datos
        size_result = await db.execute_query("""
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        """)
        if size_result is not None and not size_result.empty:
            stats["database_size"] = size_result.iloc[0]["size"]
        else:
            stats["database_size"] = "Unknown"
        
        return stats
        
    except Exception as e:
        log_error_with_context(e, "database_stats")
        return {"error": str(e)} 