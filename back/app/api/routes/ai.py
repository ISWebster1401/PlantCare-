from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import logging
import os
import requests
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.core.ai_service import ai_service
from app.api.schemas.ai import (
    AIChatRequest, AIChatResponse, AIConversationResponse,
    AIConversationDetailResponse, AIMessageResponse,
    RealtimeTokenRequest, RealtimeTokenResponse,
    RealtimeSyncRequest,
)
from pgdbtoolkit import AsyncPgDbToolkit
from datetime import datetime
import json

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


# ============================================
# NUEVOS ENDPOINTS CON MEMORIA Y FUNCIONES
# ============================================

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_memory(
    request: AIChatRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Chat con memoria de conversación y acceso a datos del usuario."""
    try:
        logger.info(f"Usuario {current_user['email']} envía mensaje: {request.message[:50]}...")
        
        # Crear o obtener conversación
        conversation_id = request.conversation_id
        if not conversation_id:
            # Si hay plant_id, buscar si ya existe una conversación para esta planta
            if request.plant_id:
                existing_conv = await db.execute_query("""
                    SELECT id FROM ai_conversations
                    WHERE user_id = %s AND plant_id = %s
                    LIMIT 1
                """, (current_user["id"], request.plant_id))
                
                if existing_conv is not None and not existing_conv.empty:
                    conversation_id = existing_conv.iloc[0]["id"]
                    logger.info(f"✅ Conversación existente encontrada para planta {request.plant_id}: {conversation_id}")
                else:
                    # Crear nueva conversación asociada con la planta
                    plant_info = await db.execute_query("""
                        SELECT plant_name FROM plants
                        WHERE id = %s AND user_id = %s
                    """, (request.plant_id, current_user["id"]))
                    plant_name = plant_info.iloc[0]["plant_name"] if plant_info is not None and not plant_info.empty else "Planta"
                    title = f"Chat con {plant_name}"
                    conv_result = await db.execute_query("""
                        INSERT INTO ai_conversations (user_id, title, plant_id)
                        VALUES (%s, %s, %s)
                        RETURNING id
                    """, (current_user["id"], title, request.plant_id))
                    conversation_id = conv_result.iloc[0]["id"]
                    logger.info(f"✅ Nueva conversación creada para planta {request.plant_id}: {conversation_id}")
            else:
                # Crear nueva conversación sin planta
                title = request.message[:50] if len(request.message) > 50 else request.message
                conv_result = await db.execute_query("""
                    INSERT INTO ai_conversations (user_id, title)
                    VALUES (%s, %s)
                    RETURNING id
                """, (current_user["id"], title))
                conversation_id = conv_result.iloc[0]["id"]
                logger.info(f"✅ Nueva conversación creada: {conversation_id}")
        else:
            # Verificar que la conversación pertenece al usuario
            conv_check = await db.execute_query("""
                SELECT id FROM ai_conversations
                WHERE id = %s AND user_id = %s
            """, (conversation_id, current_user["id"]))
            if conv_check is None or conv_check.empty:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversación no encontrada"
                )
        
        # Guardar mensaje del usuario
        user_msg_result = await db.execute_query("""
            INSERT INTO ai_messages (conversation_id, role, content)
            VALUES (%s, 'user', %s)
            RETURNING id
        """, (conversation_id, request.message))
        user_message_id = user_msg_result.iloc[0]["id"]
        
        # Obtener respuesta de IA con memoria
        ai_response = await ai_service.chat_with_memory(
            user_message=request.message,
            user_id=current_user["id"],
            conversation_id=conversation_id,
            db=db,
            device_id=request.device_id,
            plant_id=request.plant_id
        )
        
        # Guardar respuesta de IA
        ai_msg_result = await db.execute_query("""
            INSERT INTO ai_messages (conversation_id, role, content, metadata)
            VALUES (%s, 'assistant', %s, %s::jsonb)
            RETURNING id
        """, (conversation_id, ai_response["response"], json.dumps({"usage": ai_response["usage"]})))
        ai_message_id = ai_msg_result.iloc[0]["id"]
        
        # Actualizar updated_at de la conversación
        await db.execute_query("""
            UPDATE ai_conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (conversation_id,))
        
        return AIChatResponse(
            conversation_id=conversation_id,
            message_id=ai_message_id,
            response=ai_response["response"],
            tokens_used=ai_response["usage"],
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Error en chat con memoria: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Error procesando chat: {error_msg}")


@router.get("/conversations", response_model=List[AIConversationResponse])
async def list_conversations(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Lista todas las conversaciones del usuario."""
    try:
        conversations_df = await db.execute_query("""
            SELECT 
                c.id, c.user_id, c.title, c.created_at, c.updated_at,
                COUNT(m.id) as message_count
            FROM ai_conversations c
            LEFT JOIN ai_messages m ON c.id = m.conversation_id
            WHERE c.user_id = %s
            GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at
            ORDER BY c.updated_at DESC
        """, (current_user["id"],))
        
        if conversations_df is None or conversations_df.empty:
            return []
        
        conversations = []
        for _, row in conversations_df.iterrows():
            conversations.append(AIConversationResponse(
                id=int(row["id"]),
                user_id=int(row["user_id"]),
                title=row["title"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                message_count=int(row["message_count"])
            ))
        
        return conversations
        
    except Exception as e:
        logger.error(f"❌ Error listando conversaciones: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listando conversaciones: {str(e)}")


@router.get("/conversations/plant/{plant_id}", response_model=AIConversationDetailResponse)
async def get_conversation_by_plant(
    plant_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Obtiene la conversación asociada a una planta; si no existe, la crea y la devuelve."""
    try:
        # Verificar que la planta pertenece al usuario y obtener nombre para el título
        plant_check = await db.execute_query("""
            SELECT id, plant_name FROM plants
            WHERE id = %s AND user_id = %s
        """, (plant_id, current_user["id"]))
        
        if plant_check is None or plant_check.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Planta no encontrada"
            )
        
        plant_name = plant_check.iloc[0].get("plant_name") or "Planta"
        
        # Buscar conversación para esta planta
        conv_df = await db.execute_query("""
            SELECT * FROM ai_conversations
            WHERE user_id = %s AND plant_id = %s
            LIMIT 1
        """, (current_user["id"], plant_id))
        
        if conv_df is None or conv_df.empty:
            # Crear conversación nueva para esta planta (evita 404 en la app)
            title = f"Chat con {plant_name}"
            conv_result = await db.execute_query("""
                INSERT INTO ai_conversations (user_id, title, plant_id)
                VALUES (%s, %s, %s)
                RETURNING *
            """, (current_user["id"], title, plant_id))
            if conv_result is None or conv_result.empty:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No se pudo crear la conversación"
                )
            conv_df = conv_result
            logger.info(f"✅ Nueva conversación creada para planta {plant_id}: {conv_df.iloc[0]['id']}")
        
        conversation = conv_df.iloc[0].to_dict()
        conversation_id = conversation["id"]
        
        # Obtener mensajes
        messages_df = await db.execute_query("""
            SELECT * FROM ai_messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
        """, (conversation_id,))
        
        messages = []
        if messages_df is not None and not messages_df.empty:
            for _, row in messages_df.iterrows():
                msg_dict = row.to_dict()
                metadata = None
                if msg_dict.get("metadata"):
                    try:
                        metadata = json.loads(msg_dict["metadata"]) if isinstance(msg_dict["metadata"], str) else msg_dict["metadata"]
                    except:
                        metadata = msg_dict["metadata"]
                
                messages.append(AIMessageResponse(
                    id=int(msg_dict["id"]),
                    conversation_id=int(msg_dict["conversation_id"]),
                    role=msg_dict["role"],
                    content=msg_dict["content"],
                    metadata=metadata,
                    created_at=msg_dict["created_at"]
                ))
        
        return AIConversationDetailResponse(
            id=int(conversation["id"]),
            user_id=int(conversation["user_id"]),
            title=conversation["title"],
            created_at=conversation["created_at"],
            updated_at=conversation["updated_at"],
            messages=messages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo conversación por planta: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo conversación: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=AIConversationDetailResponse)
