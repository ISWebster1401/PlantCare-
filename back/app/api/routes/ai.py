from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.core.ai_service import ai_service
from pgdbtoolkit import AsyncPgDbToolkit
from datetime import datetime

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para IA
router = APIRouter(
    prefix="/ai",
    tags=["Inteligencia Artificial"],
    responses={
        401: {"description": "No autorizado - Login requerido"},
        400: {"description": "Datos inválidos"},
        500: {"description": "Error interno del servidor"}
    }
)


class GeneralQuery(BaseModel):
    """Consulta general sobre plantas.

    Nota: se permite desde 1 caracter para que mensajes cortos como "hola"
    no fallen con error 422. Igual en el backend normalizamos espacios.
    """
    question: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Pregunta sobre cuidado de plantas",
    )


class DeviceQuery(BaseModel):
    """Consulta específica sobre un sensor/planta del usuario"""
    device_id: int = Field(..., description="ID del sensor a analizar")
    question: Optional[str] = Field(None, max_length=500, description="Pregunta específica (opcional)")


class AIResponse(BaseModel):
    """Respuesta del asistente de IA"""
    question: str
    response: str
    context_type: str  # "general" o "device_specific"
    device_info: Optional[Dict[str, Any]] = None
    sensor_data: Optional[Dict[str, Any]] = None
    tokens_used: Dict[str, int]
    timestamp: str


@router.post("/ask", response_model=AIResponse)
async def ask_general_question(
    query: GeneralQuery,
    current_user: dict = Depends(get_current_active_user),
):
    """Consulta general a la IA (requiere login)."""
    try:
        logger.info(f"Usuario {current_user['email']} consulta IA: {query.question[:50]}...")

        profile_context = f"""
PERFIL DEL USUARIO:
- Nombre: {current_user.get('full_name') or current_user.get('email')}
"""

        enhanced_query = f"""
{profile_context}
PREGUNTA DEL USUARIO: {query.question}
Da una respuesta clara, concisa y aplicable para una persona que cuida plantas en casa.
"""

        ai_response = await ai_service.get_plant_recommendation(enhanced_query)

        return AIResponse(
            question=query.question,
            response=ai_response["recomendacion"],
            context_type="general",
            tokens_used=ai_response.get("usage", {}),
            timestamp=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error en consulta IA: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error procesando consulta: {error_msg}")


@router.post("/analyze-device", response_model=AIResponse)
async def analyze_device_data(
    query: DeviceQuery,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Analizar datos de un sensor del usuario (tabla sensors / sensor_readings)."""
    try:
        logger.info(f"Usuario {current_user['email']} solicita análisis del sensor {query.device_id}")

        # Verificar que el sensor pertenece al usuario
        sensors_df = await db.execute_query(
            """
            SELECT s.id, s.user_id, s.device_key, s.device_type, s.is_active, s.is_assigned,
                   s.last_connection, p.id AS plant_id, p.plant_name, p.plant_type
            FROM sensors s
            LEFT JOIN plants p ON p.sensor_id = s.id
            WHERE s.id = %s AND s.user_id = %s
            """,
            (query.device_id, current_user["id"]),
        )

        if sensors_df is None or sensors_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sensor no encontrado",
            )

        sensor = sensors_df.iloc[0].to_dict()

        # Última lectura del sensor
        readings_df = await db.execute_query(
            """
            SELECT * FROM sensor_readings
            WHERE sensor_id = %s
            ORDER BY reading_time DESC
            LIMIT 1
            """,
            (sensor["id"],),
        )

        if readings_df is None or readings_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay datos de sensores disponibles para este dispositivo",
            )

        latest = readings_df.iloc[0].to_dict()
        sensor_data = {
            "humidity": latest.get("humidity"),
            "temperature": latest.get("temperature"),
            "reading_time": str(latest.get("reading_time")),
        }

        device_info = {
            "name": sensor.get("plant_name") or f"Sensor {sensor['device_key']}",
            "location": None,
            "plant_type": sensor.get("plant_type"),
            "device_code": sensor["device_key"],
        }

        question = query.question or "Analiza el estado actual de esta planta a partir de los datos del sensor." 

        enhanced_query = f"""
PLANTA: {device_info['name']} ({device_info['plant_type'] or 'Tipo no especificado'})
SENSOR: {device_info['device_code']}

DATOS ACTUALES DEL SENSOR:
- Humedad del suelo: {sensor_data['humidity']}%
- Temperatura: {sensor_data.get('temperature', 'N/A')}°C
- Última lectura: {sensor_data['reading_time']}

PREGUNTA DEL USUARIO: {question}
Da recomendaciones concretas de riego, luz y cuidados para mejorar la salud de la planta.
"""

        ai_response = await ai_service.get_plant_recommendation(enhanced_query)

        return AIResponse(
            question=question,
            response=ai_response["recomendacion"],
            context_type="device_specific",
            device_info=device_info,
            sensor_data=sensor_data,
            tokens_used=ai_response.get("usage", {}),
            timestamp=datetime.utcnow().isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error en análisis de dispositivo: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error en análisis: {error_msg}")


@router.get("/my-devices", response_model=List[Dict[str, Any]])
async def get_user_devices_for_ai(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Lista simplificada de sensores del usuario para el selector de IA.

    Usa la tabla nueva `sensors` en lugar del antiguo `devices` para que
    **no aparezcan errores en los logs** si la tabla vieja no existe.
    """
    try:
        sensors_df = await db.execute_query(
            """
            SELECT s.id, s.device_key, s.device_type, s.is_active, s.is_assigned,
                   s.last_connection, p.plant_name, p.plant_type
            FROM sensors s
            LEFT JOIN plants p ON p.sensor_id = s.id
            WHERE s.user_id = %s
            ORDER BY s.created_at DESC
            """,
            (current_user["id"],),
        )

        if sensors_df is None or sensors_df.empty:
            return []

        simplified: List[Dict[str, Any]] = []
        for _, row in sensors_df.iterrows():
            data = row.to_dict()
            simplified.append(
                {
                    "id": data["id"],
                    "name": data.get("plant_name") or f"Sensor {data['device_key']}",
                    "device_code": data["device_key"],
                    "plant_type": data.get("plant_type"),
                    "connected": bool(data.get("is_active", False)),
                    "last_seen": data.get("last_connection"),
                }
            )

        return simplified

    except Exception as e:
        # Importante: no reventar la app ni spamear logs críticos
        logger.warning(f"No se pudieron obtener sensores para IA, devolviendo lista vacía: {e}")
        return []


@router.get("/health")
async def ai_health_check():
    """Health check simple del servicio de IA."""
    try:
        test_response = await ai_service.get_plant_recommendation(
            "¿Cuál es la humedad ideal para una planta de interior promedio?"
        )
        return {
            "status": "healthy",
            "ai_service": "operational",
            "model": "gpt-3.5-turbo",
            "test_tokens": test_response.get("usage", {}),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"❌ Error en health check de IA: {str(e)}")
        return {
            "status": "unhealthy",
            "ai_service": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.post("/test-simple")
async def test_ai_simple():
    """Endpoint de prueba rápida de IA (sin auth), para debug."""
    try:
        logger.info("🧪 Probando servicio de IA...")
        test_query = "¿Cómo cuidar una suculenta en interior?"
        ai_response = await ai_service.get_plant_recommendation(test_query)
        return {
            "status": "success",
            "query": test_query,
            "response": ai_response["recomendacion"],
            "tokens": ai_response.get("usage", {}),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"❌ Error en prueba simple de IA: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "details": "Verifica que OPENAI_API_KEY esté configurada correctamente",
            "timestamp": datetime.utcnow().isoformat(),
        }
