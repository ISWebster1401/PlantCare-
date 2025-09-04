from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
from typing import List, Dict, Any

# Cargar variables de entorno
load_dotenv()

class Settings(BaseSettings):
    """
    Configuración de la aplicación PlantCare.
    
    Esta clase maneja toda la configuración de la aplicación, incluyendo
    base de datos, servidor, seguridad y características específicas del proyecto.
    """
    # Configuración del proyecto
    PROJECT_NAME: str = "PlantCare"
    PROJECT_VERSION: str = "1.0.0"
    SUMMARY: str = "API para monitoreo inteligente de humedad de suelo"
    ROOT_PATH: str = "/api"
    DESCRIPTION: str = """
    🌱 **PlantCare API** - Sistema Inteligente de Monitoreo de Plantas

    ## Acerca de PlantCare
    PlantCare es una plataforma IoT avanzada que permite monitorear y gestionar
    la salud de tus plantas a través de sensores inteligentes y análisis de datos.

    ### Características Principales:
    - 📊 **Monitoreo en Tiempo Real**: Lecturas continuas de humedad del suelo
    - 🤖 **IA Integrada**: Análisis inteligente y recomendaciones automáticas
    - 📱 **API RESTful**: Interfaz completa para aplicaciones móviles y web
    - 🔐 **Autenticación Segura**: Sistema JWT con refresh tokens
    - 📈 **Histórico de Datos**: Almacenamiento y análisis de tendencias
    - 🌐 **Multi-dispositivo**: Soporte para múltiples sensores por usuario

    ### Tecnologías:
    - **Backend**: FastAPI + PostgreSQL
    - **Autenticación**: JWT + bcrypt
    - **IA**: OpenAI GPT para análisis y recomendaciones
    - **IoT**: Compatible con ESP8266/ESP32
    """     
    
    OPENAPI_TAGS: List[Dict[str, Any]] = [
        {
            "name": "Sensores",
            "description": "Operaciones relacionadas con las lecturas de sensores de humedad.",
        },
        {
            "name": "Dispositivos",
            "description": "Gestión de dispositivos IoT y su configuración.",
        },
        {
            "name": "Usuarios",
            "description": "Gestión de usuarios, perfiles y preferencias.",
        },
        {
            "name": "Autenticación",
            "description": "Registro, login y gestión de tokens de acceso.",
        },
        {
            "name": "IA",
            "description": "Análisis inteligente y recomendaciones automáticas.",
        },
        {
            "name": "Salud",
            "description": "Endpoints de monitoreo y estado del sistema.",
        }
    ]

    # Configuración de Base de Datos
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_DATABASE: str = os.getenv("DB_DATABASE", "plantcare")
    DB_SSLMODE: str = os.getenv("DB_SSLMODE", "prefer")
    DB_CONNECT_TIMEOUT: str = os.getenv("DB_CONNECT_TIMEOUT", "10")
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))

    # Configuración del servidor
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: str = os.getenv("SERVER_PORT", "5000")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    RELOAD: bool = os.getenv("RELOAD", "True").lower() == "true"

    # Configuración de JWT y Seguridad
    SECRET_KEY: str = os.getenv("SECRET_KEY", "tu_clave_secreta_muy_larga_y_segura_aqui_cambiala_en_produccion")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Configuración de Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "True").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # segundos

    # Configuración de IA
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    AI_ENABLED: bool = os.getenv("AI_ENABLED", "True").lower() == "true"

    # Configuración de Redis (para cache y rate limiting)
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "False").lower() == "true"

    # Configuración de Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "plantcare.log")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # Configuración de Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "False").lower() == "true"

    # Configuración específica de PlantCare
    MAX_SENSORS_PER_USER: int = int(os.getenv("MAX_SENSORS_PER_USER", "10"))
    DATA_RETENTION_DAYS: int = int(os.getenv("DATA_RETENTION_DAYS", "365"))
    ALERT_THRESHOLD_LOW: float = float(os.getenv("ALERT_THRESHOLD_LOW", "20.0"))
    ALERT_THRESHOLD_HIGH: float = float(os.getenv("ALERT_THRESHOLD_HIGH", "80.0"))

    @property
    def database_url(self) -> str:
        """Genera la URL de conexión a la base de datos"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    @property
    def redis_url(self) -> str:
        """Genera la URL de conexión a Redis"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Crear instancia de configuración con manejo de errores
try:
    settings = Settings()
except Exception as e:
    print(f"Error cargando configuración: {e}")
    # Configuración por defecto si falla la carga
    settings = Settings()