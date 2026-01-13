"""
Endpoint para insertar datos de prueba para desarrollo/testing
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.core.database import get_db
from app.db.queries import get_user_by_email
from pgdbtoolkit import AsyncPgDbToolkit
from datetime import datetime, timedelta
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/demo",
    tags=["Demo Data"],
    responses={404: {"description": "Not found"}},
)


@router.post("/seed-user-data")
async def seed_user_test_data(
    email: str = "mailmiosebastianwebster200856@gmail.com",
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Inserta datos de prueba para un usuario específico:
    - 3 plantas
    - 2 sensores
    - Lecturas de sensores (últimas 7 días)
    - Algunas entradas del pokedex desbloqueadas
    """
    try:
        # Buscar usuario
        user = await get_user_by_email(db, email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Usuario con email {email} no encontrado"
            )
        
        user_id = user["id"]
        logger.info(f"🌱 Insertando datos de prueba para usuario {user_id} ({email})")
        
        # 1. Crear plantas
        plants_data = [
            {
                "plant_name": "Monstera Pepito",
                "plant_type": "Monstera deliciosa",
                "scientific_name": "Monstera deliciosa",
                "care_level": "Fácil",
                "care_tips": "Luz indirecta brillante; Riego moderado cuando el suelo se seca; Humedad alta",
                "optimal_humidity_min": 60.0,
                "optimal_humidity_max": 80.0,
                "optimal_temp_min": 18.0,
                "optimal_temp_max": 27.0,
                "health_status": "healthy",
                "character_mood": "happy"
            },
            {
                "plant_name": "Cactus Espinito",
                "plant_type": "Cactus",
                "scientific_name": "Echinocactus grusonii",
                "care_level": "Fácil",
                "care_tips": "Luz directa; Riego muy espaciado; Forma esférica",
                "optimal_humidity_min": 20.0,
                "optimal_humidity_max": 40.0,
                "optimal_temp_min": 10.0,
                "optimal_temp_max": 35.0,
                "health_status": "healthy",
                "character_mood": "happy"
            },
            {
                "plant_name": "Suculenta Rosita",
                "plant_type": "Echeveria",
                "scientific_name": "Echeveria elegans",
                "care_level": "Fácil",
                "care_tips": "Luz directa a indirecta brillante; Riego espaciado; Drenaje excelente",
                "optimal_humidity_min": 30.0,
                "optimal_humidity_max": 50.0,
                "optimal_temp_min": 10.0,
                "optimal_temp_max": 27.0,
                "health_status": "healthy",
                "character_mood": "happy"
            }
        ]
        
        plant_ids = []
        for plant_data in plants_data:
            result = await db.execute_query("""
                INSERT INTO plants (
                    user_id, plant_name, plant_type, scientific_name, care_level, care_tips,
                    optimal_humidity_min, optimal_humidity_max, optimal_temp_min, optimal_temp_max,
                    health_status, character_mood, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                user_id, plant_data["plant_name"], plant_data["plant_type"],
                plant_data["scientific_name"], plant_data["care_level"], plant_data["care_tips"],
                plant_data["optimal_humidity_min"], plant_data["optimal_humidity_max"],
                plant_data["optimal_temp_min"], plant_data["optimal_temp_max"],
                plant_data["health_status"], plant_data["character_mood"]
            ))
            plant_id = result.iloc[0]["id"]
            plant_ids.append(plant_id)
            logger.info(f"✅ Planta creada: {plant_data['plant_name']} (ID: {plant_id})")
        
        # 2. Crear sensores
        sensors_data = [
            {
                "device_id": f"ESP8266_{user_id}_001",
                "name": "Sensor Monstera",
                "device_type": "esp8266"
            },
            {
                "device_id": f"ESP8266_{user_id}_002",
                "name": "Sensor Cactus",
                "device_type": "esp8266"
            }
        ]
        
        sensor_uuids = []
        for i, sensor_data in enumerate(sensors_data):
            sensor_uuid = uuid.uuid4()
            result = await db.execute_query("""
                INSERT INTO sensors (
                    id, device_id, user_id, plant_id, name, device_type, status,
                    last_connection, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                str(sensor_uuid), sensor_data["device_id"], user_id,
                plant_ids[i] if i < len(plant_ids) else None,
                sensor_data["name"], sensor_data["device_type"]
            ))
            sensor_uuids.append(sensor_uuid)
            
            # Asignar sensor a planta
            if i < len(plant_ids):
                await db.execute_query("""
                    UPDATE plants SET sensor_id = %s WHERE id = %s
                """, (str(sensor_uuid), plant_ids[i]))
            
            logger.info(f"✅ Sensor creado: {sensor_data['name']} (UUID: {sensor_uuid})")
        
        # 3. Crear lecturas de sensores (últimos 7 días, cada 6 horas)
        now = datetime.utcnow()
        for days_ago in range(7):
            for hour_offset in [0, 6, 12, 18]:
                timestamp = now - timedelta(days=days_ago, hours=hour_offset)
                
                for i, sensor_uuid in enumerate(sensor_uuids):
                    # Valores realistas según el tipo de planta
                    if i == 0:  # Monstera - necesita más humedad
                        soil_moisture = 65.0 + (days_ago * 2)  # Disminuye con el tiempo
                        air_humidity = 70.0
                        temperature = 22.0
                    else:  # Cactus - necesita menos humedad
                        soil_moisture = 25.0 + (days_ago * 1)
                        air_humidity = 35.0
                        temperature = 25.0
                    
                    # Asegurar que los valores estén en rango
                    soil_moisture = max(0, min(100, soil_moisture))
                    air_humidity = max(0, min(100, air_humidity))
                    temperature = max(-20, min(60, int(temperature)))
                    
                    reading_uuid = uuid.uuid4()
                    await db.execute_query("""
                        INSERT INTO sensor_readings (
                            id, sensor_id, user_id, plant_id, temperature, air_humidity,
                            soil_moisture, light_intensity, timestamp, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, (
                        str(reading_uuid), str(sensor_uuid), user_id,
                        plant_ids[i] if i < len(plant_ids) else None,
                        temperature, air_humidity, soil_moisture,
                        500 + (hour_offset * 50),  # Luz según hora del día
                        timestamp
                    ))
        
        logger.info(f"✅ Lecturas de sensores creadas (últimos 7 días)")
        
        # 4. Desbloquear algunas entradas del pokedex
        pokedex_entries = [1, 2, 29, 30, 31]  # Monstera, Monstera adansonii, Echeveria, Jade, Aloe
        for entry_number in pokedex_entries:
            # Obtener catalog_entry_id
            catalog_result = await db.execute_query("""
                SELECT id FROM pokedex_catalog WHERE entry_number = %s
            """, (entry_number,))
            
            if catalog_result is not None and not catalog_result.empty:
                catalog_id = catalog_result.iloc[0]["id"]
                
                # Verificar si ya está desbloqueado
                existing = await db.execute_query("""
                    SELECT id FROM pokedex_user_unlocks
                    WHERE user_id = %s AND catalog_entry_id = %s
                """, (user_id, catalog_id))
                
                if existing is None or existing.empty:
                    await db.execute_query("""
                        INSERT INTO pokedex_user_unlocks (user_id, catalog_entry_id, discovered_at)
                        VALUES (%s, %s, CURRENT_TIMESTAMP)
                    """, (user_id, catalog_id))
                    logger.info(f"✅ Pokedex entry #{entry_number} desbloqueada")
        
        return {
            "message": "Datos de prueba insertados exitosamente",
            "user_id": user_id,
            "email": email,
            "plants_created": len(plant_ids),
            "sensors_created": len(sensor_uuids),
            "readings_created": 7 * 4 * len(sensor_uuids),  # 7 días * 4 lecturas/día * sensores
            "pokedex_unlocked": len(pokedex_entries)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error insertando datos de prueba: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error insertando datos: {str(e)}"
        )
