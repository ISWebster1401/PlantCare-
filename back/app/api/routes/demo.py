from fastapi import APIRouter, Depends, HTTPException, status
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.db.queries import create_device_code, connect_device_to_user, get_user_devices
from pgdbtoolkit import AsyncPgDbToolkit
from datetime import datetime, timedelta
import random
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para datos de demostración
router = APIRouter(
    prefix="/demo",
    tags=["Demostración"],
    responses={
        401: {"description": "No autorizado"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.post("/setup-demo-account")
async def setup_demo_account(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Configura una cuenta de demostración con dispositivos y datos simulados
    """
    try:
        logger.info(f"Configurando cuenta demo para usuario {current_user['email']}")
        
        # Verificar si ya tiene dispositivos
        existing_devices = await get_user_devices(db, current_user["id"])
        if len(existing_devices) >= 3:
            return {
                "message": "Ya tienes dispositivos configurados",
                "devices": existing_devices
            }
        
        # Crear 3 dispositivos de demostración
        demo_devices = []
        device_configs = [
            {
                "name": "Sensor Jardín Principal",
                "device_type": "multi_sensor",
                "location": "Jardín Principal",
                "plant_type": "Tomates"
            },
            {
                "name": "Sensor Invernadero",
                "device_type": "humidity_sensor", 
                "location": "Invernadero",
                "plant_type": "Lechugas"
            },
            {
                "name": "Sensor Viñedo Norte",
                "device_type": "multi_sensor",
                "location": "Sector Norte",
                "plant_type": "Cabernet Sauvignon"
            }
        ]
        
        for config in device_configs:
            # Generar código de dispositivo
            devices = await create_device_code(db, config["device_type"], 1)
            if devices:
                device_code = devices[0]["device_code"]
                
                # Conectar dispositivo al usuario
                connected_device = await connect_device_to_user(
                    db, 
                    device_code, 
                    current_user["id"],
                    config
                )
                
                if connected_device:
                    demo_devices.append(connected_device)
                    logger.info(f"Dispositivo demo creado: {device_code}")
        
        # Generar datos históricos para cada dispositivo
        for device in demo_devices:
            await generate_historical_data(db, device["id"])
        
        logger.info(f"Cuenta demo configurada con {len(demo_devices)} dispositivos")
        
        return {
            "message": f"Cuenta demo configurada exitosamente con {len(demo_devices)} dispositivos",
            "devices": demo_devices,
            "next_steps": [
                "Ve al Dashboard para ver tus gráficos",
                "Explora los reportes de IA",
                "Revisa las alertas automáticas"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error configurando cuenta demo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error configurando cuenta de demostración"
        )

async def generate_historical_data(db: AsyncPgDbToolkit, device_id: int):
    """
    Genera datos históricos simulados para un dispositivo
    """
    try:
        # Generar datos de los últimos 7 días
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # Patrones realistas para diferentes tipos de plantas
        base_humidity = random.uniform(40, 70)  # Humedad base
        
        readings = []
        current_date = start_date
        
        while current_date <= end_date:
            # Simular lecturas cada 30 minutos
            for hour in range(0, 24, 1):  # Cada hora para no saturar
                for minute in [0, 30]:  # Dos lecturas por hora
                    reading_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    
                    if reading_time > end_date:
                        break
                    
                    # Simular variaciones naturales
                    time_factor = hour / 24.0  # Factor de hora del día
                    day_factor = (current_date - start_date).days / 7.0  # Factor de día
                    
                    # Humedad del suelo (patrón realista)
                    humidity_variation = random.uniform(-5, 5)
                    daily_cycle = 10 * (0.5 - abs(time_factor - 0.5))  # Más húmedo en la mañana/noche
                    weekly_trend = -15 * day_factor  # Disminuye gradualmente
                    
                    humidity = max(15, min(85, base_humidity + humidity_variation + daily_cycle + weekly_trend))
                    
                    # Temperatura (patrón diurno)
                    temp_base = 22
                    temp_daily = 8 * abs(0.5 - abs(time_factor - 0.5))  # Más calor al mediodía
                    temperature = temp_base + temp_daily + random.uniform(-2, 2)
                    
                    # Humedad del aire (inversa a temperatura)
                    air_humidity = max(30, min(90, 80 - (temperature - 22) * 2 + random.uniform(-5, 5)))
                    
                    # Luz (patrón solar)
                    if 6 <= hour <= 18:  # Día
                        light = max(20, min(100, 70 + 20 * (0.5 - abs((hour - 12) / 6)) + random.uniform(-10, 10)))
                    else:  # Noche
                        light = random.uniform(0, 10)
                    
                    # Batería (disminuye gradualmente)
                    battery = max(20, 100 - (day_factor * 15) + random.uniform(-5, 5))
                    
                    # Señal WiFi (simulada)
                    signal = random.randint(-80, -40)
                    
                    reading = {
                        "device_id": device_id,
                        "valor": round(humidity, 2),
                        "temperatura": round(temperature, 2),
                        "humedad_aire": round(air_humidity, 2),
                        "luz": round(light, 2),
                        "bateria": round(battery, 2),
                        "senal": signal,
                        "fecha": reading_time,
                        "timestamp_sensor": reading_time
                    }
                    
                    readings.append(reading)
            
            current_date += timedelta(days=1)
        
        # Insertar datos en lotes para mejor rendimiento
        batch_size = 50
        for i in range(0, len(readings), batch_size):
            batch = readings[i:i + batch_size]
            await db.insert_records("sensor_humedad_suelo", batch)
        
        logger.info(f"Generados {len(readings)} datos históricos para dispositivo {device_id}")
        
    except Exception as e:
        logger.error(f"Error generando datos históricos: {str(e)}")
        raise

@router.post("/generate-realtime-data")
async def generate_realtime_data(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Genera datos en tiempo real para todos los dispositivos del usuario
    """
    try:
        devices = await get_user_devices(db, current_user["id"])
        
        if not devices:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes dispositivos conectados. Usa /demo/setup-demo-account primero."
            )
        
        readings_created = 0
        
        for device in devices:
            # Obtener última lectura para continuidad
            last_reading = await db.execute_query("""
                SELECT valor, temperatura, humedad_aire, luz, bateria, senal
                FROM sensor_humedad_suelo 
                WHERE device_id = %s 
                ORDER BY fecha DESC 
                LIMIT 1
            """, (device["id"],))
            
            # Valores base (usar última lectura o valores por defecto)
            if last_reading is not None and not last_reading.empty:
                base_values = last_reading.iloc[0].to_dict()
            else:
                base_values = {
                    "valor": 50.0,
                    "temperatura": 22.0,
                    "humedad_aire": 60.0,
                    "luz": 50.0,
                    "bateria": 85.0,
                    "senal": -60
                }
            
            # Generar nueva lectura con variación natural
            now = datetime.now()
            
            new_reading = {
                "device_id": device["id"],
                "valor": max(10, min(90, base_values["valor"] + random.uniform(-3, 3))),
                "temperatura": max(5, min(40, base_values["temperatura"] + random.uniform(-1, 1))),
                "humedad_aire": max(20, min(95, base_values["humedad_aire"] + random.uniform(-2, 2))),
                "luz": max(0, min(100, base_values["luz"] + random.uniform(-5, 5))),
                "bateria": max(0, min(100, base_values["bateria"] - random.uniform(0, 0.5))),
                "senal": max(-90, min(-30, base_values["senal"] + random.randint(-5, 5))),
                "fecha": now,
                "timestamp_sensor": now
            }
            
            # Redondear valores
            for key in ["valor", "temperatura", "humedad_aire", "luz", "bateria"]:
                new_reading[key] = round(new_reading[key], 2)
            
            await db.insert_records("sensor_humedad_suelo", [new_reading])
            readings_created += 1
        
        logger.info(f"Generadas {readings_created} lecturas en tiempo real")
        
        return {
            "message": f"Generadas {readings_created} nuevas lecturas",
            "timestamp": now.isoformat(),
            "devices_updated": len(devices)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generando datos en tiempo real: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/simulate-alerts")
async def simulate_alerts(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Simula diferentes tipos de alertas para demostración
    """
    try:
        devices = await get_user_devices(db, current_user["id"])
        
        if not devices:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tienes dispositivos conectados"
            )
        
        alert_scenarios = [
            {"humidity": 15, "description": "Humedad crítica - Riego urgente"},
            {"humidity": 30, "description": "Humedad baja - Considerar riego"},
            {"humidity": 85, "description": "Humedad muy alta - Revisar drenaje"}
        ]
        
        readings_created = 0
        now = datetime.now()
        
        for i, device in enumerate(devices[:len(alert_scenarios)]):
            scenario = alert_scenarios[i]
            
            # Crear lectura que genere la alerta
            alert_reading = {
                "device_id": device["id"],
                "valor": scenario["humidity"],
                "temperatura": random.uniform(20, 25),
                "humedad_aire": random.uniform(50, 70),
                "luz": random.uniform(30, 80),
                "bateria": random.uniform(70, 90),
                "senal": random.randint(-70, -50),
                "fecha": now,
                "timestamp_sensor": now
            }
            
            await db.insert_records("sensor_humedad_suelo", [alert_reading])
            readings_created += 1
        
        return {
            "message": f"Simuladas {readings_created} alertas de demostración",
            "scenarios": [f"{device['name']}: {alert_scenarios[i]['description']}" 
                         for i, device in enumerate(devices[:len(alert_scenarios)])],
            "timestamp": now.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error simulando alertas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/create-admin-user")
async def create_admin_user(
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Crea un usuario administrador de demostración
    SOLO PARA DESARROLLO - REMOVER EN PRODUCCIÓN
    """
    try:
        from app.api.core.auth_user import AuthService
        from app.db.queries import get_user_by_email, create_user_admin
        
        admin_email = "admin@plantcare.com"
        
        # Verificar si ya existe
        existing_admin = await get_user_by_email(db, admin_email)
        if existing_admin:
            return {
                "message": "Usuario administrador ya existe",
                "email": admin_email,
                "note": "Usa estas credenciales para acceder al panel de admin"
            }
        
        # Crear usuario administrador
        admin_data = {
            "first_name": "Admin",
            "last_name": "PlantCare",
            "email": admin_email,
            "phone": "+56912345678",
            "region": "Región Metropolitana",
            "vineyard_name": "PlantCare Demo",
            "hectares": 100.0,
            "grape_type": "Administración",
            "password_hash": AuthService.get_password_hash("Admin123!"),
            "role_id": 2,  # Rol de administrador
            "active": True
        }
        
        created_admin = await create_user_admin(db, admin_data)
        
        logger.info("Usuario administrador de demo creado")
        
        return {
            "message": "Usuario administrador creado exitosamente",
            "credentials": {
                "email": admin_email,
                "password": "Admin123!",
                "role": "Administrador"
            },
            "warning": "⚠️ SOLO PARA DESARROLLO - Cambiar credenciales en producción"
        }
        
    except Exception as e:
        logger.error(f"Error creando usuario admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/status")
async def get_demo_status(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene el estado actual de la demostración
    """
    try:
        # Contar dispositivos del usuario
        devices = await get_user_devices(db, current_user["id"])
        
        # Contar lecturas de hoy
        today = datetime.now().date()
        readings_today = await db.execute_query("""
            SELECT COUNT(*) as count
            FROM sensor_humedad_suelo s
            JOIN devices d ON s.device_id = d.id
            WHERE d.user_id = %s AND DATE(s.fecha) = %s
        """, (current_user["id"], today))
        
        readings_count = 0
        if readings_today is not None and not readings_today.empty:
            readings_count = int(readings_today.iloc[0]["count"])
        
        # Última lectura
        last_reading = await db.execute_query("""
            SELECT s.fecha, s.valor, d.name as device_name
            FROM sensor_humedad_suelo s
            JOIN devices d ON s.device_id = d.id
            WHERE d.user_id = %s
            ORDER BY s.fecha DESC
            LIMIT 1
        """, (current_user["id"],))
        
        last_reading_info = None
        if last_reading is not None and not last_reading.empty:
            row = last_reading.iloc[0]
            last_reading_info = {
                "device_name": row["device_name"],
                "humidity": float(row["valor"]),
                "timestamp": row["fecha"].isoformat()
            }
        
        return {
            "user": {
                "name": f"{current_user['first_name']} {current_user['last_name']}",
                "email": current_user["email"],
                "role": "Administrador" if current_user.get("role_id") == 2 else "Usuario"
            },
            "devices": {
                "total": len(devices),
                "connected": len([d for d in devices if d.get("connected")]),
                "list": [{"id": d["id"], "name": d.get("name"), "code": d["device_code"]} for d in devices]
            },
            "data": {
                "readings_today": readings_count,
                "last_reading": last_reading_info
            },
            "demo_ready": len(devices) > 0 and readings_count > 0
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estado demo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
