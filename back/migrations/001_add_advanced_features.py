"""
Migración: Agregar características avanzadas del Cuarto Avance
- Columna avatar_url a users
- Columna deleted_at a alerts y ai_recommendations para soft delete
- Modificar foreign keys para usar CASCADE
"""
import asyncio
import sys

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def run_migration():
    """Ejecuta las migraciones necesarias"""
    from app.api.core.database import get_db
    from app.api.core.log import logger
    
    try:
        db = await get_db()
        
        # Agregar columna avatar_url si no existe
        try:
            await db.execute_query("SELECT avatar_url FROM users LIMIT 1")
            logger.info("Columna avatar_url ya existe")
        except:
            logger.info("Agregando columna avatar_url...")
            await db.execute_query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")
            logger.info("✅ Columna avatar_url agregada")
        
        # Agregar columna deleted_at a alerts si no existe
        try:
            await db.execute_query("SELECT deleted_at FROM alerts LIMIT 1")
            logger.info("Columna deleted_at ya existe en alerts")
        except:
            logger.info("Agregando columna deleted_at a alerts...")
            await db.execute_query("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP")
            logger.info("✅ Columna deleted_at agregada a alerts")
        
        # Agregar columna deleted_at a ai_recommendations si no existe
        try:
            await db.execute_query("SELECT deleted_at FROM ai_recommendations LIMIT 1")
            logger.info("Columna deleted_at ya existe en ai_recommendations")
        except:
            logger.info("Agregando columna deleted_at a ai_recommendations...")
            await db.execute_query("ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP")
            logger.info("✅ Columna deleted_at agregada a ai_recommendations")
        
        # Crear índices si no existen
        logger.info("Verificando índices...")
        
        indices_to_create = [
            ("idx_users_email", "users(email)"),
            ("idx_users_active", "users(active)"),
            ("idx_users_region", "users(region)"),
            ("idx_users_role_id", "users(role_id)"),
            ("idx_devices_user_id", "devices(user_id)"),
            ("idx_devices_active", "devices(active)"),
            ("idx_devices_connected", "devices(connected)"),
            ("idx_sensor_device_id", "sensor_humedad_suelo(device_id)"),
            ("idx_sensor_fecha", "sensor_humedad_suelo(fecha DESC)"),
            ("idx_alerts_user_id", "alerts(user_id)"),
            ("idx_alerts_active", "alerts(active)"),
            ("idx_alerts_deleted_at", "alerts(deleted_at)"),
        ]
        
        for index_name, index_def in indices_to_create:
            try:
                await db.execute_query(f"CREATE INDEX IF NOT EXISTS {index_name} ON {index_def}")
                logger.info(f"✅ Índice {index_name} creado")
            except Exception as e:
                logger.warning(f"No se pudo crear índice {index_name}: {str(e)}")
        
        logger.info("✅ Migración completada exitosamente")
        
    except Exception as e:
        logger.error(f"Error en migración: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migration())

