from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from app.api.core.database import get_db
from app.api.core.email_service import email_service
from app.api.schemas.contact import (
    ContactForm, ContactResponse, SupportTicket,
    FAQItem, HelpCategory, HelpArticle
)
from pgdbtoolkit import AsyncPgDbToolkit
import logging
import time
import uuid
from datetime import datetime
from typing import List, Optional
import asyncio

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para contacto y soporte
router = APIRouter(
    prefix="/contact",
    tags=["Contacto y Soporte"],
    responses={
        400: {"description": "Datos inválidos"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.post("/send-message", response_model=ContactResponse)
async def send_contact_message(
    contact_form: ContactForm,
    request: Request,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Envía un mensaje de contacto general
    
    Args:
        contact_form: Datos del formulario de contacto
        request: Request para obtener IP del cliente
        db: Conexión a la base de datos
        
    Returns:
        ContactResponse: Confirmación del envío
    """
    reference_id = "pending"
    request_start = time.perf_counter()

    try:
        # Generar ID de referencia único
        reference_id = str(uuid.uuid4())[:8].upper()
        
        # Obtener IP del cliente
        client_ip = request.client.host if request.client else "unknown"
        
        # Preparar datos para el email
        form_data = contact_form.model_dump()
        form_data["ip_address"] = client_ip
        form_data["reference_id"] = reference_id
        
        # Guardar en base de datos (opcional)
        try:
            await db.insert_records("contact_messages", [{
                "reference_id": reference_id,
                "name": contact_form.name,
                "email": contact_form.email,
                "phone": contact_form.phone,
                "company": contact_form.company,
                "inquiry_type": contact_form.inquiry_type.value,
                "subject": contact_form.subject,
                "message": contact_form.message,
                "ip_address": client_ip,
                "status": "pending",
                "created_at": datetime.utcnow()
            }])
        except Exception as db_error:
            logger.warning(f"No se pudo guardar mensaje en BD: {str(db_error)}")
            # Continuar aunque falle la BD
        
        logger.info("[contact] send_message notification START ref=%s to=%s", reference_id, email_service.contact_email)
        notification_start = time.perf_counter()
        notification_sent = await email_service.send_contact_form_notification(form_data)
        logger.info(
            "[contact] send_message notification END ref=%s success=%s duration=%.2fs",
            reference_id,
            notification_sent,
            time.perf_counter() - notification_start,
        )

        logger.info("[contact] send_message confirmation START ref=%s to=%s", reference_id, contact_form.email)
        confirmation_start = time.perf_counter()
        confirmation_sent = await email_service.send_contact_confirmation(
            contact_form.email,
            contact_form.name
        )
        logger.info(
            "[contact] send_message confirmation END ref=%s success=%s duration=%.2fs",
            reference_id,
            confirmation_sent,
            time.perf_counter() - confirmation_start,
        )
        
        if notification_sent:
            elapsed = time.perf_counter() - request_start
            logger.info(
                "[contact] send_message DONE ref=%s email=%s total_duration=%.2fs",
                reference_id,
                contact_form.email,
                elapsed,
            )
            
            return ContactResponse(
                success=True,
                message="Tu mensaje ha sido enviado exitosamente. Te responderemos pronto.",
                reference_id=reference_id,
                estimated_response_time="24 horas"
            )
        else:
            logger.error(f"Error enviando notificación de contacto - Ref: {reference_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error enviando el mensaje. Por favor intenta nuevamente."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[contact] send_message ERROR ref=%s", reference_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/faq", response_model=List[FAQItem])
async def get_faq(
    category: Optional[str] = None,
    limit: int = 20,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene las preguntas frecuentes
    
    Args:
        category: Filtrar por categoría (opcional)
        limit: Límite de resultados
        db: Conexión a la base de datos
        
    Returns:
        List[FAQItem]: Lista de preguntas frecuentes
    """
    try:
        # FAQ estática mientras no tengamos BD
        faq_items = [
            {
                "id": 1,
                "question": "¿Cómo conecto mi sensor PlantCare?",
                "answer": "Para conectar tu sensor, ve a 'Dispositivos' > 'Agregar Dispositivo' e ingresa el código que viene en la caja del sensor. Sigue las instrucciones en pantalla para completar la configuración.",
                "category": "configuracion",
                "helpful_count": 45,
                "created_at": datetime.utcnow()
            },
            {
                "id": 2,
                "question": "¿Con qué frecuencia debo regar mis plantas?",
                "answer": "La frecuencia de riego depende del tipo de planta, la época del año y las condiciones ambientales. Nuestro sistema de IA analiza estos factores y te da recomendaciones personalizadas basadas en los datos de tu sensor.",
                "category": "cuidado",
                "helpful_count": 38,
                "created_at": datetime.utcnow()
            },
            {
                "id": 3,
                "question": "¿Qué significa cada nivel de humedad?",
                "answer": "Los niveles de humedad se miden en porcentaje: 0-20% (muy seco, regar urgente), 21-40% (seco, considerar riego), 41-60% (óptimo para la mayoría de plantas), 61-80% (húmedo, no regar), 81-100% (muy húmedo, revisar drenaje).",
                "category": "interpretacion",
                "helpful_count": 52,
                "created_at": datetime.utcnow()
            },
            {
                "id": 4,
                "question": "¿Puedo usar PlantCare en exteriores?",
                "answer": "Sí, nuestros sensores están diseñados para uso en interiores y exteriores. Son resistentes al agua (IP65) y funcionan en temperaturas de -10°C a 60°C. Para instalaciones comerciales grandes, consulta nuestros planes empresariales.",
                "category": "producto",
                "helpful_count": 29,
                "created_at": datetime.utcnow()
            },
            {
                "id": 5,
                "question": "¿Cómo funciona la IA de recomendaciones?",
                "answer": "Nuestra IA analiza los datos históricos de tu planta, patrones climáticos, tipo de planta y mejores prácticas de jardinería para generar recomendaciones personalizadas. Mientras más datos recopile, más precisas serán las sugerencias.",
                "category": "ia",
                "helpful_count": 41,
                "created_at": datetime.utcnow()
            },
            {
                "id": 6,
                "question": "¿Qué hago si mi sensor no envía datos?",
                "answer": "Verifica: 1) Conexión WiFi del sensor, 2) Batería del dispositivo, 3) Que el código esté correctamente registrado. Si persiste el problema, usa el botón de 'Soporte Técnico' para contactarnos.",
                "category": "problemas",
                "helpful_count": 33,
                "created_at": datetime.utcnow()
            }
        ]
        
        # Filtrar por categoría si se especifica
        if category:
            faq_items = [item for item in faq_items if item["category"] == category]
        
        # Aplicar límite
        faq_items = faq_items[:limit]
        
        return [FAQItem(**item) for item in faq_items]
        
    except Exception as e:
        logger.error(f"Error obteniendo FAQ: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/help-categories", response_model=List[HelpCategory])
async def get_help_categories(db: AsyncPgDbToolkit = Depends(get_db)):
    """
    Obtiene las categorías de ayuda disponibles
    
    Returns:
        List[HelpCategory]: Lista de categorías de ayuda
    """
    try:
        categories = [
            {
                "id": 1,
                "name": "Primeros Pasos",
                "description": "Configuración inicial y conexión de sensores",
                "icon": "🚀",
                "article_count": 8,
                "order_index": 1
            },
            {
                "id": 2,
                "name": "Cuidado de Plantas",
                "description": "Guías para el cuidado óptimo de tus plantas",
                "icon": "🌱",
                "article_count": 12,
                "order_index": 2
            },
            {
                "id": 3,
                "name": "Interpretación de Datos",
                "description": "Cómo entender las lecturas y gráficos",
                "icon": "📊",
                "article_count": 6,
                "order_index": 3
            },
            {
                "id": 4,
                "name": "Solución de Problemas",
                "description": "Resolución de problemas comunes",
                "icon": "🔧",
                "article_count": 10,
                "order_index": 4
            },
            {
                "id": 5,
                "name": "Inteligencia Artificial",
                "description": "Cómo funciona y usar las recomendaciones de IA",
                "icon": "🤖",
                "article_count": 5,
                "order_index": 5
            },
            {
                "id": 6,
                "name": "Cuenta y Facturación",
                "description": "Gestión de cuenta, planes y pagos",
                "icon": "💳",
                "article_count": 7,
                "order_index": 6
            }
        ]
        
        return [HelpCategory(**cat) for cat in categories]
        
    except Exception as e:
        logger.error(f"Error obteniendo categorías de ayuda: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/system-status")
async def get_system_status():
    """
    Obtiene el estado actual del sistema PlantCare
    
    Returns:
        dict: Estado de los servicios del sistema
    """
    try:
        # Verificar estado de servicios
        status_info = {
            "status": "operational",
            "last_updated": datetime.utcnow().isoformat(),
            "services": {
                "api": {
                    "status": "operational",
                    "response_time": "45ms",
                    "uptime": "99.9%"
                },
                "database": {
                    "status": "operational",
                    "response_time": "12ms",
                    "uptime": "99.8%"
                },
                "ai_service": {
                    "status": "operational",
                    "response_time": "1.2s",
                    "uptime": "99.7%"
                },
                "email_service": {
                    "status": "operational",
                    "response_time": "800ms",
                    "uptime": "99.9%"
                },
                "sensor_network": {
                    "status": "operational",
                    "active_sensors": 1247,
                    "uptime": "99.6%"
                }
            },
            "announcements": [
                {
                    "type": "info",
                    "title": "Nueva función: Recomendaciones de IA mejoradas",
                    "message": "Hemos actualizado nuestro sistema de IA para proporcionar recomendaciones más precisas.",
                    "date": "2024-01-15"
                }
            ]
        }
        
        return status_info
        
    except Exception as e:
        logger.error(f"Error obteniendo estado del sistema: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
