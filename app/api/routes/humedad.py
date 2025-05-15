from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from pydantic import BaseModel
import logging
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

class HumedadData(BaseModel):
    humedad: float

async def get_device_id(device_key: str = Header(..., alias="X-Device-Key"), db: AsyncPgDbToolkit = Depends(get_db)) -> int:
    """
    Verifica la clave del dispositivo y retorna su ID
    """
    try:
        result = await db.fetch_records(
            "devices",
            columns=["id"],
            conditions={"device_key": device_key}
        )
        
        if result.empty:
            raise HTTPException(status_code=401, detail="Clave de dispositivo inválida")
            
        return result.iloc[0]['id']
    except Exception as e:
        logger.error(f"Error verificando dispositivo: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/sensor-humedad-suelo")
async def save_humedad(
    data: HumedadData,
    device_id: int = Depends(get_device_id),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Guarda una lectura de humedad del suelo
    """
    try:
        await db.insert_records(
            "sensor_humedad_suelo",
            [{
                "device_id": device_id,
                "valor": data.humedad
            }]
        )
        return {"message": "Datos guardados correctamente"}
    except Exception as e:
        logger.error(f"Error guardando datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al guardar los datos")

@router.get("/lector-humedad")
async def get_humedad(
    device_id: int = Depends(get_device_id),
    db: AsyncPgDbToolkit = Depends(get_db)
) -> List[dict]:
    """
    Obtiene las últimas 20 lecturas de humedad para un dispositivo específico
    """
    try:
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["id", "valor", "fecha"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=20
        )
        
        if result.empty:
            return []
            
        # Convertir los datos a un formato más amigable
        return [
            {
                "id": int(row["id"]),
                "valor": float(row["valor"]),
                "fecha": row["fecha"].strftime("%Y-%m-%d %H:%M:%S")
            }
            for _, row in result.iterrows()
        ]
    except Exception as e:
        logger.error(f"Error leyendo datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al leer los datos") 