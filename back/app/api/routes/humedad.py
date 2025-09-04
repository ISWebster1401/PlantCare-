from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from pydantic import BaseModel
import logging
from app.api.core.database import get_db
from pgdbtoolkit import AsyncPgDbToolkit
from app.api.schemas.humedad import HumedadData, DatoHumedad, MensajeRespuesta
from app.api.core.ai_service import ai_service
from datetime import datetime, timedelta

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

@router.get("/analisis-ia/{device_id}")
async def get_ai_analysis(
    device_id: int,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera un análisis inteligente del estado de la planta basado en datos históricos
    """
    try:
        # Obtener datos de las últimas 24 horas
        yesterday = datetime.now() - timedelta(days=1)
        
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["valor", "fecha"],
            conditions={
                "device_id": device_id,
                "fecha__gte": yesterday
            },
            order_by=[("fecha", "DESC")]
        )
        
        if result.empty:
            raise HTTPException(status_code=404, detail="No hay datos suficientes para el análisis")
        
        # Calcular estadísticas
        datos = result.to_dict('records')
        valores = [d['valor'] for d in datos]
        
        promedio = sum(valores) / len(valores)
        minimo = min(valores)
        maximo = max(valores)
        ultimo_valor = valores[0]
        
        # Crear prompt para la IA
        user_query = f"""
        Analiza los datos de mi planta:
        - Humedad actual: {ultimo_valor:.1f}%
        - Humedad promedio últimas 24h: {promedio:.1f}%
        - Humedad mínima: {minimo:.1f}%
        - Humedad máxima: {maximo:.1f}%
        - Total de lecturas: {len(valores)}
        
        Dame un reporte completo del estado de la planta y recomendaciones específicas.
        """
        
        # Obtener análisis de IA
        ai_response = await ai_service.get_plant_recommendation(user_query)
        
        return {
            "estado_actual": {
                "humedad_actual": ultimo_valor,
                "humedad_promedio": round(promedio, 2),
                "humedad_minima": minimo,
                "humedad_maxima": maximo,
                "lecturas_analizadas": len(valores)
            },
            "analisis_ia": ai_response["recommendation"],
            "tokens_usados": ai_response["usage"]
        }
        
    except Exception as e:
        logger.error(f"Error en análisis IA: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al generar análisis")

@router.get("/reporte-automatico/{device_id}")
async def get_automatic_report(
    device_id: int,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera un reporte automático que se puede enviar al usuario por email/notificación
    """
    try:
        # Obtener datos recientes
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["valor", "fecha"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=10
        )
        
        if result.empty:
            return {"mensaje": "No hay datos disponibles para el reporte"}
        
        ultimo_valor = float(result.iloc[0]['valor'])
        ultima_fecha = result.iloc[0]['fecha']
        
        # Determinar urgencia
        urgencia = "normal"
        if ultimo_valor < 20:
            urgencia = "alta"
        elif ultimo_valor < 40:
            urgencia = "media"
        
        # Crear prompt específico para reporte automático
        user_query = f"""
        Genera un reporte automático breve para el usuario sobre su planta:
        - Humedad actual: {ultimo_valor:.1f}%
        - Última medición: hace {(datetime.now() - ultima_fecha).seconds // 60} minutos
        - Urgencia: {urgencia}
        
        El reporte debe ser:
        1. Breve (máximo 3 oraciones)
        2. Actionable (qué hacer específicamente)
        3. Amigable pero claro
        
        Si la urgencia es alta, menciona cuánta agua aproximadamente necesita.
        """
        
        ai_response = await ai_service.get_plant_recommendation(user_query)
        
        return {
            "reporte": ai_response["recommendation"],
            "urgencia": urgencia,
            "humedad_actual": ultimo_valor,
            "fecha_ultima_medicion": ultima_fecha.strftime("%Y-%m-%d %H:%M:%S"),
            "recomendacion_automatica": True
        }
        
    except Exception as e:
        logger.error(f"Error generando reporte automático: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al generar reporte")

@router.post("/consulta-ia")
async def chat_with_ai(
    pregunta: str,
    device_id: int = Depends(get_device_id),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Permite al usuario hacer preguntas específicas sobre su planta
    """
    try:
        # Obtener datos actuales de la planta
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["valor", "fecha"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=1
        )
        
        contexto_planta = ""
        if not result.empty:
            ultimo_valor = float(result.iloc[0]['valor'])
            contexto_planta = f"(Su planta actualmente tiene {ultimo_valor:.1f}% de humedad) "
        
        # Crear consulta contextualizada
        user_query = f"{contexto_planta}{pregunta}"
        
        ai_response = await ai_service.get_plant_recommendation(user_query)
        
        return {
            "pregunta": pregunta,
            "respuesta": ai_response["recommendation"],
            "contexto_incluido": bool(contexto_planta),
            "humedad_actual": ultimo_valor if not result.empty else None
        }
        
    except Exception as e:
        logger.error(f"Error en consulta IA: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al procesar consulta")

@router.get("/alertas-inteligentes/{device_id}")
async def check_smart_alerts(
    device_id: int,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Verifica si hay condiciones que requieren alertas automáticas
    """
    try:
        # Obtener últimas lecturas
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["valor", "fecha"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=5
        )
        
        if result.empty:
            return {"alerta": False, "mensaje": "Sin datos suficientes"}
        
        valores = [float(row['valor']) for _, row in result.iterrows()]
        ultimo_valor = valores[0]
        
        # Lógica de alertas
        alertas = []
        
        # Alerta por humedad muy baja
        if ultimo_valor < 20:
            alertas.append({
                "tipo": "humedad_critica",
                "urgencia": "alta",
                "mensaje": "¡Humedad crítica! Tu planta necesita agua urgentemente."
            })
        
        # Alerta por tendencia descendente
        if len(valores) >= 3:
            if all(valores[i] > valores[i+1] for i in range(2)):
                alertas.append({
                    "tipo": "tendencia_descendente",
                    "urgencia": "media",
                    "mensaje": "La humedad ha estado bajando consistentemente. Considera regar pronto."
                })
        
        # Generar mensaje IA para alertas críticas
        mensaje_ia = None
        if alertas and any(a["urgencia"] == "alta" for a in alertas):
            user_query = f"""
            ALERTA CRÍTICA: La planta tiene {ultimo_valor:.1f}% de humedad.
            Genera un mensaje de alerta urgente pero tranquilizador que incluya:
            1. Qué hacer inmediatamente
            2. Cuánta agua usar aproximadamente
            3. Un mensaje reconfortante
            Máximo 2 oraciones.
            """
            
            ai_response = await ai_service.get_plant_recommendation(user_query)
            mensaje_ia = ai_response["recommendation"]
        
        return {
            "tiene_alertas": len(alertas) > 0,
            "alertas": alertas,
            "humedad_actual": ultimo_valor,
            "mensaje_ia": mensaje_ia,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error verificando alertas: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al verificar alertas")