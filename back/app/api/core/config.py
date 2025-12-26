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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))  # 1 hora por defecto
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Configuración de IA (solo OpenAI para reconocimiento de plantas)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    AI_ENABLED: bool = os.getenv("AI_ENABLED", "True").lower() == "true"

    # ============================================
    # Configuración de Supabase Storage
    # ============================================
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "").strip()  # anon public key (recomendada)
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()  # service_role key (solo si se necesita permisos admin)
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "plantcare").strip()
    
    # ============================================
    # Configuración de Redis Cache
    # ============================================
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379").strip()
    REDIS_CACHE_TTL_LATEST: int = int(os.getenv("REDIS_CACHE_TTL_LATEST", "900"))  # 15 minutos
    REDIS_CACHE_TTL_DAILY: int = int(os.getenv("REDIS_CACHE_TTL_DAILY", "86400"))  # 24 horas
    REDIS_CACHE_TTL_WEEKLY: int = int(os.getenv("REDIS_CACHE_TTL_WEEKLY", "604800"))  # 7 días
    

    # Autenticación con Google
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_ALLOWED_DOMAINS: str = os.getenv("GOOGLE_ALLOWED_DOMAINS", "")

    # Configuración de zona horaria
    APP_TIMEZONE: str = os.getenv("APP_TIMEZONE", "America/Santiago")

    # Configuración de SendGrid
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "noreply@plantcare.com")
    SENDGRID_FROM_NAME: str = os.getenv("SENDGRID_FROM_NAME", "PlantCare Support")
    CONTACT_EMAIL: str = os.getenv("CONTACT_EMAIL", "contacto@plantcare.com")

    # Configuración de Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "plantcare.log")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # Configuración específica de PlantCare
    MAX_SENSORS_PER_USER: int = int(os.getenv("MAX_SENSORS_PER_USER", "10"))
    DATA_RETENTION_DAYS: int = int(os.getenv("DATA_RETENTION_DAYS", "365"))
    ALERT_THRESHOLD_LOW: float = float(os.getenv("ALERT_THRESHOLD_LOW", "20.0"))
    ALERT_THRESHOLD_HIGH: float = float(os.getenv("ALERT_THRESHOLD_HIGH", "80.0"))

    @property
    def database_url(self) -> str:
        """Genera la URL de conexión a la base de datos"""
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_DATABASE}"

    class Config:
        env_file = ".env"
        case_sensitive = False

# Crear instancia de configuración con manejo de errores
import logging
logger = logging.getLogger(__name__)

try:
    settings = Settings()
    
    # Validar OpenAI API key
    if settings.OPENAI_API_KEY:
        if len(settings.OPENAI_API_KEY) < 20:
            logger.warning("⚠️ OPENAI_API_KEY parece ser inválida (muy corta). Verifica tu archivo .env")
        else:
            logger.info(f"✅ OPENAI_API_KEY configurada (longitud: {len(settings.OPENAI_API_KEY)} caracteres)")
    else:
        logger.warning("⚠️ OPENAI_API_KEY no está configurada. Las funciones de IA no funcionarán.")
        logger.warning("💡 Verifica que el archivo .env esté en la carpeta 'back/' y contenga OPENAI_API_KEY=...")
    
    # Validar Supabase Storage
    logger.info("=" * 60)
    logger.info("📦 VERIFICACIÓN DE SUPABASE STORAGE")
    logger.info("=" * 60)
    
    if settings.SUPABASE_URL:
        logger.info(f"✅ SUPABASE_URL configurado: {settings.SUPABASE_URL}")
    else:
        logger.error("❌ SUPABASE_URL NO está configurado")
    
    if settings.SUPABASE_KEY:
        logger.info(f"✅ SUPABASE_KEY configurado (longitud: {len(settings.SUPABASE_KEY)} caracteres) - service_role (recomendada para backend)")
        key_type = "service_role key"
    elif settings.SUPABASE_ANON_KEY:
        logger.warning(f"⚠️ SUPABASE_ANON_KEY configurado (longitud: {len(settings.SUPABASE_ANON_KEY)} caracteres) - anon key")
        logger.warning("   💡 Recomendado: Usa SUPABASE_KEY (service_role) para el backend")
        key_type = "anon public key"
    else:
        logger.error("❌ SUPABASE_KEY y SUPABASE_ANON_KEY NO están configurados")
        key_type = None
    
    if settings.SUPABASE_STORAGE_BUCKET:
        logger.info(f"✅ SUPABASE_STORAGE_BUCKET configurado: {settings.SUPABASE_STORAGE_BUCKET}")
    else:
        logger.warning("⚠️ SUPABASE_STORAGE_BUCKET no configurado, usando 'plantcare' por defecto")
    
    if settings.SUPABASE_URL and (settings.SUPABASE_ANON_KEY or settings.SUPABASE_KEY):
        logger.info("=" * 60)
        logger.info(f"✅ Supabase Storage COMPLETAMENTE CONFIGURADO")
        logger.info(f"   URL: {settings.SUPABASE_URL}")
        logger.info(f"   Bucket: {settings.SUPABASE_STORAGE_BUCKET or 'plantcare'}")
        logger.info(f"   Key Type: {key_type}")
        logger.info("=" * 60)
    else:
        logger.error("=" * 60)
        logger.error("❌ Supabase Storage NO está completamente configurado")
        logger.error("   Las funciones de imágenes NO funcionarán")
        logger.error("💡 Verifica que el archivo .env contenga:")
        logger.error("   - SUPABASE_URL")
        logger.error("   - SUPABASE_KEY (service_role, RECOMENDADA para backend) o SUPABASE_ANON_KEY")
        logger.error("   - SUPABASE_STORAGE_BUCKET (opcional, default: 'plantcare')")
        logger.error("=" * 60)
    
    # Validar Redis Cache
    if settings.REDIS_URL:
        logger.info(f"✅ Redis Cache configurado: {settings.REDIS_URL}")
        logger.info(f"   TTL Latest: {settings.REDIS_CACHE_TTL_LATEST}s ({settings.REDIS_CACHE_TTL_LATEST // 60} min)")
        logger.info(f"   TTL Daily: {settings.REDIS_CACHE_TTL_DAILY}s ({settings.REDIS_CACHE_TTL_DAILY // 3600} horas)")
        logger.info(f"   TTL Weekly: {settings.REDIS_CACHE_TTL_WEEKLY}s ({settings.REDIS_CACHE_TTL_WEEKLY // 86400} días)")
    else:
        logger.warning("⚠️ REDIS_URL no está configurado. El cache no estará disponible.")
        logger.warning("💡 Verifica que el archivo .env contenga REDIS_URL")
        
except Exception as e:
    logger.error(f"Error cargando configuración: {e}")
    # Configuración por defecto si
    #  falla la carga
    settings = Settings()