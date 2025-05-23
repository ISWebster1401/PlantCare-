from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.core.config import settings
from app.api.core.database import close_db
from app.api.routes import humedad

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description=settings.DESCRIPTION,
    openapi_tags=settings.OPENAPI_TAGS
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(humedad.router)

@app.on_event("shutdown")
async def shutdown_event():
    """Cierra la conexión a la base de datos cuando se apaga la aplicación"""
    await close_db()

@app.get("/")
async def root():
    """Endpoint de prueba para verificar que la API está funcionando"""
    return {
        "message": "Bienvenido a PlantCare API",
        "version": settings.PROJECT_VERSION
    }

