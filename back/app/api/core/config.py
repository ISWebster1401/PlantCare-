from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

class Settings(BaseSettings):
    """
    Configuración de la aplicación.
    
    Attributes:
        PROJECT_NAME (str): Nombre del proyecto.
        PROJECT_VERSION (str): Versión actual del proyecto.
        SUMMARY (str): Resumen breve del propósito del proyecto.
    """
    # Configuración del proyecto
    PROJECT_NAME: str = "PlantCare"
    PROJECT_VERSION: str = "1.0.0"
    SUMMARY: str = "API para monitoreo de humedad de suelo"
    ROOT_PATH: str = "/api"
    DESCRIPTION: str = """
    API para el sistema de monitoreo de humedad del suelo.

    ## Acerca de PlantCare
    PlantCare es una plataforma que permite monitorear la humedad del suelo de tus plantas
    a través de sensores IoT, permitiéndote mantener un registro detallado del estado de tus plantas.

    ## Acerca del Sistema
    El sistema utiliza sensores de humedad conectados a dispositivos ESP8266 que envían datos
    a esta API para su almacenamiento y posterior consulta.

    ## Acerca de la API
    La API de PlantCare permite a los dispositivos IoT enviar lecturas de humedad y a los usuarios
    consultar el historial de lecturas de sus dispositivos.
    """     
    OPENAPI_TAGS: list = [
        {
            "name": "Sensores",
            "description": "Operaciones relacionadas con las lecturas de sensores.",
        },
        {
            "name": "Dispositivos",
            "description": "Operaciones relacionadas con la gestión de dispositivos IoT.",
        },
        {
            "name": "Usuarios",
            "description": "Operaciones relacionadas con la gestión de usuarios.",
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

    # Configuración del servidor
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: str = os.getenv("SERVER_PORT", "5000")

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()