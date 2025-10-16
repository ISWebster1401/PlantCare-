#!/usr/bin/env python3
"""
Script simple para crear usuario administrador
Ejecutar: python create_admin.py
"""

import asyncio
import sys
import os

# Agregar el directorio de la app al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.api.core.database import init_db
from app.api.core.auth_user import AuthService
from app.db.queries import create_user, get_user_by_email

async def create_admin():
    """Crea un usuario administrador"""
    print("👑 Creando usuario administrador...")
    
    db = await init_db()
    
    admin_email = "admin@plantcare.com"
    
    # Verificar si ya existe
    existing_admin = await get_user_by_email(db, admin_email)
    if existing_admin:
        print(f"ℹ️ Usuario administrador ya existe: {admin_email}")
        print(f"📧 Email: {admin_email}")
        print(f"🔒 Contraseña: Admin123!")
        return
    
    # Crear usuario administrador
    admin_data = {
        "first_name": "Admin",
        "last_name": "PlantCare",
        "email": admin_email,
        "phone": "+56987654321",
        "region": "Región Metropolitana",
        "vineyard_name": "PlantCare HQ",
        "hectares": 100.0,
        "grape_type": "Administración",
        "password_hash": AuthService.get_password_hash("Admin123!"),
        "role_id": 2,
        "active": True
    }
    
    try:
        admin_user = await create_user(db, admin_data)
        print("✅ Usuario administrador creado exitosamente!")
        print(f"📧 Email: {admin_email}")
        print(f"🔒 Contraseña: Admin123!")
        print("\n🎯 Ahora puedes:")
        print("   1. Iniciar sesión con estas credenciales")
        print("   2. Acceder al panel de administración")
        print("   3. Gestionar usuarios y dispositivos")
        print("   4. Generar códigos de dispositivos")
        
    except Exception as e:
        print(f"❌ Error creando administrador: {str(e)}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(create_admin())
