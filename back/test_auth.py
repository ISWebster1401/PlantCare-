#!/usr/bin/env python3
"""
Script de prueba para el sistema de autenticación PlantCare
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Agregar el directorio back al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'back'))

from app.api.core.database import init_db, close_db
from app.api.core.auth_user import AuthService
from app.db.queries import create_user, get_user_by_email, update_user_last_login

async def test_database_connection():
    """Prueba la conexión a la base de datos"""
    print("🔌 Probando conexión a la base de datos...")
    try:
        db = await init_db()
        print("✅ Conexión a la base de datos exitosa")
        return db
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {str(e)}")
        return None

async def test_user_creation(db):
    """Prueba la creación de usuarios"""
    print("\n👤 Probando creación de usuarios...")
    
    # Datos de prueba
    test_user = {
        "first_name": "Usuario",
        "last_name": "Prueba",
        "email": "test@plantcare.com",
        "phone": "+56912345678",
        "region": "Valle del Maipo",
        "vineyard_name": "Viña de Prueba",
        "hectares": 10.5,
        "grape_type": "Merlot",
        "password_hash": "hash_de_prueba"
    }
    
    try:
        # Crear usuario
        user = await create_user(db, test_user)
        if user:
            print(f"✅ Usuario creado exitosamente: {user['email']}")
            print(f"   ID: {user['id']}")
            print(f"   Nombre: {user['first_name']} {user['last_name']}")
            return user
        else:
            print("❌ No se pudo crear el usuario")
            return None
    except Exception as e:
        print(f"❌ Error creando usuario: {str(e)}")
        return None

async def test_user_retrieval(db, user_id):
    """Prueba la recuperación de usuarios"""
    print("\n🔍 Probando recuperación de usuarios...")
    
    try:
        # Buscar por ID
        user = await get_user_by_email(db, "test@plantcare.com")
        if user:
            print(f"✅ Usuario encontrado por email: {user['email']}")
            print(f"   ID: {user['id']}")
            print(f"   Activo: {user['active']}")
            return user
        else:
            print("❌ No se pudo encontrar el usuario")
            return None
    except Exception as e:
        print(f"❌ Error recuperando usuario: {str(e)}")
        return None

async def test_password_hashing():
    """Prueba el hash de contraseñas"""
    print("\n🔐 Probando hash de contraseñas...")
    
    test_password = "Contraseña123!"
    
    try:
        # Generar hash
        password_hash = AuthService.get_password_hash(test_password)
        print(f"✅ Hash generado exitosamente")
        print(f"   Contraseña original: {test_password}")
        print(f"   Hash generado: {password_hash[:50]}...")
        
        # Verificar contraseña
        is_valid = AuthService.verify_password(test_password, password_hash)
        if is_valid:
            print("✅ Verificación de contraseña exitosa")
        else:
            print("❌ Verificación de contraseña falló")
        
        # Verificar contraseña incorrecta
        is_valid_wrong = AuthService.verify_password("ContraseñaIncorrecta", password_hash)
        if not is_valid_wrong:
            print("✅ Rechazo de contraseña incorrecta exitoso")
        else:
            print("❌ Aceptó contraseña incorrecta")
            
        return True
    except Exception as e:
        print(f"❌ Error en hash de contraseñas: {str(e)}")
        return False

async def test_jwt_tokens():
    """Prueba la generación y verificación de tokens JWT"""
    print("\n🎫 Probando tokens JWT...")
    
    token_data = {
        "sub": "test@plantcare.com",
        "user_id": 1
    }
    
    try:
        # Crear token de acceso
        access_token = AuthService.create_access_token(token_data)
        print(f"✅ Token de acceso generado")
        print(f"   Token: {access_token[:50]}...")
        
        # Crear token de refresco
        refresh_token = AuthService.create_refresh_token(token_data)
        print(f"✅ Token de refresco generado")
        print(f"   Token: {refresh_token[:50]}...")
        
        # Verificar token de acceso
        verified_data = AuthService.verify_token(access_token)
        if verified_data.email == token_data["sub"] and verified_data.user_id == token_data["user_id"]:
            print("✅ Verificación de token exitosa")
            print(f"   Email: {verified_data.email}")
            print(f"   User ID: {verified_data.user_id}")
        else:
            print("❌ Verificación de token falló")
            
        return True
    except Exception as e:
        print(f"❌ Error en tokens JWT: {str(e)}")
        return False

async def test_last_login_update(db, user_id):
    """Prueba la actualización del último login"""
    print("\n🕒 Probando actualización de último login...")
    
    try:
        success = await update_user_last_login(db, user_id)
        if success:
            print("✅ Último login actualizado exitosamente")
            
            # Verificar que se actualizó
            user = await get_user_by_email(db, "test@plantcare.com")
            if user and user.get("last_login"):
                print(f"   Último login: {user['last_login']}")
            else:
                print("   ⚠️ Último login no se actualizó correctamente")
        else:
            print("❌ No se pudo actualizar el último login")
            
        return success
    except Exception as e:
        print(f"❌ Error actualizando último login: {str(e)}")
        return False

async def cleanup_test_data(db):
    """Limpia los datos de prueba"""
    print("\n🧹 Limpiando datos de prueba...")
    
    try:
        # Eliminar usuario de prueba
        await db.delete_records("users", {"email": "test@plantcare.com"})
        print("✅ Datos de prueba eliminados")
        return True
    except Exception as e:
        print(f"❌ Error limpiando datos: {str(e)}")
        return False

async def run_all_tests():
    """Ejecuta todas las pruebas"""
    print("🚀 Iniciando pruebas del sistema de autenticación PlantCare")
    print("=" * 60)
    
    db = None
    test_results = []
    
    try:
        # Prueba 1: Conexión a base de datos
        db = await test_database_connection()
        test_results.append(("Conexión BD", db is not None))
        
        if not db:
            print("\n❌ No se puede continuar sin conexión a la base de datos")
            return
        
        # Prueba 2: Hash de contraseñas
        hash_success = await test_password_hashing()
        test_results.append(("Hash Contraseñas", hash_success))
        
        # Prueba 3: Tokens JWT
        jwt_success = await test_jwt_tokens()
        test_results.append(("Tokens JWT", jwt_success))
        
        # Prueba 4: Creación de usuario
        user = await test_user_creation(db)
        test_results.append(("Creación Usuario", user is not None))
        
        if user:
            # Prueba 5: Recuperación de usuario
            retrieval_success = await test_user_retrieval(db, user["id"])
            test_results.append(("Recuperación Usuario", retrieval_success))
            
            # Prueba 6: Actualización de último login
            login_update_success = await test_last_login_update(db, user["id"])
            test_results.append(("Actualización Login", login_update_success))
            
            # Limpiar datos de prueba
            cleanup_success = await cleanup_test_data(db)
            test_results.append(("Limpieza Datos", cleanup_success))
        
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {str(e)}")
        test_results.append(("Ejecución General", False))
    
    finally:
        # Cerrar conexión a la base de datos
        if db:
            await close_db()
            print("\n🔌 Conexión a la base de datos cerrada")
    
    # Mostrar resumen de resultados
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ PASÓ" if success else "❌ FALLÓ"
        print(f"{test_name:<25} {status}")
        if success:
            passed += 1
    
    print("-" * 60)
    print(f"Total: {total} | Pasaron: {passed} | Fallaron: {total - passed}")
    
    if passed == total:
        print("\n🎉 ¡Todas las pruebas pasaron exitosamente!")
        print("🚀 El sistema de autenticación está funcionando correctamente")
    else:
        print(f"\n⚠️ {total - passed} prueba(s) fallaron")
        print("🔧 Revisa los errores anteriores para solucionarlos")
    
    return passed == total

def main():
    """Función principal"""
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Pruebas interrumpidas por el usuario")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error inesperado: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
