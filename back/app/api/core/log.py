import logging
import logging.handlers
import sys
import os
from datetime import datetime
from typing import Optional
from app.api.core.config import settings

class ColoredFormatter(logging.Formatter):
    """Formatter personalizado con colores para la consola"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        # Agregar color si es posible
        if hasattr(record, 'levelname') and record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.COLORS['RESET']}"
        
        return super().format(record)

class PlantCareLogger:
    """Sistema de logging personalizado para PlantCare"""
    
    def __init__(self, name: str = "plantcare"):
        self.name = name
        self.logger = logging.getLogger(name)
        
        # Evitar duplicación de handlers
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """Configura los handlers de logging"""
        try:
            # Configurar nivel de logging
            log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
            self.logger.setLevel(log_level)
            
            # Handler para consola con colores
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
            
            console_formatter = ColoredFormatter(
                fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            console_handler.setFormatter(console_formatter)
            
            # Handler para archivo
            if settings.LOG_FILE:
                try:
                    # Crear directorio de logs si no existe
                    log_dir = os.path.dirname(settings.LOG_FILE)
                    if log_dir and not os.path.exists(log_dir):
                        os.makedirs(log_dir)
                    
                    # Rotating file handler para evitar archivos muy grandes
                    file_handler = logging.handlers.RotatingFileHandler(
                        settings.LOG_FILE,
                        maxBytes=10*1024*1024,  # 10MB
                        backupCount=5,
                        encoding='utf-8'
                    )
                    file_handler.setLevel(logging.DEBUG)
                    
                    file_formatter = logging.Formatter(
                        fmt=settings.LOG_FORMAT,
                        datefmt='%Y-%m-%d %H:%M:%S'
                    )
                    file_handler.setFormatter(file_formatter)
                    
                    self.logger.addHandler(file_handler)
                except Exception as e:
                    # Si falla la configuración del archivo, solo usar consola
                    print(f"Warning: No se pudo configurar logging a archivo: {e}")
            
            self.logger.addHandler(console_handler)
            
        except Exception as e:
            # Configuración mínima si todo falla
            print(f"Error configurando logging: {e}")
            self.logger.setLevel(logging.INFO)
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))
            self.logger.addHandler(handler)
    
    def debug(self, message: str, **kwargs):
        """Log de nivel DEBUG"""
        try:
            self.logger.debug(self._format_message(message, **kwargs))
        except Exception:
            self.logger.debug(message)
    
    def info(self, message: str, **kwargs):
        """Log de nivel INFO"""
        try:
            self.logger.info(self._format_message(message, **kwargs))
        except Exception:
            self.logger.info(message)
    
    def warning(self, message: str, **kwargs):
        """Log de nivel WARNING"""
        try:
            self.logger.warning(self._format_message(message, **kwargs))
        except Exception:
            self.logger.warning(message)
    
    def error(self, message: str, **kwargs):
        """Log de nivel ERROR"""
        try:
            self.logger.error(self._format_message(message, **kwargs))
        except Exception:
            self.logger.error(message)
    
    def critical(self, message: str, **kwargs):
        """Log de nivel CRITICAL"""
        try:
            self.logger.critical(self._format_message(message, **kwargs))
        except Exception:
            self.logger.critical(message)
    
    def _format_message(self, message: str, **kwargs) -> str:
        """Formatea el mensaje con información adicional"""
        try:
            if kwargs:
                extra_info = " | ".join([f"{k}={v}" for k, v in kwargs.items()])
                return f"{message} | {extra_info}"
            return message
        except Exception:
            return message
    
    def log_request(self, method: str, path: str, status_code: int, duration: float, user_id: Optional[str] = None):
        """Log específico para requests HTTP"""
        try:
            user_info = f" | user_id={user_id}" if user_id else ""
            self.info(
                f"HTTP {method} {path} | status={status_code} | duration={duration:.3f}s{user_info}",
                method=method,
                path=path,
                status_code=status_code,
                duration=duration,
                user_id=user_id
            )
        except Exception as e:
            # Fallback simple si falla el logging detallado
            self.info(f"HTTP {method} {path} | status={status_code} | duration={duration:.3f}s")
    
    def log_database_operation(self, operation: str, table: str, duration: float, success: bool):
        """Log específico para operaciones de base de datos"""
        try:
            status = "SUCCESS" if success else "FAILED"
            self.info(
                f"DB {operation} on {table} | status={status} | duration={duration:.3f}s",
                operation=operation,
                table=table,
                duration=duration,
                success=success
            )
        except Exception:
            self.info(f"DB {operation} on {table} | status={'SUCCESS' if success else 'FAILED'}")
    
    def log_sensor_data(self, sensor_id: str, value: float, user_id: Optional[str] = None):
        """Log específico para datos de sensores"""
        try:
            user_info = f" | user_id={user_id}" if user_id else ""
            self.info(
                f"Sensor {sensor_id} | value={value}{user_info}",
                sensor_id=sensor_id,
                value=value,
                user_id=user_id
            )
        except Exception:
            self.info(f"Sensor {sensor_id} | value={value}")

# Instancia global del logger
try:
    logger = PlantCareLogger("plantcare")
except Exception as e:
    # Fallback si falla la creación del logger
    print(f"Error creando logger: {e}")
    logger = logging.getLogger("plantcare")
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(levelname)s - %(message)s'))
    logger.addHandler(handler)

# Funciones de conveniencia
def get_logger(name: str = "plantcare") -> PlantCareLogger:
    """Obtiene una instancia del logger"""
    try:
        return PlantCareLogger(name)
    except Exception:
        # Fallback
        return logger

def log_startup():
    """Log de inicio de la aplicación"""
    try:
        logger.info("🚀 Iniciando PlantCare API")
        logger.info(f"📊 Versión: {settings.PROJECT_VERSION}")
        logger.info(f"🌐 Servidor: {settings.SERVER_HOST}:{settings.SERVER_PORT}")
        logger.info(f"🔧 Debug: {settings.DEBUG}")
        logger.info(f"📝 Log Level: {settings.LOG_LEVEL}")
    except Exception as e:
        print(f"Error en log_startup: {e}")

def log_shutdown():
    """Log de cierre de la aplicación"""
    try:
        logger.info("🔌 Cerrando PlantCare API")
    except Exception as e:
        print(f"Error en log_shutdown: {e}")

def log_error_with_context(error: Exception, context: str = "", **kwargs):
    """Log de errores con contexto adicional"""
    try:
        logger.error(
            f"❌ Error en {context}: {str(error)}",
            error_type=type(error).__name__,
            context=context,
            **kwargs
        )
    except Exception as e:
        # Fallback simple
        logger.error(f"Error en {context}: {str(error)}")
        print(f"Error en log_error_with_context: {e}")