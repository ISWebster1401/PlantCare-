from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum
import re

class DeviceType(str, Enum):
    """Tipos de dispositivos disponibles"""
    HUMIDITY_SENSOR = "humidity_sensor"
    TEMPERATURE_SENSOR = "temperature_sensor"
    LIGHT_SENSOR = "light_sensor"
    MULTI_SENSOR = "multi_sensor"
    IRRIGATION_CONTROLLER = "irrigation_controller"

class DeviceStatus(str, Enum):
    """Estados de dispositivos"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"

class DeviceBase(BaseModel):
    """Esquema base para dispositivos"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del dispositivo")
    device_type: DeviceType = Field(DeviceType.HUMIDITY_SENSOR, description="Tipo de dispositivo")
    location: Optional[str] = Field(None, max_length=200, description="Ubicación del dispositivo")
    plant_type: Optional[str] = Field(None, max_length=100, description="Tipo de planta que monitorea")
    config: Optional[Dict[str, Any]] = Field(None, description="Configuración del dispositivo")

    @field_validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('El nombre del dispositivo no puede estar vacío')
        return v.strip() if v else v

class DeviceCreate(DeviceBase):
    """Esquema para crear un nuevo dispositivo"""
    pass

class DeviceUpdate(BaseModel):
    """Esquema para actualizar dispositivo"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    plant_type: Optional[str] = Field(None, max_length=100)
    config: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None

    @field_validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('El nombre del dispositivo no puede estar vacío')
        return v.strip() if v else v

class DeviceConnect(BaseModel):
    """Esquema para conectar un dispositivo usando código verificador"""
    device_code: str = Field(..., min_length=8, max_length=12, description="Código verificador del dispositivo")
    name: str = Field(..., min_length=1, max_length=100, description="Nombre para el dispositivo")
    location: Optional[str] = Field(None, max_length=200, description="Ubicación del dispositivo")
    plant_type: Optional[str] = Field(None, max_length=100, description="Tipo de planta que monitorea")

    @field_validator('device_code')
    def validate_device_code(cls, v):
        # Formato tipo patente: ABC-1234 o ABC1234
        code = v.upper().replace('-', '').replace(' ', '')
        if not re.match(r'^[A-Z]{2,4}[0-9]{4,6}$', code):
            raise ValueError('El código debe tener formato tipo patente (ej: ABC-1234)')
        return code

    @field_validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('El nombre del dispositivo no puede estar vacío')
        return v.strip()

class DeviceCodeGenerate(BaseModel):
    """Esquema para generar un nuevo código de dispositivo (solo admin)"""
    device_type: DeviceType = Field(DeviceType.HUMIDITY_SENSOR, description="Tipo de dispositivo")
    quantity: int = Field(1, ge=1, le=100, description="Cantidad de códigos a generar")

class DeviceResponse(DeviceBase):
    """Esquema de respuesta para dispositivo"""
    id: int
    device_code: str
    user_id: Optional[int]
    created_at: datetime
    last_seen: Optional[datetime]
    connected_at: Optional[datetime]
    active: bool
    connected: bool
    status: DeviceStatus = DeviceStatus.ACTIVE

    model_config = ConfigDict(from_attributes=True)

class DeviceDetail(DeviceResponse):
    """Esquema extendido para detalles de dispositivo"""
    last_reading: Optional[datetime] = None
    battery_level: Optional[float] = None
    signal_strength: Optional[int] = None
    total_readings: int = 0
    alerts_count: int = 0

class DeviceConfig(BaseModel):
    """Esquema para configuración de dispositivo"""
    reading_interval: int = Field(300, ge=60, le=3600, description="Intervalo de lectura en segundos")
    alert_threshold_low: float = Field(20.0, ge=0, le=100, description="Umbral bajo de alerta")
    alert_threshold_high: float = Field(80.0, ge=0, le=100, description="Umbral alto de alerta")
    enable_notifications: bool = Field(True, description="Habilitar notificaciones")
    auto_irrigation: bool = Field(False, description="Riego automático")
    irrigation_threshold: float = Field(30.0, ge=0, le=100, description="Umbral para riego automático")

class DeviceStats(BaseModel):
    """Esquema para estadísticas de dispositivo"""
    total_readings: int
    readings_today: int
    readings_week: int
    readings_month: int
    avg_humidity: Optional[float]
    avg_temperature: Optional[float]
    avg_light: Optional[float]
    last_reading: Optional[datetime]
    battery_level: Optional[float]
    signal_strength: Optional[int]
    uptime_percentage: float
    alerts_count: int
    recommendations_count: int

class DeviceCodeResponse(BaseModel):
    """Esquema de respuesta para códigos de dispositivo generados"""
    device_code: str
    device_type: DeviceType
    created_at: datetime
    qr_code_url: Optional[str] = None  # Para futuro: URL del código QR

class DeviceListResponse(BaseModel):
    """Esquema de respuesta para lista de dispositivos"""
    devices: list[DeviceResponse]
    total: int
    connected: int
    active: int
    offline: int
