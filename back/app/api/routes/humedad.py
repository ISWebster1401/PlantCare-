from fastapi import APIRouter, HTTPException, Depends, Header, Query
from typing import List, Optional
from pydantic import BaseModel, Field
import logging
from app.api.core.database import get_db
from pgdbtoolkit import AsyncPgDbToolkit
from app.api.schemas.humedad import HumedadData, DatoHumedad, MensajeRespuesta
from app.api.core.ai_service import ai_service
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from app.db.queries import update_device_last_seen
from app.api.core.config import settings

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["humedad"]
)

LOCAL_TIMEZONE = ZoneInfo(settings.APP_TIMEZONE)

class HumedadData(BaseModel):
    humedad: float = Field(..., ge=0, le=100, description="Humedad del suelo en porcentaje")
    temperatura: Optional[float] = Field(None, description="Temperatura ambiente (°C)")
    presion: Optional[float] = Field(None, description="Presión atmosférica (hPa)")
    altitud: Optional[float] = Field(None, description="Altitud estimada (m)")

class MultiSensorData(BaseModel):
    """Datos de múltiples sensores del Wemos D1 Mini"""
    humedad: float = Field(..., description="Humedad del suelo (0-100%)")
    temperatura: Optional[float] = Field(None, description="Temperatura ambiente (°C)")
    presion: Optional[float] = Field(None, description="Presión atmosférica (hPa)")
    altitud: Optional[float] = Field(None, description="Altitud estimada (m)")
    humedad_aire: Optional[float] = Field(None, description="Humedad del aire (%)")
    luz: Optional[float] = Field(None, description="Nivel de luz (0-100%)")
    bateria: Optional[float] = Field(None, description="Nivel de batería (%)")
    senal: Optional[int] = Field(None, description="Fuerza de señal WiFi (dBm)")
    timestamp: Optional[int] = Field(None, description="Timestamp Unix")

async def get_device_id(device_code: str = Header(..., alias="X-Device-Code"), db: AsyncPgDbToolkit = Depends(get_db)) -> int:
    """
    Verifica el código del dispositivo y retorna su ID
    """
    try:
        result = await db.fetch_records(
            "devices",
            columns=["id"],
            conditions={"device_code": device_code}
        )
        
        if result.empty:
            raise HTTPException(status_code=401, detail="Código de dispositivo inválido")
            
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
    Guarda una lectura de humedad del suelo (endpoint legacy)
    """
    try:
        await db.insert_records(
            "sensor_humedad_suelo",
            [{
                "device_id": device_id,
                "valor": data.humedad,
                "temperatura": data.temperatura,
                "presion": data.presion,
                "altitud": data.altitud
            }]
        )
        
        # Actualizar última conexión del dispositivo
        await update_device_last_seen(db, device_id)
        
        return {"message": "Datos guardados correctamente"}
    except Exception as e:
        logger.error(f"Error guardando datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al guardar los datos")

@router.post("/humedad")
async def save_multi_sensor_data(
    data: MultiSensorData,
    device_id: int = Depends(get_device_id),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Guarda datos de múltiples sensores del Wemos D1 Mini
    
    Este endpoint recibe datos de:
    - Humedad del suelo (obligatorio)
    - Temperatura ambiente (opcional)
    - Humedad del aire (opcional) 
    - Nivel de luz (opcional)
    - Nivel de batería (opcional)
    - Fuerza de señal WiFi (opcional)
    """
    try:
        logger.info(f"📊 Recibiendo datos del dispositivo ID: {device_id}")
        logger.info(f"   💧 Humedad suelo: {data.humedad}%")
        if data.temperatura:
            logger.info(f"   🌡️  Temperatura: {data.temperatura}°C")
        if data.humedad_aire:
            logger.info(f"   💨 Humedad aire: {data.humedad_aire}%")
        if data.luz is not None:
            logger.info(f"   ☀️  Luz: {data.luz}%")
        if data.senal:
            logger.info(f"   📶 Señal: {data.senal} dBm")
        
        # Guardar datos principales de humedad del suelo
        await db.insert_records(
            "sensor_humedad_suelo",
            [{
                "device_id": device_id,
                "valor": data.humedad,
                "temperatura": data.temperatura,
                "presion": data.presion,
                "altitud": data.altitud,
                "humedad_aire": data.humedad_aire,
                "luz": data.luz,
                "bateria": data.bateria,
                "senal": data.senal,
                "timestamp_sensor": (
                    datetime.fromtimestamp(data.timestamp, tz=ZoneInfo("UTC")).astimezone(LOCAL_TIMEZONE)
                    if data.timestamp else None
                )
            }]
        )
        
        # Actualizar última conexión del dispositivo
        from app.db.queries import update_device_last_seen
        await update_device_last_seen(db, device_id)
        
        response = {
            "message": "Datos guardados correctamente",
            "device_id": device_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data_received": {
                "humedad_suelo": data.humedad,
                "temperatura": data.temperatura,
                "humedad_aire": data.humedad_aire,
                "luz": data.luz,
                "bateria": data.bateria,
                "senal": data.senal
            }
        }
        
        logger.info(f"✅ Datos guardados exitosamente para dispositivo {device_id}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error guardando datos del dispositivo {device_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al guardar los datos: {str(e)}")

@router.get("/lector-humedad")
async def get_humedad(
    device_id: int = Depends(get_device_id),
    limit: int = Query(20, ge=1, le=200),
    db: AsyncPgDbToolkit = Depends(get_db)
) -> List[dict]:
    """
    Obtiene las últimas 20 lecturas de humedad para un dispositivo específico
    """
    try:
        result = await db.fetch_records(
            "sensor_humedad_suelo",
            columns=["id", "valor", "fecha", "device_id", "temperatura", "presion", "altitud"],
            conditions={"device_id": device_id},
            order_by=[("fecha", "DESC")],
            limit=limit
        )
        
        if result.empty:
            return []
            
        # Convertir los datos a un formato más amigable
        formatted_rows = []
        for _, row in result.iterrows():
            raw_fecha = row["fecha"]
            if hasattr(raw_fecha, "to_pydatetime"):
                raw_fecha = raw_fecha.to_pydatetime()
            if raw_fecha and raw_fecha.tzinfo is None:
                raw_fecha = raw_fecha.replace(tzinfo=LOCAL_TIMEZONE)
            fecha_local = raw_fecha.astimezone(LOCAL_TIMEZONE) if raw_fecha else None

            formatted_rows.append({
                "id": int(row["id"]),
                "device_id": int(row["device_id"]),
                "valor": float(row["valor"]),
                "fecha": fecha_local.isoformat() if fecha_local else None,
                "temperatura": float(row["temperatura"]) if "temperatura" in row and row["temperatura"] is not None else None,
                "presion": float(row["presion"]) if "presion" in row and row["presion"] is not None else None,
                "altitud": float(row["altitud"]) if "altitud" in row and row["altitud"] is not None else None
            })

        return formatted_rows
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

@router.post("/test-ia")
async def test_ai_service():
    """
    Endpoint de prueba para verificar que el servicio de IA funciona
    """
    try:
        test_query = "Mi planta tiene las hojas amarillas y la tierra está muy seca. ¿Qué debo hacer?"
        
        ai_response = await ai_service.get_plant_recommendation(test_query)
        
        return {
            "status": "success",
            "test_query": test_query,
            "ai_response": ai_response["recomendacion"],
            "tokens_used": ai_response.get("usage", {}),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error en prueba de IA: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }