#!/usr/bin/env python3
"""
Script de prueba para verificar que todo funcione correctamente
"""

import asyncio
import sys
import os

# Agregar el directorio de la app al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.api.core.database import init_db
from app.db.queries import get_user_by_email, get_user_devices

async def test_demo_setup():
    """Prueba que el setup de demo funcione correctamente"""
    print("🧪 Probando configuración de demo...")
    
    db = await init_db()
    
    # Verificar usuario demo
    demo_user = await get_user_by_email(db, "demo@plantcare.com")
    if demo_user:
        print(f"✅ Usuario demo encontrado: {demo_user['email']}")
        print(f"   - Rol: {demo_user.get('role_id', 'No definido')}")
        print(f"   - Activo: {demo_user.get('active', False)}")
        
        # Verificar dispositivos
        devices = await get_user_devices(db, demo_user["id"])
        print(f"✅ Dispositivos encontrados: {len(devices)}")
        
        for device in devices:
            print(f"   - {device.get('name', 'Sin nombre')} ({device.get('device_code', 'Sin código')})")
    else:
        print("❌ Usuario demo no encontrado")
        print("💡 Ejecuta el setup de demo desde la interfaz web")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(test_demo_setup())
