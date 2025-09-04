#!/usr/bin/env python3
"""
Script de prueba específico para Windows - PlantCare API
"""

import asyncio
import sys
import os

# Configurar event loop para Windows ANTES de cualquier import
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    print("🔧 Event loop configurado para Windows")

# Agregar el directorio back al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'back'))

async def test_windows_compatibility():
    """Prueba la compatibilidad con Windows"""
    try:
        print("🚀 Iniciando pruebas de compatibilidad con Windows...")
        print("=" * 60)
        
        # Test 1: Configuración
        print("🔍 Test 1: Configuración")
        try:
            from app.api.core.config import settings
            print(f"✅ Configuración cargada: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
            print(f"   Database URL: {settings.database_url[:30]}...")
        except Exception as e:
            print(f"❌ Error en configuración: {e}")
            return False
        
        # Test 2: Logging
        print("\n🔍 Test 2: Sistema de Logging")
        try:
            from app.api.core.log import logger
            logger.info("Test de logging funcionando en Windows")
            print("✅ Logging funcionando correctamente")
        except Exception as e:
            print(f"❌ Error en logging: {e}")
            return False
        
        # Test 3: Base de Datos
        print("\n🔍 Test 3: Conexión a Base de Datos")
        try:
            from app.api.core.database import get_db, health_check
            
            print("   Conectando a la base de datos...")
            db = await get_db()
            print("✅ Conexión a base de datos establecida")
            
            print("   Verificando health check...")
            health = await health_check()
            print(f"✅ Health check: {health}")
            
        except Exception as e:
            print(f"❌ Error en base de datos: {e}")
            print("   Verifica que PostgreSQL esté ejecutándose")
            print("   Verifica las credenciales en el archivo .env")
            return False
        
        # Test 4: Autenticación
        print("\n🔍 Test 4: Sistema de Autenticación")
        try:
            from app.api.core.auth_user import AuthService
            import time
            
            # Datos de prueba con email único
            timestamp = int(time.time())
            test_user_data = {
                "first_name": "Test",
                "last_name": "User",
                "email": f"test_windows_{timestamp}@plantcare.com",
                "phone": "123456789",
                "region": "Test Region",
                "vineyard_name": "Test Vineyard",
                "hectares": 10.5,
                "grape_type": "Test Grape",
                "password": "TestPassword123!",
                "confirm_password": "TestPassword123!"
            }
            
            print("   Probando registro de usuario...")
            user = await AuthService.register_user(test_user_data, db)
            
            if user:
                print(f"✅ Usuario registrado: {user.get('email')}")
                
                print("   Probando autenticación...")
                auth_user = await AuthService.authenticate_user(
                    test_user_data["email"], 
                    test_user_data["password"],
                    db
                )
                
                if auth_user:
                    print("✅ Autenticación exitosa")
                else:
                    print("❌ Error en autenticación")
                    return False
            else:
                print("❌ Error registrando usuario")
                return False
                
        except Exception as e:
            print(f"❌ Error en autenticación: {e}")
            return False
        
        print("\n" + "=" * 60)
        print("🎉 ¡Todas las pruebas pasaron exitosamente!")
        print("✅ La aplicación es compatible con Windows")
        return True
        
    except Exception as e:
        print(f"\n❌ Error general en las pruebas: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔧 Script de prueba para Windows - PlantCare API")
    print("=" * 60)
    
    success = asyncio.run(test_windows_compatibility())
    
    if success:
        print("\n✅ ¡Aplicación lista para usar en Windows!")
        print("   Puedes iniciar la aplicación con:")
        print("   python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload")
        sys.exit(0)
    else:
        print("\n❌ Hay problemas que necesitan ser resueltos")
        print("   Revisa los errores anteriores y verifica:")
        print("   1. PostgreSQL está ejecutándose")
        print("   2. Archivo .env configurado correctamente")
        print("   3. Todas las dependencias instaladas")
        sys.exit(1)
