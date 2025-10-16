from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.core.ai_service import ai_service
from pgdbtoolkit import AsyncPgDbToolkit
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para reportes
router = APIRouter(
    prefix="/reports",
    tags=["Reportes y Gráficos"],
    responses={
        401: {"description": "No autorizado"},
        404: {"description": "No encontrado"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.get("/device/{device_id}/chart-data")
async def get_device_chart_data(
    device_id: int,
    days: int = Query(7, ge=1, le=30, description="Días de datos a obtener"),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene datos para gráficos de un dispositivo específico
    """
    try:
        # Verificar que el dispositivo pertenece al usuario
        from app.db.queries import get_device_by_id
        device = await get_device_by_id(db, device_id)
        
        if not device or device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este dispositivo"
            )
        
        # Obtener datos de los últimos N días
        start_date = datetime.now() - timedelta(days=days)
        
        result = await db.execute_query("""
            SELECT 
                DATE_TRUNC('hour', fecha) as hour,
                AVG(valor) as avg_humidity,
                AVG(temperatura) as avg_temperature,
                AVG(humedad_aire) as avg_air_humidity,
                AVG(luz) as avg_light,
                AVG(bateria) as avg_battery,
                AVG(senal) as avg_signal,
                COUNT(*) as reading_count
            FROM sensor_humedad_suelo 
            WHERE device_id = %s AND fecha >= %s
            GROUP BY DATE_TRUNC('hour', fecha)
            ORDER BY hour ASC
        """, (device_id, start_date))
        
        if result is None or result.empty:
            return {
                "device_id": device_id,
                "device_name": device.get("name", "Dispositivo"),
                "period_days": days,
                "data_points": [],
                "summary": {
                    "total_readings": 0,
                    "avg_humidity": 0,
                    "min_humidity": 0,
                    "max_humidity": 0
                }
            }
        
        # Convertir datos para el gráfico
        data_points = []
        humidity_values = []
        
        for _, row in result.iterrows():
            point = {
                "timestamp": row["hour"].isoformat(),
                "humidity": round(float(row["avg_humidity"]) if row["avg_humidity"] else 0, 2),
                "temperature": round(float(row["avg_temperature"]) if row["avg_temperature"] else 0, 2),
                "air_humidity": round(float(row["avg_air_humidity"]) if row["avg_air_humidity"] else 0, 2),
                "light": round(float(row["avg_light"]) if row["avg_light"] else 0, 2),
                "battery": round(float(row["avg_battery"]) if row["avg_battery"] else 0, 2),
                "signal": round(float(row["avg_signal"]) if row["avg_signal"] else 0, 2),
                "reading_count": int(row["reading_count"])
            }
            data_points.append(point)
            if row["avg_humidity"]:
                humidity_values.append(float(row["avg_humidity"]))
        
        # Calcular resumen
        summary = {
            "total_readings": sum(point["reading_count"] for point in data_points),
            "avg_humidity": round(sum(humidity_values) / len(humidity_values), 2) if humidity_values else 0,
            "min_humidity": round(min(humidity_values), 2) if humidity_values else 0,
            "max_humidity": round(max(humidity_values), 2) if humidity_values else 0
        }
        
        return {
            "device_id": device_id,
            "device_name": device.get("name", "Dispositivo"),
            "period_days": days,
            "data_points": data_points,
            "summary": summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo datos de gráfico: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/device/{device_id}/ai-report")
async def get_device_ai_report(
    device_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera un reporte completo con IA para un dispositivo
    """
    try:
        # Verificar que el dispositivo pertenece al usuario
        from app.db.queries import get_device_by_id
        device = await get_device_by_id(db, device_id)
        
        if not device or device.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para acceder a este dispositivo"
            )
        
        # Obtener datos de las últimas 48 horas para análisis completo
        start_date = datetime.now() - timedelta(hours=48)
        
        result = await db.execute_query("""
            SELECT valor, temperatura, humedad_aire, luz, bateria, senal, fecha
            FROM sensor_humedad_suelo 
            WHERE device_id = %s AND fecha >= %s
            ORDER BY fecha DESC
            LIMIT 100
        """, (device_id, start_date))
        
        if result is None or result.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay datos suficientes para generar el reporte"
            )
        
        # Calcular estadísticas
        datos = result.to_dict('records')
        
        # Estadísticas de humedad
        humidity_values = [d['valor'] for d in datos if d['valor'] is not None]
        temp_values = [d['temperatura'] for d in datos if d['temperatura'] is not None]
        
        if not humidity_values:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No hay datos de humedad disponibles"
            )
        
        stats = {
            "current_humidity": humidity_values[0],
            "avg_humidity_48h": sum(humidity_values) / len(humidity_values),
            "min_humidity": min(humidity_values),
            "max_humidity": max(humidity_values),
            "current_temp": temp_values[0] if temp_values else None,
            "avg_temp_48h": sum(temp_values) / len(temp_values) if temp_values else None,
            "total_readings": len(datos),
            "last_reading": datos[0]['fecha'].isoformat() if datos else None
        }
        
        # Análisis de tendencias
        if len(humidity_values) >= 6:
            recent_6 = humidity_values[:6]
            older_6 = humidity_values[6:12] if len(humidity_values) >= 12 else humidity_values[6:]
            
            recent_avg = sum(recent_6) / len(recent_6)
            older_avg = sum(older_6) / len(older_6) if older_6 else recent_avg
            
            trend = "estable"
            if recent_avg > older_avg + 5:
                trend = "subiendo"
            elif recent_avg < older_avg - 5:
                trend = "bajando"
        else:
            trend = "datos insuficientes"
        
        # Crear prompt detallado para la IA
        plant_name = device.get("plant_type", "planta")
        location = device.get("location", "ubicación no especificada")
        
        ai_prompt = f"""
        Genera un reporte completo y profesional para el usuario sobre su {plant_name} ubicada en {location}.
        
        DATOS ACTUALES:
        - Humedad actual: {stats['current_humidity']:.1f}%
        - Humedad promedio 48h: {stats['avg_humidity_48h']:.1f}%
        - Rango de humedad: {stats['min_humidity']:.1f}% - {stats['max_humidity']:.1f}%
        - Tendencia: {trend}
        - Lecturas analizadas: {stats['total_readings']}
        
        DATOS AMBIENTALES:
        - Temperatura actual: {stats['current_temp']:.1f}°C si está disponible
        - Temperatura promedio: {stats['avg_temp_48h']:.1f}°C si está disponible
        
        GENERA UN REPORTE QUE INCLUYA:
        1. 📊 ESTADO ACTUAL: Evaluación del estado de la planta (Excelente/Bueno/Regular/Crítico)
        2. 📈 ANÁLISIS DE TENDENCIAS: Explicación de la tendencia de humedad
        3. 💧 RECOMENDACIONES DE RIEGO: Cuándo y cuánta agua dar
        4. 🌱 CONSEJOS ESPECÍFICOS: Para el tipo de planta y ubicación
        5. ⚠️ ALERTAS: Si hay algo que requiere atención inmediata
        6. 📅 PRÓXIMOS PASOS: Qué hacer en los próximos días
        
        El reporte debe ser profesional pero fácil de entender, con emojis para mejor visualización.
        """
        
        # Obtener análisis de IA
        ai_response = await ai_service.get_plant_recommendation(ai_prompt)
        
        return {
            "device_info": {
                "id": device_id,
                "name": device.get("name", "Dispositivo"),
                "plant_type": device.get("plant_type"),
                "location": device.get("location")
            },
            "statistics": stats,
            "trend_analysis": {
                "trend": trend,
                "trend_description": {
                    "subiendo": "La humedad ha estado aumentando",
                    "bajando": "La humedad ha estado disminuyendo",
                    "estable": "La humedad se mantiene estable",
                    "datos insuficientes": "Se necesitan más datos para determinar la tendencia"
                }.get(trend, "Tendencia desconocida")
            },
            "ai_report": ai_response["recommendation"],
            "generated_at": datetime.now().isoformat(),
            "report_period": f"Últimas 48 horas ({stats['total_readings']} lecturas)"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando reporte de IA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/user/dashboard-data")
async def get_user_dashboard_data(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene datos completos para el dashboard del usuario con gráficos
    """
    try:
        # Obtener dispositivos del usuario
        from app.db.queries import get_user_devices
        devices = await get_user_devices(db, current_user["id"])
        
        if not devices:
            return {
                "devices": [],
                "summary": {
                    "total_devices": 0,
                    "active_devices": 0,
                    "total_readings_today": 0,
                    "avg_humidity_all": 0
                },
                "alerts": [],
                "ai_insights": "Conecta tu primer sensor para comenzar a recibir recomendaciones personalizadas de IA."
            }
        
        # Obtener datos de todos los dispositivos para resumen
        device_ids = [d["id"] for d in devices]
        
        # Estadísticas generales del usuario
        today = datetime.now().date()
        summary_stats = await db.execute_query("""
            SELECT 
                COUNT(DISTINCT device_id) as active_devices,
                COUNT(*) as total_readings_today,
                AVG(valor) as avg_humidity_all,
                MIN(valor) as min_humidity_all,
                MAX(valor) as max_humidity_all
            FROM sensor_humedad_suelo 
            WHERE device_id = ANY(%s) AND DATE(fecha) = %s
        """, (device_ids, today))
        
        # Datos para gráfico de resumen (últimos 7 días)
        week_ago = datetime.now() - timedelta(days=7)
        chart_data = await db.execute_query("""
            SELECT 
                DATE(fecha) as day,
                device_id,
                AVG(valor) as avg_humidity,
                COUNT(*) as reading_count
            FROM sensor_humedad_suelo 
            WHERE device_id = ANY(%s) AND fecha >= %s
            GROUP BY DATE(fecha), device_id
            ORDER BY day ASC
        """, (device_ids, week_ago))
        
        # Detectar alertas
        alerts = []
        for device in devices:
            # Obtener última lectura de cada dispositivo
            last_reading = await db.execute_query("""
                SELECT valor, fecha, temperatura, humedad_aire
                FROM sensor_humedad_suelo 
                WHERE device_id = %s 
                ORDER BY fecha DESC 
                LIMIT 1
            """, (device["id"],))
            
            if last_reading is not None and not last_reading.empty:
                humidity = float(last_reading.iloc[0]["valor"])
                last_time = last_reading.iloc[0]["fecha"]
                
                # Alerta por humedad crítica
                if humidity < 20:
                    alerts.append({
                        "type": "critical",
                        "device_id": device["id"],
                        "device_name": device.get("name", "Dispositivo"),
                        "message": f"Humedad crítica: {humidity:.1f}%",
                        "action": "Regar inmediatamente",
                        "urgency": "high"
                    })
                elif humidity < 35:
                    alerts.append({
                        "type": "warning",
                        "device_id": device["id"],
                        "device_name": device.get("name", "Dispositivo"),
                        "message": f"Humedad baja: {humidity:.1f}%",
                        "action": "Considerar riego pronto",
                        "urgency": "medium"
                    })
                
                # Alerta por falta de datos
                time_since_reading = datetime.now() - last_time.replace(tzinfo=None)
                if time_since_reading > timedelta(hours=2):
                    alerts.append({
                        "type": "connection",
                        "device_id": device["id"],
                        "device_name": device.get("name", "Dispositivo"),
                        "message": f"Sin datos desde hace {time_since_reading.seconds // 3600}h",
                        "action": "Verificar conexión del sensor",
                        "urgency": "low"
                    })
        
        # Generar insights de IA basados en todos los dispositivos
        if summary_stats is not None and not summary_stats.empty:
            stats_row = summary_stats.iloc[0]
            avg_humidity = float(stats_row["avg_humidity_all"]) if stats_row["avg_humidity_all"] else 0
            total_readings = int(stats_row["total_readings_today"])
            
            ai_prompt = f"""
            Genera insights inteligentes para el dashboard del usuario basado en sus {len(devices)} dispositivos:
            
            RESUMEN DEL DÍA:
            - Dispositivos activos: {len(devices)}
            - Lecturas de hoy: {total_readings}
            - Humedad promedio: {avg_humidity:.1f}%
            - Alertas activas: {len([a for a in alerts if a['urgency'] in ['high', 'medium']])}
            
            GENERA 3-4 INSIGHTS BREVES:
            1. Estado general del jardín/viñedo
            2. Recomendación principal del día
            3. Observación sobre tendencias
            4. Consejo proactivo para mañana
            
            Cada insight debe ser una oración corta y actionable. Usa emojis apropiados.
            """
            
            ai_response = await ai_service.get_plant_recommendation(ai_prompt)
            ai_insights = ai_response["recommendation"]
        else:
            ai_insights = "Conecta más sensores para obtener insights más detallados sobre tu jardín."
        
        # Preparar datos del gráfico
        chart_points = []
        if chart_data is not None and not chart_data.empty:
            chart_points = chart_data.to_dict('records')
        
        return {
            "devices": devices,
            "summary": {
                "total_devices": len(devices),
                "active_devices": int(summary_stats.iloc[0]["active_devices"]) if summary_stats is not None and not summary_stats.empty else 0,
                "total_readings_today": int(summary_stats.iloc[0]["total_readings_today"]) if summary_stats is not None and not summary_stats.empty else 0,
                "avg_humidity_all": round(float(summary_stats.iloc[0]["avg_humidity_all"]), 2) if summary_stats is not None and not summary_stats.empty and summary_stats.iloc[0]["avg_humidity_all"] else 0
            },
            "chart_data": chart_points,
            "alerts": alerts,
            "ai_insights": ai_insights,
            "generated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo datos del dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
