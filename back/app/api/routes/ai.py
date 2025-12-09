from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.core.ai_service import ai_service
from app.db.queries import get_user_devices, get_device_by_id
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

# Esquemas para las requests de IA
class GeneralQuery(BaseModel):
    """Consulta general sobre plantas"""
    question: str = Field(..., min_length=5, max_length=500, description="Pregunta sobre cuidado de plantas")

class DeviceQuery(BaseModel):
    """Consulta específica sobre un dispositivo del usuario"""
    device_id: int = Field(..., description="ID del dispositivo a analizar")
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
    current_user: dict = Depends(get_current_active_user)  # 🔐 VALIDACIÓN AUTOMÁTICA DE SESIÓN
):
    """
    🤖 CONSULTA GENERAL A LA IA - REQUIERE LOGIN
    
    FLUJO DE PERSISTENCIA:
    1. Frontend envía token desde cookies automáticamente
    2. get_current_active_user() valida el token
    3. Si es válido: current_user tiene los datos del usuario
    4. Si es inválido: Error 401 → Frontend limpia cookies
    """
    try:
        # El usuario ya está validado aquí - current_user contiene sus datos
        logger.info(f"Usuario {current_user['email']} consulta IA: {query.question[:50]}...")
        
        profile_context = f"""
PERFIL DEL PRODUCTOR:
- Nombre: {current_user.get('first_name')} {current_user.get('last_name')}
- Región: {current_user.get('region') or 'Sin especificar'}
- Viñedo: {current_user.get('vineyard_name') or 'Sin especificar'}
- Hectáreas: {current_user.get('hectares') or 'No informadas'}
- Variedad de uva principal: {current_user.get('grape_type') or 'No informada'}
"""

        enhanced_query = f"""
{profile_context}
PREGUNTA DEL USUARIO: {query.question}
Enfoca tu respuesta en viticultura personalizada para este perfil.
"""
        
        ai_response = await ai_service.get_plant_recommendation(enhanced_query)
        
        return AIResponse(
            question=query.question,
            response=ai_response["recomendacion"],
            context_type="general",
            tokens_used=ai_response.get("usage", {}),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error en consulta IA: {error_msg}")
        
        # 🔍 PROPORCIONAR DETALLES ESPECÍFICOS DEL ERROR
        if "api_key" in error_msg.lower():
            detail = "Error de configuración: API Key de OpenAI inválida"
        elif "rate_limit" in error_msg.lower():
            detail = "Límite de requests excedido, intenta en unos segundos"
        elif "insufficient_quota" in error_msg.lower():
            detail = "Cuota de OpenAI agotada, verifica tu saldo"
        elif "cliente no configurado" in error_msg.lower():
            detail = "Servicio de IA no disponible - configuración pendiente"
        else:
            detail = f"Error procesando consulta: {error_msg}"
        
        raise HTTPException(status_code=500, detail=detail)

@router.post("/analyze-device", response_model=AIResponse)
async def analyze_device_data(
    query: DeviceQuery,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Analizar datos específicos de un dispositivo del usuario
    
    Requiere autenticación. Analiza los datos de sensores de un dispositivo
    específico del usuario y proporciona recomendaciones personalizadas.
    """
    try:
        logger.info(f"Usuario {current_user['email']} solicita análisis del dispositivo {query.device_id}")
        
        # Verificar que el dispositivo pertenece al usuario
        device = await get_device_by_id(db, query.device_id)
        if not device:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispositivo no encontrado"
            )
        
        if device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a este dispositivo"
            )
        
        # Obtener los últimos datos del sensor
        recent_data = await db.fetch_records(
            "sensor_humedad_suelo",
            conditions={"device_id": query.device_id},
            order_by="fecha DESC",
            limit=5
        )
        
        if recent_data.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay datos de sensores disponibles para este dispositivo"
            )
        
        latest_reading = recent_data.iloc[0].to_dict()
        
        # Preparar datos del sensor para análisis
        sensor_data = {
            "humedad": latest_reading.get('valor'),
            "temperatura": latest_reading.get('temperatura'),
            "humedad_aire": latest_reading.get('humedad_aire'),
            "luz": latest_reading.get('luz'),
            "bateria": latest_reading.get('bateria'),
            "senal": latest_reading.get('senal'),
            "fecha_lectura": str(latest_reading.get('fecha'))
        }
        
        # Información del dispositivo
        device_info = {
            "name": device.get("name"),
            "location": device.get("location"),
            "plant_type": device.get("plant_type"),
            "device_code": device.get("device_code")
        }
        
        # Construir consulta contextualizada
        profile_context = f"""
PERFIL DEL PRODUCTOR:
- Nombre: {current_user.get('first_name')} {current_user.get('last_name')}
- Región: {current_user.get('region') or 'Sin especificar'}
- Viñedo: {current_user.get('vineyard_name') or 'Sin especificar'}
- Hectáreas: {current_user.get('hectares') or 'No informadas'}
- Variedad de uva principal: {current_user.get('grape_type') or 'No informada'}
"""

        if query.question:
            # Pregunta específica sobre el dispositivo
            enhanced_query = f"""
{profile_context}
DISPOSITIVO: {device_info['name']} ({device_info['device_code']})
UBICACIÓN: {device_info.get('location', 'No especificada')}
TIPO DE PLANTA: {device_info.get('plant_type', 'No especificada')}

DATOS ACTUALES DEL SENSOR:
💧 Humedad del suelo: {sensor_data['humedad']}%
🌡️ Temperatura: {sensor_data.get('temperatura', 'N/A')}°C
💨 Humedad del aire: {sensor_data.get('humedad_aire', 'N/A')}%
☀️ Nivel de luz: {sensor_data.get('luz', 'N/A')}%
🔋 Batería: {sensor_data.get('bateria', 'N/A')}%
📶 Señal WiFi: {sensor_data.get('senal', 'N/A')} dBm
📅 Última lectura: {sensor_data['fecha_lectura']}

PREGUNTA ESPECÍFICA: {query.question}

Analiza estos datos y responde la pregunta específica del usuario.
"""
        else:
            # Análisis general del dispositivo
            enhanced_query = f"""
{profile_context}
ANÁLISIS COMPLETO DEL DISPOSITIVO: {device_info['name']}

INFORMACIÓN:
- Código: {device_info['device_code']}
- Ubicación: {device_info.get('location', 'No especificada')}
- Tipo de planta: {device_info.get('plant_type', 'No especificada')}

DATOS ACTUALES:
💧 Humedad del suelo: {sensor_data['humedad']}%
🌡️ Temperatura: {sensor_data.get('temperatura', 'N/A')}°C
💨 Humedad del aire: {sensor_data.get('humedad_aire', 'N/A')}%
☀️ Nivel de luz: {sensor_data.get('luz', 'N/A')}%
🔋 Batería: {sensor_data.get('bateria', 'N/A')}%

Proporciona un análisis completo del estado actual y recomendaciones específicas.
"""
        
        ai_response = await ai_service.get_plant_recommendation(enhanced_query)
        
        return AIResponse(
            question=query.question or "Análisis completo del dispositivo",
            response=ai_response["recomendacion"],
            context_type="device_specific",
            device_info=device_info,
            sensor_data=sensor_data,
            tokens_used=ai_response.get("usage", {}),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error en análisis de dispositivo: {error_msg}")
        
        # 🔍 DETALLES ESPECÍFICOS DEL ERROR
        if "api_key" in error_msg.lower():
            detail = "Error de configuración: API Key de OpenAI inválida"
        elif "dispositivo no encontrado" in error_msg.lower():
            detail = "Dispositivo no encontrado o no tienes permisos"
        else:
            detail = f"Error en análisis: {error_msg}"
        
        raise HTTPException(status_code=500, detail=detail)

@router.get("/my-devices", response_model=List[Dict[str, Any]])
async def get_user_devices_for_ai(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtener lista de dispositivos del usuario para consultas de IA
    
    Retorna una lista simplificada de dispositivos que el usuario puede
    seleccionar para hacer consultas específicas a la IA.
    """
    try:
        devices = await get_user_devices(db, current_user["id"])
        
        # Simplificar la información para el frontend
        simplified_devices = []
        for device in devices:
            simplified_devices.append({
                "id": device["id"],
                "name": device["name"],
                "device_code": device["device_code"],
                "plant_type": device.get("plant_type"),
                "location": device.get("location"),
                "connected": device["connected"],
                "last_seen": device.get("last_seen")
            })
        
        return simplified_devices
        
    except Exception as e:
        logger.error(f"Error obteniendo dispositivos para IA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo dispositivos"
        )

@router.get("/health")
async def ai_health_check():
    """
    Verificar el estado del servicio de IA
    """
    try:
        # 🧪 PRUEBA SIMPLE DE IA
        test_response = await ai_service.get_plant_recommendation("¿Cuál es la humedad ideal para una planta?")
        
        return {
            "status": "healthy",
            "ai_service": "operational",
            "model": "gpt-3.5-turbo",
            "test_tokens": test_response.get("usage", {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error en health check de IA: {str(e)}")
        return {
            "status": "unhealthy",
            "ai_service": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.post("/test-simple")
async def test_ai_simple():
    """
    🧪 ENDPOINT DE PRUEBA SIMPLE (SIN AUTENTICACIÓN)
    Para debuggear problemas de IA sin complicaciones de auth
    """
    try:
        logger.info("🧪 Probando servicio de IA...")
        
        test_query = "¿Cómo cuidar una rosa?"
        ai_response = await ai_service.get_plant_recommendation(test_query)
        
        return {
            "status": "success",
            "query": test_query,
            "response": ai_response["recomendacion"],
            "tokens": ai_response.get("usage", {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error en prueba simple de IA: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "details": "Verifica que OPENAI_API_KEY esté configurada correctamente",
            "timestamp": datetime.utcnow().isoformat()
        }
