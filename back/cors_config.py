"""
Configuración de CORS para el backend FastAPI
Asegura que el frontend Vue.js pueda comunicarse correctamente con el backend
"""

from fastapi.middleware.cors import CORSMiddleware

def configure_cors(app):
    """
    Configura CORS para permitir comunicación con el frontend Vue.js
    
    Args:
        app: Instancia de FastAPI
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Frontend Vue.js en desarrollo
            "http://127.0.0.1:3000",
            "http://localhost:5173",  # Vite dev server alternativo
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5500",
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
        ],
    )
    
    print("✅ CORS configurado para frontend Vue.js")
    print("   - Orígenes permitidos: localhost:3000, localhost:5173")
    print("   - Métodos: GET, POST, PUT, DELETE, OPTIONS")
    print("   - Headers: Authorization, Content-Type, etc.")
