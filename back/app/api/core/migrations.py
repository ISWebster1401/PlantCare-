from pgdbtoolkit import AsyncPgDbToolkit
from .database import DB_CONFIG

async def create_tables():
    """
    Crea las tablas necesarias en la base de datos
    """
    db = AsyncPgDbToolkit(db_config=DB_CONFIG)
    
    # Crear tabla sensor_humedad_suelo
    await db.create_table(
        "sensor_humedad_suelo",
        {
            "id": "SERIAL PRIMARY KEY",
            "valor": "DOUBLE PRECISION NOT NULL",
            "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
        }
    )
    
    await db.close() 