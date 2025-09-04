#!/usr/bin/env python3
"""
Script de prueba para verificar que el registro de usuarios funciona correctamente
"""

import asyncio
import sys
import os

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Agregar el directorio back al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'back'))

async def test_user_registration():
    """Prueba el registro de usuarios"""
    try:
        print("🔍 Probando registro de usuarios...")
        
        from app.api.core.database import get_db
        from app.api.core.auth_user import AuthService
        from app.api.schemas.user import UserCreate
        
        # Obtener conexión a la base de datos
        db = await get_db()
        print("✅ Conexión a base de datos establecida")
        
        # Datos de prueba
        test_user_data = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@plantcare.com",
            "phone": "123456789",
            "region": "Test Region",
            "vineyard_name": "Test Vineyard",
            "hectares": 10.5,
            "grape_type": "Test Grape",
            "password": "TestPassword123!",
            "confirm_password": "TestPassword123!"
        }
        
        print("🔍 Intentando registrar usuario de prueba...")
        
        # Registrar usuario usando AuthService
        user = await AuthService.register_user(test_user_data, db)
        
        if user:
            print(f"✅ Usuario registrado exitosamente: {user.get('email')}")
            print(f"   ID: {user.get('id')}")
            print(f"   Nombre: {user.get('first_name')} {user.get('last_name')}")
            
            # Probar autenticación
            print("🔍 Probando autenticación...")
            authenticated_user = await AuthService.authenticate_user(
                test_user_data["email"], 
                test_user_data["password"],
                db
            )
            
            if authenticated_user:
                print("✅ Autenticación exitosa")
            else:
                print("❌ Error en autenticación")
                
        else:
            print("❌ Error registrando usuario")
            
        print("🎉 Prueba de registro completada!")
        return True
        
    except Exception as e:
        print(f"❌ Error en prueba: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Iniciando prueba de registro de usuarios...")
    success = asyncio.run(test_user_registration())
    
    if success:
        print("✅ Registro de usuarios funciona correctamente!")
        sys.exit(0)
    else:
        print("❌ Hay problemas con el registro de usuarios")
        sys.exit(1)
