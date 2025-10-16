#!/usr/bin/env python3
"""
Script para configurar datos de demostración en PlantCare
Ejecutar: python setup_demo.py
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

# Agregar el directorio de la app al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.api.core.database import init_db
from app.api.core.auth_user import AuthService
from app.db.queries import (
    create_user, get_user_by_email, create_device_code, 
    connect_device_to_user, get_user_devices
)

async def create_demo_users():
    """Crea usuarios de demostración"""
    print("🌱 Creando usuarios de demostración...")
    
    db = await init_db()
    
    # Usuario normal de demo
    demo_user_data = {
        "first_name": "Juan",
        "last_name": "Viñatero",
        "email": "demo@plantcare.com",
        "phone": "+56912345678",
        "region": "Región del Maule",
        "vineyard_name": "Viña Demo",
        "hectares": 25.5,
        "grape_type": "Cabernet Sauvignon",
        "password_hash": AuthService.get_password_hash("Demo123!"),
        "role_id": 1,
        "active": True
    }
    
    # Usuario administrador
    admin_user_data = {
        "first_name": "Admin",
        "last_name": "PlantCare",
        "email": "admin@plantcare.com",
        "phone": "+56987654321",
        "region": "Región Metropolitana",
        "vineyard_name": "PlantCare HQ",
        "hectares": 100.0,
        "grape_type": "Administración",
        "password_hash": AuthService.get_password_hash("Admin123!"),
        "role_id": 2,
        "active": True
    }
    
    users_created = []
    
    # Crear usuario demo si no existe
    existing_demo = await get_user_by_email(db, demo_user_data["email"])
    if not existing_demo:
        demo_user = await create_user(db, demo_user_data)
        users_created.append(("Demo User", demo_user_data["email"], "Demo123!"))
        print(f"✅ Usuario demo creado: {demo_user_data['email']}")
    else:
        print(f"ℹ️ Usuario demo ya existe: {demo_user_data['email']}")
    
    # Crear usuario admin si no existe
    existing_admin = await get_user_by_email(db, admin_user_data["email"])
    if not existing_admin:
        admin_user = await create_user(db, admin_user_data)
        users_created.append(("Admin User", admin_user_data["email"], "Admin123!"))
        print(f"✅ Usuario admin creado: {admin_user_data['email']}")
    else:
        print(f"ℹ️ Usuario admin ya existe: {admin_user_data['email']}")
    
    return users_created, db

async def create_demo_devices(db, user_email: str):
    """Crea dispositivos de demostración para un usuario"""
    print(f"📱 Creando dispositivos para {user_email}...")
    
    user = await get_user_by_email(db, user_email)
    if not user:
        print(f"❌ Usuario no encontrado: {user_email}")
        return []
    
    # Verificar si ya tiene dispositivos
    existing_devices = await get_user_devices(db, user["id"])
    if len(existing_devices) >= 3:
        print(f"ℹ️ Usuario ya tiene {len(existing_devices)} dispositivos")
        return existing_devices
    
    # Configuraciones de dispositivos
    device_configs = [
        {
            "name": "Sensor Jardín Principal",
            "device_type": "multi_sensor",
            "location": "Jardín Principal",
            "plant_type": "Tomates Cherry"
        },
        {
            "name": "Sensor Invernadero",
            "device_type": "humidity_sensor", 
            "location": "Invernadero Norte",
            "plant_type": "Lechugas Hidropónicas"
        },
        {
            "name": "Sensor Viñedo",
            "device_type": "multi_sensor",
            "location": "Sector A - Viñedo",
            "plant_type": "Cabernet Sauvignon"
        }
    ]
    
    created_devices = []
    
    for config in device_configs:
        # Generar código de dispositivo
        devices = await create_device_code(db, config["device_type"], 1)
        if devices:
            device_code = devices[0]["device_code"]
            
            # Conectar dispositivo al usuario
            connected_device = await connect_device_to_user(
                db, 
                device_code, 
                user["id"],
                config
            )
            
            if connected_device:
                created_devices.append(connected_device)
                print(f"✅ Dispositivo creado: {device_code} - {config['name']}")
    
    return created_devices

async def generate_sensor_data(db, devices):
    """Genera datos históricos para los dispositivos"""
    print("📊 Generando datos históricos de sensores...")
    
    for device in devices:
        print(f"   📈 Generando datos para {device['name']}...")
        
        # Generar datos de los últimos 7 días
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        # Patrones base por tipo de planta
        plant_patterns = {
            "Tomates Cherry": {"base_humidity": 65, "variation": 15},
            "Lechugas Hidropónicas": {"base_humidity": 75, "variation": 10},
            "Cabernet Sauvignon": {"base_humidity": 45, "variation": 20}
        }
        
        pattern = plant_patterns.get(device.get("plant_type", ""), {"base_humidity": 55, "variation": 15})
        base_humidity = pattern["base_humidity"]
        
        readings = []
        current_date = start_date
        
        while current_date <= end_date:
            # Generar 24 lecturas por día (cada hora)
            for hour in range(24):
                reading_time = current_date.replace(hour=hour, minute=random.randint(0, 59), second=0, microsecond=0)
                
                if reading_time > end_date:
                    break
                
                # Factores de variación
                day_progress = (current_date - start_date).days / 7.0
                hour_factor = hour / 24.0
                
                # Humedad del suelo con patrón realista
                daily_cycle = 8 * (0.5 - abs(hour_factor - 0.5))  # Más húmedo en mañana/noche
                weekly_trend = -pattern["variation"] * day_progress  # Disminuye gradualmente
                random_variation = random.uniform(-5, 5)
                
                humidity = max(10, min(90, base_humidity + daily_cycle + weekly_trend + random_variation))
                
                # Temperatura con ciclo diurno
                temp_base = 20 + random.uniform(-2, 2)
                temp_cycle = 12 * abs(0.5 - abs(hour_factor - 0.5))  # Pico al mediodía
                temperature = temp_base + temp_cycle
                
                # Humedad del aire (inversa a temperatura)
                air_humidity = max(30, min(90, 85 - (temperature - 20) * 1.5 + random.uniform(-8, 8)))
                
                # Luz solar
                if 6 <= hour <= 18:
                    light_base = 60 + 30 * (0.5 - abs((hour - 12) / 6))
                    light = max(20, min(100, light_base + random.uniform(-15, 15)))
                else:
                    light = random.uniform(0, 15)
                
                # Batería (disminuye lentamente)
                battery = max(15, 95 - (day_progress * 20) + random.uniform(-3, 3))
                
                # Señal WiFi
                signal = random.randint(-75, -45)
                
                reading = {
                    "device_id": device["id"],
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
        
        # Insertar datos en lotes
        batch_size = 50
        for i in range(0, len(readings), batch_size):
            batch = readings[i:i + batch_size]
            await db.insert_records("sensor_humedad_suelo", batch)
        
        print(f"   ✅ {len(readings)} lecturas generadas para {device['name']}")

async def main():
    """Función principal del script"""
    print("🚀 Configurando demostración de PlantCare...")
    print("=" * 50)
    
    try:
        # Crear usuarios
        users_created, db = await create_demo_users()
        
        # Crear dispositivos para usuario demo
        demo_devices = await create_demo_devices(db, "demo@plantcare.com")
        
        # Generar datos históricos
        if demo_devices:
            await generate_sensor_data(db, demo_devices)
        
        print("\n" + "=" * 50)
        print("🎉 ¡Demostración configurada exitosamente!")
        print("\n📋 CREDENCIALES CREADAS:")
        
        # Mostrar credenciales
        all_credentials = [
            ("Usuario Demo", "demo@plantcare.com", "Demo123!"),
            ("Administrador", "admin@plantcare.com", "Admin123!")
        ]
        
        for role, email, password in all_credentials:
            print(f"   {role}:")
            print(f"   📧 Email: {email}")
            print(f"   🔒 Contraseña: {password}")
            print()
        
        print("📊 DISPOSITIVOS CREADOS:")
        for device in demo_devices:
            print(f"   📱 {device['device_code']} - {device['name']}")
        
        print("\n🎯 PRÓXIMOS PASOS:")
        print("   1. Inicia el servidor: python -m app.main")
        print("   2. Abre el frontend: npm start")
        print("   3. Inicia sesión con las credenciales de arriba")
        print("   4. Ve al Dashboard para ver los gráficos")
        print("   5. Explora el panel de admin (con usuario admin)")
        
        print("\n⚠️ NOTA: Solo para desarrollo y demostraciones")
        
    except Exception as e:
        print(f"❌ Error configurando demostración: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Configurar event loop para Windows
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main())
