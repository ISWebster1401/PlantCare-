from pgdbtoolkit import AsyncPgDbToolkit
from .database import DB_CONFIG

async def create_tables():
    """
    Crea las tablas necesarias en la base de datos
    """
    db = AsyncPgDbToolkit(db_config=DB_CONFIG)
    
    # Crear tabla devices si no existe
    tables = await db.get_tables()
    if "devices" not in tables:
        await db.create_table(
            "devices",
            {
                "id": "SERIAL PRIMARY KEY",
                "device_key": "VARCHAR(255) UNIQUE NOT NULL",
                "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            }
        )
    
    # Crear tabla sensor_humedad_suelo si no existe
    if "sensor_humedad_suelo" not in tables:
        await db.create_table(
            "sensor_humedad_suelo",
            {
                "id": "SERIAL PRIMARY KEY",
                "device_id": "INTEGER REFERENCES devices(id)",
                "valor": "DOUBLE PRECISION NOT NULL",
                "fecha": "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            }
        )
    
    await db.close()