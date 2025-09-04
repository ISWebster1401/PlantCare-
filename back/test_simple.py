#!/usr/bin/env python3
"""
Script de prueba simple para verificar que la aplicación funciona
"""

import asyncio
import sys
import os

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Agregar el directorio back al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'back'))

async def test_basic_functionality():
    """Prueba básica de funcionalidad"""
    try:
        print("🔍 Probando configuración...")
        from app.api.core.config import settings
        print(f"✅ Configuración cargada: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
        
        print("🔍 Probando logging...")
        from app.api.core.log import logger
        logger.info("Test de logging funcionando")
        print("✅ Logging funcionando")
        
        print("🔍 Probando base de datos...")
        from app.api.core.database import get_db, health_check
        db = await get_db()
        print("✅ Conexión a base de datos establecida")
        
        health = await health_check()
        print(f"✅ Health check: {health}")
        
        print("🎉 Todas las pruebas básicas pasaron!")
        return True
        
    except Exception as e:
        print(f"❌ Error en prueba: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Iniciando pruebas básicas de PlantCare API...")
    success = asyncio.run(test_basic_functionality())
    
    if success:
        print("✅ Aplicación lista para usar!")
        sys.exit(0)
    else:
        print("❌ Hay problemas que necesitan ser resueltos")
        sys.exit(1)
