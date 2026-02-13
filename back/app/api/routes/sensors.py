"""
Rutas para gestión de sensores IoT (v2 con UUID).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
import logging

from ..core.auth_user import get_current_user, get_current_active_user
from ..core.database import get_db
from ..core.redis_cache import get_redis_cache
from ..schemas.sensors import (
    SensorRegister, 
    SensorAssign, 
    SensorDataInput, 
    SensorResponse, 
    SensorReadingResponse,
    SensorToggle
)
from app.services.sensor_readings_service import SensorReadingsService
from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.post("/register", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
async def register_sensor(
    sensor_data: SensorRegister,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Registra un nuevo sensor con su device_id único (v2).
    Estado inicial: status='inactive', plant_id=NULL
    """
    try:
        # Verificar que el device_id no esté en uso
        existing = await db.execute_query(
            "SELECT id FROM sensors WHERE device_id = %s",
            (sensor_data.device_id,)
        )
        
        if existing is not None and not existing.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El device_id ya está registrado"
            )
        
        # Crear sensor (UUID se genera automáticamente)
        sensor_dict = {
            "device_id": sensor_data.device_id,
            "user_id": current_user["id"],
            "name": sensor_data.name,
            "device_type": sensor_data.device_type,
            "status": "inactive",  # Estado inicial
            "plant_id": None  # No asignado inicialmente
        }
        
        # Insertar usando execute_query porque insert_records puede tener problemas con UUID
        columns = list(sensor_dict.keys())
        values = list(sensor_dict.values())
        placeholders = ", ".join(["%s"] * len(values))
        columns_str = ", ".join(columns)
        
        insert_query = f"""
            INSERT INTO sensors ({columns_str})
            VALUES ({placeholders})
            RETURNING id, device_id, user_id, plant_id, name, device_type, status, 
                     last_connection, created_at, updated_at
        """
        
        result = await db.execute_query(insert_query, tuple(values))
        
        if result is None or result.empty:
            raise Exception("No se pudo crear el sensor")
        
        sensor = result.iloc[0].to_dict()
        
        # Convertir UUID a string si es necesario
        if hasattr(sensor.get("id"), "__str__"):
            sensor["id"] = str(sensor["id"])
        
        return SensorResponse(**sensor)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registrando sensor: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registrando sensor: {str(e)}"
        )


