from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List
import logging
from datetime import datetime
from app.api.core.database import get_db
from pgdbtoolkit import AsyncPgDbToolkit
from ..schemas.humedad import HumedadData, DatoHumedad, MensajeRespuesta

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["humedad"]
)

async def get_device_id(device_key: str = Header(..., alias="X-Device-Key"), db = Depends(get_db)) -> int:
    try:
        result = await db.fetch_records(
            "devices",
            columns=["id"],
            conditions={"device_key": device_key}
        )
        
        if result is None or result.empty:
            raise HTTPException(
                status_code=401,
                detail="Dispositivo no autorizado"
            )
            
        return int(result.iloc[0].id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando dispositivo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al verificar el dispositivo"
        )

@router.post("/sensor-humedad-suelo", response_model=MensajeRespuesta)
async def save_humedad(
    data: HumedadData,
    device_id: int = Depends(get_device_id),
    db = Depends(get_db)
):
    try:
        logger.info(f"Recibiendo datos de humedad: {data.humedad}")
        logger.info(f"Device ID: {device_id}")
        
        datos = [{
            "device_id": device_id,
            "valor": data.humedad,
            "fecha": datetime.now()
        }]
        logger.info(f"Datos a insertar: {datos}")
        
        result = await db.insert_records(
            "sensor_humedad_suelo",
            datos
        )
        logger.info(f"Resultado de inserción: {result}")
        logger.info(f"Tipo de resultado: {type(result)}")
        
        if isinstance(result, str):
            # Si es string, probablemente sea un ID directo
            record_id = result
        else:
            # Si es DataFrame, usar iloc
            record_id = int(result.iloc[0].id)
            
        logger.info(f"ID extraído: {record_id}")
        
        return MensajeRespuesta(
            message="Datos guardados correctamente",
            data={"id": record_id}
        )
    except Exception as e:
        logger.error(f"Error guardando datos: {str(e)}")
        logger.error(f"Tipo de error: {type(e)}")
        logger.error(f"Detalles del error:", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al guardar los datos de humedad"
        )

@router.get("/lector-humedad", response_model=List[DatoHumedad])
async def get_humedad(
    device_id: int = Depends(get_device_id),
    db = Depends(get_db)
):
    try:
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["id", "device_id", "valor", "fecha"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=20
        )
        
        if result.empty:
            return []
        
        return [
            DatoHumedad(
                id=int(row["id"]),
                device_id=int(row["device_id"]),
                valor=float(row["valor"]),
                fecha=row["fecha"]
            )
            for _, row in result.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error leyendo datos: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al obtener los datos de humedad"
        )