import asyncio
import sys
import os
import time
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv
load_dotenv() 

# Configurar event loop para Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.api.core.config import settings
from app.api.core.log import logger, log_startup, log_shutdown, log_error_with_context
from app.api.core.database import init_db, close_db, health_check, get_database_stats
from app.api.core.supabase_storage import init_supabase
from app.api.core.redis_cache import init_redis
from app.api.routes import auth, humedad, devices, ai, contact, admin, reports, demo, uploads, plants, sensors, notifications, streaks, achievements, store
from app.api.routes import demo_data

# Crear aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME, 
    description=settings.DESCRIPTION,
    version=settings.PROJECT_VERSION,
    openapi_tags=settings.OPENAPI_TAGS
)

# Montar directorio de uploads para servir archivos estáticos
import os
from pathlib import Path

UPLOAD_DIR = Path("uploads")
if UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
    logger.info("📁 Directorio de uploads montado en /uploads")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)



# Suprimir warning de pgdbtoolkit cuando no hay extensión vector en la DB
import logging as std_logging
try:
    std_logging.getLogger("pgdbtoolkit.async_db").setLevel(std_logging.ERROR)
except Exception:
    pass

# Eventos de la aplicación
@app.on_event("startup")
async def startup_event():
    """Evento que se ejecuta al iniciar la aplicación"""
    try:
        log_startup()
        await init_db()
        logger.info(f"📊 Base de datos conectada en {settings.DB_HOST}:{settings.DB_PORT}")
        
        # Inicializar Supabase Storage
        init_supabase()
        
        # Inicializar Redis Cache
        redis_client = init_redis()
        if redis_client:
            # Probar conexión
            try:
                await redis_client.ping()
                logger.info("✅ Redis Cache conectado y funcionando")
            except Exception as e:
                logger.warning(f"⚠️ Redis Cache no responde: {str(e)}")
        
        logger.info(f"🌐 Servidor ejecutándose en http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")
        logger.info("✅ Aplicación iniciada correctamente")
    except Exception as e:
        log_error_with_context(e, "startup")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Evento que se ejecuta al cerrar la aplicación"""
    try:
        await close_db()
        logger.info("🔌 Conexión a la base de datos cerrada")
        log_shutdown()
    except Exception as e:
        log_error_with_context(e, "shutdown")

# Middleware para logging de requests (versión simplificada)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware para logging de requests HTTP"""
    start_time = time.time()
    
    try:
        # Procesar la request
        response = await call_next(request)
        
        # Calcular duración
        duration = time.time() - start_time
        
        # Log simple y seguro
        try:
            logger.info(f"HTTP {request.method} {request.url.path} - {response.status_code} - {duration:.3f}s")
        except Exception:
            # Si falla el logging, no interrumpir
            pass
        
        return response
        
    except Exception as e:
        # Si hay un error, logearlo y re-lanzar
        duration = time.time() - start_time
        try:
            logger.error(f"Error en request {request.method} {request.url.path}: {str(e)}")
        except Exception:
            print(f"Error en request {request.method} {request.url.path}: {str(e)}")
        
        raise


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        error_dict = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "input": str(error.get("input")) if error.get("input") is not None else None
        }
        errors.append(error_dict)
    
    return JSONResponse(
        status_code=422,
        content={"detail": errors}
    )

# Incluir routers
app.include_router(humedad.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(devices.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
# Quotes router eliminado - ya no se usa

# Nuevos routers v2.0
app.include_router(plants.router, prefix="/api")
app.include_router(sensors.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(streaks.router, prefix="/api")
app.include_router(achievements.router, prefix="/api")
app.include_router(store.router, prefix="/api")
app.include_router(demo_data.router, prefix="/api")

# Ruta raíz
@app.get("/", response_class=HTMLResponse)
async def root():
    """Página de inicio de la API"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{settings.PROJECT_NAME}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #2c3e50; text-align: center; }}
            .info {{ background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }}
            .endpoints {{ background: #3498db; color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }}
            .endpoints h3 {{ margin-top: 0; }}
            .endpoints ul {{ margin: 0; padding-left: 20px; }}
            .endpoints li {{ margin: 5px 0; }}
            a {{ color: #3498db; text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🌱 {settings.PROJECT_NAME}</h1>
            <div class="info">
                <h3>📋 Descripción</h3>
                <p>{settings.SUMMARY}</p>
                <p><strong>Versión:</strong> {settings.PROJECT_VERSION}</p>
            </div>
            
            <div class="endpoints">
                <h3>🔗 Endpoints Principales</h3>
                <ul>
                    <li><a href="/docs">📚 Documentación de la API (Swagger UI)</a></li>
                    <li><a href="/redoc">📖 Documentación alternativa (ReDoc)</a></li>
                    <li><strong>🔐 Autenticación:</strong> /api/auth/register, /api/auth/login</li>
                    <li><strong>📊 Sensores:</strong> /api/humedad</li>
                    <li><strong>🔧 Dispositivos:</strong> /api/devices</li>
                </ul>
            </div>
            
            <div class="info">
                <h3>🚀 Inicio Rápido</h3>
                <p>Para comenzar a usar la API:</p>
                <ol>
                    <li>Registra un usuario en <code>/api/auth/register</code></li>
                    <li>Inicia sesión en <code>/api/auth/login</code></li>
                    <li>Usa el token recibido en el header <code>Authorization: Bearer &lt;token&gt;</code></li>
                    <li>Consulta la documentación completa en <a href="/docs">/docs</a></li>
                </ol>
            </div>
        </div>
    </body>
    </html>
    """

# Ruta de salud
@app.get("/health", tags=["Salud"])
async def health_check():
    """Endpoint para verificar el estado de la aplicación"""
    from app.api.core.database import health_check as db_health_check
    
    db_status = await db_health_check()
    
    return {
        "status": "healthy" if db_status["status"] == "healthy" else "unhealthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": db_status,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health/detailed", tags=["Salud"])
async def detailed_health_check():
    """Endpoint para verificar el estado detallado de la aplicación"""
    from app.api.core.database import health_check as db_health_check, get_database_stats
    
    db_status = await db_health_check()
    db_stats = await get_database_stats()
    
    return {
        "status": "healthy" if db_status["status"] == "healthy" else "unhealthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": db_status,
        "database_stats": db_stats,
        "features": {
            "ai_enabled": settings.AI_ENABLED
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.SERVER_HOST,
        port=int(settings.SERVER_PORT),
        reload=True
    )

