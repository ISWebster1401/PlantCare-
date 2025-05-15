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
    'dbname': 'PlantCare'
}

_db: Optional[AsyncPgDbToolkit] = None

async def init_db():
    """
    Inicializa la base de datos y crea las tablas necesarias
    """
    try:
        db = AsyncPgDbToolkit(db_config=DB_CONFIG)
        
        # Verificar si la tabla existe
        tables = await db.get_tables()
        if "sensor_humedad_suelo" not in tables:
            logger.info("Creando tabla sensor_humedad_suelo...")
            await db.create_table(
                "sensor_humedad_suelo",
                {
                    "id": "SERIAL PRIMARY KEY",
                    "valor": "DOUBLE PRECISION NOT NULL",
                    "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
                }
            )
            logger.info("Tabla sensor_humedad_suelo creada exitosamente")
        
        return db
    except Exception as e:
        logger.error(f"Error inicializando la base de datos: {str(e)}")
        raise

async def get_db() -> AsyncPgDbToolkit:
    """
    Obtiene o crea una instancia de AsyncPgDbToolkit
    """
    global _db
    if _db is None:
        _db = await init_db()
    return _db

async def close_db():
    """
    Cierra la conexión a la base de datos
    """
    global _db
    if _db is not None:
        await _db.close()
        _db = None 