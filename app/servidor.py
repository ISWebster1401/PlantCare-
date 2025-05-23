import uvicorn
from app.api.core.config import settings

def start_server():
    """Inicia el servidor FastAPI con la configuración definida"""
    uvicorn.run(
        "app.main:app",
        host=settings.SERVER_HOST,
        port=int(settings.SERVER_PORT),
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    start_server()