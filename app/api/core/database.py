from pgdbtoolkit import AsyncPgDbToolkit
from typing import Optional
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'postgres',
    'password': '1401',
    'dbname': 'PlantCare'  # Esto es correcto, coincide con el nombre en pgAdmin
}

_db: Optional[AsyncPgDbToolkit] = None

async def init_db():
    """
    Inicializa la base de datos y crea las tablas necesarias
    """
    try:
        logger.info("Inicializando conexión a la base de datos...")
        db = AsyncPgDbToolkit(db_config=DB_CONFIG)
        logger.info("Conexión establecida exitosamente")
        
        # Verificar si la tabla existe
        logger.info("Verificando tablas existentes...")
        tables = await db.get_tables()
        logger.info(f"Tablas encontradas: {tables}")
        
        if "sensor_humedad_suelo" not in tables:
            logger.info("Creando tabla sensor_humedad_suelo...")
            await db.create_table(
                "sensor_humedad_suelo",
                {
                    "id": "SERIAL PRIMARY KEY",
                    "device_id": "INTEGER REFERENCES devices(id)",
                    "valor": "DOUBLE PRECISION NOT NULL",
                    "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
                }
            )
            logger.info("Tabla sensor_humedad_suelo creada exitosamente")
        else:
            logger.info("Tabla sensor_humedad_suelo ya existe")
        
        return db
    except Exception as e:
        logger.error(f"Error inicializando la base de datos: {str(e)}")
        logger.error("Detalles del error:", exc_info=True)
        raise

async def get_db() -> AsyncPgDbToolkit:
    """
    Obtiene o crea una instancia de AsyncPgDbToolkit
    """
    global _db
    if _db is None:
        logger.info("Creando nueva instancia de base de datos...")
        _db = await init_db()
        logger.info("Nueva instancia de base de datos creada")
    return _db

async def close_db():
    """
    Cierra la conexión a la base de datos
    """
    global _db
    if _db is not None:
        logger.info("Cerrando conexión a la base de datos...")
        await _db.close()
        _db = None
        logger.info("Conexión a la base de datos cerrada exitosamente")