@router.post("/{sensor_id}/assign")
async def assign_sensor_to_plant(
    sensor_id: UUID,
    assign_data: SensorAssign,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Vincula un sensor con una planta (relación 1:1) (v2).
    Actualiza: sensors.plant_id, plants.sensor_id
    """
    try:
        plant_id = assign_data.plant_id
        
        # Verificar que el sensor pertenece al usuario
        sensors_result = await db.execute_query(
            "SELECT * FROM sensors WHERE id = %s AND user_id = %s",
            (str(sensor_id), current_user["id"])
        )
        
        if sensors_result is None or sensors_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        
        # Verificar que la planta pertenece al usuario
        plants_result = await db.execute_query(
            "SELECT * FROM plants WHERE id = %s AND user_id = %s",
            (plant_id, current_user["id"])
        )
        
        if plants_result is None or plants_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada"
            )
        
        # Si el sensor ya está asignado a otra planta, desasignarlo primero
        sensor = sensors_result.iloc[0].to_dict()
        if sensor.get("plant_id") and sensor["plant_id"] != plant_id:
            # Desasignar de la planta anterior
            await db.execute_query(
                "UPDATE plants SET sensor_id = NULL, updated_at = %s WHERE sensor_id = %s",
                (datetime.utcnow(), str(sensor_id))
            )
        
        # Actualizar sensor (asignar plant_id)
        await db.execute_query(
            "UPDATE sensors SET plant_id = %s, status = 'active', updated_at = %s WHERE id = %s",
            (plant_id, datetime.utcnow(), str(sensor_id))
        )
        
        # Actualizar planta (asignar sensor_id)
        await db.execute_query(
            "UPDATE plants SET sensor_id = %s, updated_at = %s WHERE id = %s",
            (str(sensor_id), datetime.utcnow(), plant_id)
        )
        
        return {"message": "Sensor asignado correctamente a la planta", "sensor_id": str(sensor_id), "plant_id": plant_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error asignando sensor: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error asignando sensor: {str(e)}"
        )


@router.post("/data")
async def receive_sensor_data(
    sensor_data: SensorDataInput,
    db: AsyncPgDbToolkit = Depends(get_db),
    cache = Depends(get_redis_cache)
):
    """
    Endpoint público (sin auth) para que el dispositivo envíe datos (v2).
    Autenticación por device_id.
    
    Proceso:
    1. Valida device_id
    2. Verifica que sensor esté activo y asignado a una planta
    3. Usa SensorReadingsService para guardar lectura e invalidar cache
    4. Actualiza last_connection del sensor
    """
    try:
        # Validar device_id
        sensors_result = await db.execute_query(
            "SELECT * FROM sensors WHERE device_id = %s",
            (sensor_data.device_id,)
        )
        
        if sensors_result is None or sensors_result.empty:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Device ID inválido"
            )
        
        sensor = sensors_result.iloc[0].to_dict()
        sensor_uuid = UUID(str(sensor["id"]))
        
        # Verificar que esté activo
        if sensor.get("status") != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sensor inactivo (estado: {sensor.get('status')})"
            )
        
        # Verificar que esté asignado a una planta
        plant_id = sensor.get("plant_id")
        if not plant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sensor no asignado a ninguna planta"
            )
        
        # Usar servicio para crear lectura
        service = SensorReadingsService(db, cache)
        reading = await service.create_reading(
            sensor_id=sensor_uuid,
            user_id=int(sensor["user_id"]),
            plant_id=int(plant_id),
            data={
                "temperature": sensor_data.temperature,
                "air_humidity": sensor_data.air_humidity,
                "soil_moisture": sensor_data.soil_moisture,
                "light_intensity": sensor_data.light_intensity,
                "electrical_conductivity": sensor_data.electrical_conductivity
            }
        )
        
        # Obtener nombre de la planta
        plants_result = await db.execute_query(
            "SELECT plant_name FROM plants WHERE id = %s",
            (plant_id,)
        )
        plant_name = plants_result.iloc[0]["plant_name"] if plants_result is not None and not plants_result.empty else "Planta"
        
        return {
            "success": True,
            "message": "Datos recibidos correctamente",
            "reading_id": reading["id"],
            "plant_id": plant_id,
            "plant_name": plant_name,
            "timestamp": reading["timestamp"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recibiendo datos del sensor: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando datos: {str(e)}"
        )


@router.get("/{sensor_id}/latest", response_model=SensorReadingResponse)
async def get_latest_reading(
    sensor_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
    cache = Depends(get_redis_cache)
):
    """
    Obtiene la última lectura de un sensor (con cache Redis).
    """
    try:
        # Verificar que el sensor pertenece al usuario
        sensors_result = await db.execute_query(
            "SELECT id FROM sensors WHERE id = %s AND user_id = %s",
            (str(sensor_id), current_user["id"])
        )
        
        if sensors_result is None or sensors_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        
        # Usar servicio para obtener última lectura (con cache)
        service = SensorReadingsService(db, cache)
        reading = await service.get_latest_reading(sensor_id)
        
        if not reading:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay lecturas para este sensor"
            )
        
        # Convertir timestamp string a datetime
        reading["timestamp"] = datetime.fromisoformat(reading["timestamp"])
        reading["created_at"] = datetime.fromisoformat(reading["created_at"])
        reading["id"] = UUID(reading["id"])
        reading["sensor_id"] = UUID(reading["sensor_id"])
        
        return SensorReadingResponse(**reading)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo última lectura: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo última lectura: {str(e)}"
        )


@router.get("/{sensor_id}/daily-avg")
async def get_daily_average(
    sensor_id: UUID,
    date: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
    cache = Depends(get_redis_cache)
):
    """
    Obtiene el promedio diario de lecturas de un sensor (con cache Redis).
    """
    try:
        # Verificar que el sensor pertenece al usuario
        sensors_result = await db.execute_query(
            "SELECT id FROM sensors WHERE id = %s AND user_id = %s",
            (str(sensor_id), current_user["id"])
        )
        
        if sensors_result is None or sensors_result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        
        # Usar servicio para obtener promedio diario (con cache)
        service = SensorReadingsService(db, cache)
        avg = await service.get_daily_average(sensor_id, date)
        
        if not avg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No hay lecturas para este sensor en la fecha {date.isoformat()}"
            )
        
        return avg
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo promedio diario: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo promedio diario: {str(e)}"
        )


@router.get("/", response_model=List[SensorResponse])
async def list_sensors(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Retorna sensores del usuario con estado de asignación.
    """
    try:
        # Usar execute_query para evitar problemas con order_by
        sensors = await db.execute_query(
            """
            SELECT * FROM sensors 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            """,
            (current_user["id"],)
        )
        
        if sensors is None or sensors.empty:
            return []
        
        # Convertir a lista de SensorResponse
        result = []
        for _, row in sensors.iterrows():
            try:
                sensor_dict = row.to_dict()
                result.append(SensorResponse(**sensor_dict))
            except Exception as e:
                logger.error(f"Error procesando sensor {row.get('id', 'unknown')}: {str(e)}")
                continue
        
        return result
        
    except Exception as e:
        logger.error(f"Error listando sensores: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando sensores: {str(e)}"
        )


@router.put("/{sensor_id}/toggle")
async def toggle_sensor(
    sensor_id: int,
    is_active: bool,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Cambia estado is_active del sensor.
    Si is_active=False, el dispositivo debe dejar de enviar datos.
    """
    try:
        # Verificar que el sensor pertenece al usuario
        sensors = await db.fetch_records(
            "sensors",
            conditions={"id": sensor_id, "user_id": current_user["id"]}
        )
        
        if sensors is None or sensors.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        
        # Actualizar estado
        await db.execute_query(
            "UPDATE sensors SET is_active = %s, updated_at = %s WHERE id = %s",
            (is_active, datetime.now(), sensor_id)
        )
        
        return {"message": f"Sensor {'activado' if is_active else 'desactivado'} correctamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cambiando estado del sensor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cambiando estado: {str(e)}"
        )


@router.get("/{sensor_id}/readings")
async def get_sensor_readings(
    sensor_id: int,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene las últimas lecturas de un sensor.
    """
    try:
        # Verificar que el sensor pertenece al usuario
        sensors = await db.execute_query(
            """
            SELECT * FROM sensors 
            WHERE id = %s AND user_id = %s
            """,
            (sensor_id, current_user["id"])
        )
        
        if sensors is None or sensors.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado"
            )
        
        # Obtener lecturas usando execute_query
        readings = await db.execute_query(
            """
            SELECT id, sensor_id, plant_id, humidity, temperature, pressure, reading_time
            FROM sensor_readings 
            WHERE sensor_id = %s 
            ORDER BY reading_time DESC 
            LIMIT %s
            """,
            (sensor_id, limit)
        )
        
        if readings is None or readings.empty:
            return []
        
        # Convertir a lista de diccionarios
        result = []
        for _, row in readings.iterrows():
            result.append(row.to_dict())
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo lecturas del sensor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo lecturas: {str(e)}"
        )