async def get_conversation(
    conversation_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Obtiene una conversación específica con todos sus mensajes."""
    try:
        # Verificar que la conversación pertenece al usuario
        conv_df = await db.execute_query("""
            SELECT * FROM ai_conversations
            WHERE id = %s AND user_id = %s
        """, (conversation_id, current_user["id"]))
        
        if conv_df is None or conv_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada"
            )
        
        conversation = conv_df.iloc[0].to_dict()
        
        # Obtener mensajes
        messages_df = await db.execute_query("""
            SELECT * FROM ai_messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
        """, (conversation_id,))
        
        messages = []
        if messages_df is not None and not messages_df.empty:
            for _, row in messages_df.iterrows():
                msg_dict = row.to_dict()
                metadata = None
                if msg_dict.get("metadata"):
                    try:
                        metadata = json.loads(msg_dict["metadata"]) if isinstance(msg_dict["metadata"], str) else msg_dict["metadata"]
                    except:
                        metadata = msg_dict["metadata"]
                
                messages.append(AIMessageResponse(
                    id=int(msg_dict["id"]),
                    conversation_id=int(msg_dict["conversation_id"]),
                    role=msg_dict["role"],
                    content=msg_dict["content"],
                    metadata=metadata,
                    created_at=msg_dict["created_at"]
                ))
        
        return AIConversationDetailResponse(
            id=int(conversation["id"]),
            user_id=int(conversation["user_id"]),
            title=conversation["title"],
            created_at=conversation["created_at"],
            updated_at=conversation["updated_at"],
            messages=messages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error obteniendo conversación: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo conversación: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Elimina una conversación y todos sus mensajes."""
    try:
        # Verificar que la conversación pertenece al usuario
        conv_df = await db.execute_query("""
            SELECT id FROM ai_conversations
            WHERE id = %s AND user_id = %s
        """, (conversation_id, current_user["id"]))
        
        if conv_df is None or conv_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada"
            )
        
        # Eliminar conversación (los mensajes se eliminan automáticamente por CASCADE)
        await db.execute_query("""
            DELETE FROM ai_conversations
            WHERE id = %s
        """, (conversation_id,))
        
        return {"message": "Conversación eliminada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error eliminando conversación: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error eliminando conversación: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(
    request: AIChatRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Chat con streaming de respuestas (Server-Sent Events)."""
    async def generate():
        try:
            # Crear o obtener conversación
            conversation_id = request.conversation_id
            if not conversation_id:
                # Si hay plant_id, buscar si ya existe una conversación para esta planta
                if request.plant_id:
                    existing_conv = await db.execute_query("""
                        SELECT id FROM ai_conversations
                        WHERE user_id = %s AND plant_id = %s
                        LIMIT 1
                    """, (current_user["id"], request.plant_id))
                    
                    if existing_conv is not None and not existing_conv.empty:
                        conversation_id = existing_conv.iloc[0]["id"]
                    else:
                        # Crear nueva conversación asociada con la planta
                        plant_info = await db.execute_query("""
                            SELECT plant_name FROM plants
                            WHERE id = %s AND user_id = %s
                        """, (request.plant_id, current_user["id"]))
                        plant_name = plant_info.iloc[0]["plant_name"] if plant_info is not None and not plant_info.empty else "Planta"
                        title = f"Chat con {plant_name}"
                        conv_result = await db.execute_query("""
                            INSERT INTO ai_conversations (user_id, title, plant_id)
                            VALUES (%s, %s, %s)
                            RETURNING id
                        """, (current_user["id"], title, request.plant_id))
                        conversation_id = conv_result.iloc[0]["id"]
                else:
                    title = request.message[:50] if len(request.message) > 50 else request.message
                    conv_result = await db.execute_query("""
                        INSERT INTO ai_conversations (user_id, title)
                        VALUES (%s, %s)
                        RETURNING id
                    """, (current_user["id"], title))
                    conversation_id = conv_result.iloc[0]["id"]
            else:
                # Verificar que la conversación pertenece al usuario
                conv_check = await db.execute_query("""
                    SELECT id FROM ai_conversations
                    WHERE id = %s AND user_id = %s
                """, (conversation_id, current_user["id"]))
                if conv_check is None or conv_check.empty:
                    yield f"data: {json.dumps({'error': 'Conversación no encontrada'})}\n\n"
                    return
            
            # Guardar mensaje del usuario
            await db.execute_query("""
                INSERT INTO ai_messages (conversation_id, role, content)
                VALUES (%s, 'user', %s)
            """, (conversation_id, request.message))
            
            # Stream respuesta
            full_response = ""
            async for chunk in ai_service.chat_stream(
                user_message=request.message,
                user_id=current_user["id"],
                conversation_id=conversation_id,
                db=db,
                device_id=request.device_id,
                plant_id=request.plant_id
            ):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Guardar respuesta completa
            if full_response:
                await db.execute_query("""
                    INSERT INTO ai_messages (conversation_id, role, content)
                    VALUES (%s, 'assistant', %s)
                """, (conversation_id, full_response))
                
                # Actualizar updated_at
                await db.execute_query("""
                    UPDATE ai_conversations
                    SET updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (conversation_id,))
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            logger.error(f"❌ Error en streaming: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


# ============================================
# Realtime / Voice (Llamar a la planta)
# ============================================

REALTIME_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets"

def _build_realtime_instructions(plant_name: str, plant_type: str, health_status: str, character_mood: str, character_personality: str) -> str:
    """Construye instrucciones para la sesión Realtime (voz) con contexto de la planta."""
    return f"""Eres {plant_name}, una {plant_type} real y viva. Estás hablando por voz con tu dueño o cuidador (puede ser un niño).

TU IDENTIDAD:
- Tu nombre es: {plant_name}
- Eres una: {plant_type}
- Tu estado de salud actual es: {health_status}
- Tu estado de ánimo es: {character_mood}
- Tu personalidad es: {character_personality}

IMPORTANTE:
1. Habla en primera persona como si fueras la planta {plant_name}. Di "yo", "mi", "me".
2. Sé amable, breve y clara. El usuario puede ser un niño pequeño.
3. Usa lenguaje simple y evita términos técnicos.
4. No menciones que eres una IA ni un asistente. Eres la planta.
5. Responde de forma corta y natural para una conversación por voz."""


@router.post("/realtime/token", response_model=RealtimeTokenResponse)
async def get_realtime_token(
    request: RealtimeTokenRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Obtiene un token efímero para conectar a la API Realtime (voz con la planta)."""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de voz no configurado (OPENAI_API_KEY)",
            )

        instructions = "Eres PlantCare AI, un asistente amigable de cuidado de plantas. Habla en español, de forma breve y clara. El usuario puede ser un niño."
        plant_name = "PlantCare"
        if request.plant_id:
            plant_df = await db.execute_query("""
                SELECT plant_name, plant_type, health_status, character_mood, character_personality
                FROM plants
                WHERE id = %s AND user_id = %s
            """, (request.plant_id, current_user["id"]))
            if plant_df is not None and not plant_df.empty:
                row = plant_df.iloc[0]
                plant_name = row.get("plant_name") or "Planta"
                plant_type = row.get("plant_type") or "planta"
                health_status = row.get("health_status") or "healthy"
                character_mood = row.get("character_mood") or "happy"
                character_personality = row.get("character_personality") or "amigable"
                instructions = _build_realtime_instructions(
                    plant_name, plant_type, health_status, character_mood, character_personality
                )

        # Session config: solo type, model e instructions. No enviar audio.input.format
        # (la API usa PCM por defecto; formato custom puede causar 502).
        # Voces válidas: alloy, echo, fable, onyx, shimmer, ash, ballad, coral, sage, verse (no "marin").
        session_config = {
            "type": "realtime",
            "model": "gpt-realtime",
            "instructions": instructions,
            "audio": {
                "output": {"voice": "coral"},
            },
        }
        payload = {"session": session_config}

        resp = requests.post(
            REALTIME_CLIENT_SECRETS_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        if not resp.ok:
            err_body = (resp.text or "")[:800]
            logger.error(f"❌ OpenAI Realtime client_secrets: status={resp.status_code}, body={err_body}")
            detail = "OpenAI rechazó la solicitud de voz. Revisa OPENAI_API_KEY y que la cuenta tenga acceso a Realtime."
            if resp.status_code == 400 and err_body:
                try:
                    err_json = resp.json()
                    detail = err_json.get("error", {}).get("message", detail) or detail
                except Exception:
                    detail = f"{detail} Respuesta: {err_body[:200]}"
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=detail,
            )
        data = resp.json()
        client_secret = data.get("value")
        if not client_secret:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="OpenAI no devolvió client_secret",
            )
        return RealtimeTokenResponse(
            client_secret=client_secret,
            expires_in=data.get("expires_in"),
        )
    except requests.RequestException as e:
        logger.error(f"❌ Error solicitando token Realtime: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error al conectar con OpenAI. Comprueba red y OPENAI_API_KEY.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en realtime/token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/realtime/sync")
async def sync_voice_transcript(
    request: RealtimeSyncRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Sincroniza el transcript de una llamada de voz al historial de la conversación."""
    try:
        conv_df = await db.execute_query("""
            SELECT id FROM ai_conversations
            WHERE id = %s AND user_id = %s
        """, (request.conversation_id, current_user["id"]))
        if conv_df is None or conv_df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversación no encontrada",
            )

        for msg in request.messages:
            role = "user" if msg.role == "user" else "assistant"
            await db.execute_query("""
                INSERT INTO ai_messages (conversation_id, role, content)
                VALUES (%s, %s, %s)
            """, (request.conversation_id, role, msg.content))

        await db.execute_query("""
            UPDATE ai_conversations
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (request.conversation_id,))

        return {"message": "Transcript sincronizado", "messages_count": len(request.messages)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error en realtime/sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
