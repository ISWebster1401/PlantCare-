from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
import logging
from .api.routes import humedad, auth
from .api.core.database import close_db, get_db
from .api.core.user_db import UserDatabase

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title="PlantCare API", 
    description="API para gestionar plantas, sensores IoT y usuarios",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos si existe un directorio 'static'
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    try:
        # Try to initialize database
        db = await get_db()
        if db:
            await UserDatabase.create_users_table(db)
            logger.info("Database tables initialized successfully")
        else:
            logger.warning("Database connection not available - running in demo mode")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        logger.warning("Application will continue in demo mode without database")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await close_db()
    logger.info("Application shutdown complete")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "PlantCare API is running"}

# Incluir routers
app.include_router(humedad.router)
app.include_router(auth.router)

