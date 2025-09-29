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
            
            # Crear índices para optimizar consultas (comentado temporalmente)
            # await _create_indexes(db)
            
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
                "password_hash": "VARCHAR(255) NOT NULL",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "last_login": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true",
                "role": "VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'))"
            })
            logger.info("✅ Tabla users creada exitosamente")
        
        # Tabla de dispositivos IoT
        if "devices" not in tables:
            logger.info("📋 Creando tabla devices...")
            await db.create_table("devices", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE SET NULL",
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
        
        # Tabla de sensores de humedad
        if "sensor_humedad_suelo" not in tables:
            logger.info("📋 Creando tabla sensor_humedad_suelo...")
            await db.create_table("sensor_humedad_suelo", {
                "id": "SERIAL PRIMARY KEY",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE",
                "valor": "DOUBLE PRECISION NOT NULL CHECK (valor >= 0 AND valor <= 100)",
                "luz": "DOUBLE PRECISION CHECK (luz >= 0)",
                "temperatura": "DOUBLE PRECISION CHECK (temperatura >= -20 AND temperatura <= 60)",
                "humedad_ambiente": "DOUBLE PRECISION CHECK (humedad_ambiente >= 0 AND humedad_ambiente <= 100)",
                "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP",
                "battery_level": "DOUBLE PRECISION CHECK (battery_level >= 0 AND battery_level <= 100)",
                "signal_strength": "INTEGER CHECK (signal_strength >= -100 AND signal_strength <= 0)"
            })
            logger.info("✅ Tabla sensor_humedad_suelo creada exitosamente")
        
        # Tabla de alertas
        if "alerts" not in tables:
            logger.info("📋 Creando tabla alerts...")
            await db.create_table("alerts", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE",
                "alert_type": "VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_humidity', 'high_humidity', 'device_offline', 'battery_low'))",
                "message": "TEXT NOT NULL",
                "severity": "VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical'))",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "read_at": "TIMESTAMP",
                "resolved_at": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true"
            })
            logger.info("✅ Tabla alerts creada exitosamente")
        
        # Tabla de recomendaciones de IA
        if "ai_recommendations" not in tables:
            logger.info("📋 Creando tabla ai_recommendations...")
            await db.create_table("ai_recommendations", {
                "id": "SERIAL PRIMARY KEY",
                "user_id": "INTEGER REFERENCES users(id) ON DELETE CASCADE",
                "device_id": "INTEGER REFERENCES devices(id) ON DELETE CASCADE",
                "recommendation_type": "VARCHAR(50) NOT NULL",
                "title": "VARCHAR(200) NOT NULL",
                "description": "TEXT NOT NULL",
                "action_items": "JSONB",
                "priority": "VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'))",
                "created_at": "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
                "applied_at": "TIMESTAMP",
                "active": "BOOLEAN DEFAULT true"
            })
            logger.info("✅ Tabla ai_recommendations creada exitosamente")
            
    except Exception as e:
        log_error_with_context(e, "create_tables")
        raise

#async def _create_indexes(db: AsyncPgDbToolkit):
#    """Crea índices para optimizar las consultas"""
#    try:
#        logger.info("🔍 Creando índices de optimización...")
        
        # Índices para usuarios
        #await db.execute_query("""
        #    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        #   CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
        #   CREATE INDEX IF NOT EXISTS idx_users_region ON users(region);
        #   CREATE INDEX IF NOT EXISTS idx_users_vineyard ON users(vineyard_name);
        #   CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        #""")
        
        # Índices para dispositivos
#        await db.execute_query("""
#            CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
 #           CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(active);
  #          CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
   #         CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen DESC);
    #    """)
     #   
        # Índices para sensores
     #   await db.execute_query("""
      #      CREATE INDEX IF NOT EXISTS idx_sensor_device_id ON sensor_humedad_suelo(device_id);
       #     CREATE INDEX IF NOT EXISTS idx_sensor_fecha ON sensor_humedad_suelo(fecha DESC);
        #    CREATE INDEX IF NOT EXISTS idx_sensor_device_fecha ON sensor_humedad_suelo(device_id, fecha DESC);
         #   CREATE INDEX IF NOT EXISTS idx_sensor_valor ON sensor_humedad_suelo(valor);
         #   CREATE INDEX IF NOT EXISTS idx_sensor_temperatura ON sensor_humedad_suelo(temperatura);
        #""")
        
        # Índices para alertas
#        await db.execute_query("""
 #           CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
  #          CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
   #         CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active);
    #        CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
     #       CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
      #  """)
        
        # Índices para recomendaciones
#        await db.execute_query("""
 #           CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON ai_recommendations(user_id);
  #          CREATE INDEX IF NOT EXISTS idx_recommendations_device_id ON ai_recommendations(device_id);
   #         CREATE INDEX IF NOT EXISTS idx_recommendations_active ON ai_recommendations(active);
    #        CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON ai_recommendations(created_at DESC);
     #       CREATE INDEX IF NOT EXISTS idx_recommendations_type ON ai_recommendations(recommendation_type);
#        """)
        
#        logger.info("✅ Índices creados exitosamente")
        
#    except Exception as e:
#        log_error_with_context(e, "create_indexes")
#        raise

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