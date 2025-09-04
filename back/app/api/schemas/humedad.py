from pydantic import BaseModel, Field, validator, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SensorType(str, Enum):
    """Tipos de sensores"""
    HUMIDITY = "humidity"
    TEMPERATURE = "temperature"
    LIGHT = "light"
    AIR_HUMIDITY = "air_humidity"
    BATTERY = "battery"
    SIGNAL = "signal"

class ReadingQuality(str, Enum):
    """Calidad de la lectura"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class SensorReadingBase(BaseModel):
    """Esquema base para lecturas de sensores"""
    device_id: int = Field(..., description="ID del dispositivo")
    valor: float = Field(..., ge=0, le=100, description="Valor de humedad del suelo (%)")
    temperatura: Optional[float] = Field(None, ge=-20, le=60, description="Temperatura ambiente (°C)")
    luz: Optional[float] = Field(None, ge=0, description="Nivel de luz (lux)")
    humedad_ambiente: Optional[float] = Field(None, ge=0, le=100, description="Humedad ambiente (%)")
    battery_level: Optional[float] = Field(None, ge=0, le=100, description="Nivel de batería (%)")
    signal_strength: Optional[int] = Field(None, ge=-100, le=0, description="Fuerza de señal (dBm)")

    @field_validator('valor')
    def validate_humidity(cls, v):
        if v < 0 or v > 100:
            raise ValueError('La humedad debe estar entre 0 y 100%')
        return round(v, 2)

    @field_validator('temperatura')
    def validate_temperature(cls, v):
        if v is not None:
            if v < -20 or v > 60:
                raise ValueError('La temperatura debe estar entre -20 y 60°C')
            return round(v, 1)
        return v

    @field_validator('luz')
    def validate_light(cls, v):
        if v is not None and v < 0:
            raise ValueError('El nivel de luz no puede ser negativo')
        return v

    @field_validator('humedad_ambiente')
    def validate_air_humidity(cls, v):
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError('La humedad ambiente debe estar entre 0 y 100%')
            return round(v, 1)
        return v

    @field_validator('battery_level')
    def validate_battery(cls, v):
        if v is not None:
            if v < 0 or v > 100:
                raise ValueError('El nivel de batería debe estar entre 0 y 100%')
            return round(v, 1)
        return v

    @field_validator('signal_strength')
    def validate_signal(cls, v):
        if v is not None:
            if v < -100 or v > 0:
                raise ValueError('La fuerza de señal debe estar entre -100 y 0 dBm')
        return v

class SensorReadingCreate(SensorReadingBase):
    """Esquema para crear una nueva lectura de sensor"""
    pass

class SensorReadingResponse(SensorReadingBase):
    """Esquema de respuesta para lectura de sensor"""
    id: int
    fecha: datetime
    quality: ReadingQuality = ReadingQuality.GOOD

    model_config = ConfigDict(from_attributes=True)

class SensorReadingDetail(SensorReadingResponse):
    """Esquema extendido para detalles de lectura"""
    device_name: Optional[str] = None
    plant_type: Optional[str] = None
    location: Optional[str] = None

class SensorData(BaseModel):
    """Esquema simplificado para datos de humedad (compatibilidad)"""
    humedad: float = Field(..., ge=0, le=100, description="Valor de humedad del suelo")

    @field_validator('humedad')
    def validate_humidity(cls, v):
        if v < 0 or v > 100:
            raise ValueError('La humedad debe estar entre 0 y 100%')
        return round(v, 2)

class HumedadData(BaseModel):
    """Esquema para datos de humedad - compatibilidad legacy"""
    device_id: int = Field(..., description="ID del dispositivo")
    humedad: float = Field(..., ge=0, le=100, description="Valor de humedad del suelo (%)")
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Timestamp de la lectura")
    
    @field_validator('humedad')
    @classmethod
    def validate_humidity(cls, v):
        if v < 0 or v > 100:
            raise ValueError('La humedad debe estar entre 0 y 100%')
        return round(v, 2)

class DatoHumedad(BaseModel):
    """Esquema para datos históricos de humedad"""
    id: int
    valor: float
    fecha: str

class MensajeRespuesta(BaseModel):
    """Esquema para mensajes de respuesta"""
    mensaje: str
    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.now)

class SensorStats(BaseModel):
    """Esquema para estadísticas de sensores"""
    device_id: int
    total_readings: int
    avg_humidity: float
    min_humidity: float
    max_humidity: float
    avg_temperature: Optional[float]
    avg_light: Optional[float]
    avg_air_humidity: Optional[float]
    last_reading: datetime
    battery_level: Optional[float]
    signal_strength: Optional[int]
    readings_today: int
    readings_week: int
    readings_month: int

class SensorAlert(BaseModel):
    """Esquema para alertas de sensores"""
    device_id: int
    alert_type: str
    message: str
    severity: str
    threshold: float
    current_value: float
    created_at: datetime

class SensorReadingBatch(BaseModel):
    """Esquema para envío de múltiples lecturas"""
    device_id: int
    readings: List[SensorReadingCreate]
    batch_timestamp: datetime = Field(default_factory=datetime.now)

    @field_validator('readings')
    def validate_readings(cls, v):
        if not v:
            raise ValueError('Debe enviar al menos una lectura')
        if len(v) > 100:
            raise ValueError('No puede enviar más de 100 lecturas a la vez')
        return v 