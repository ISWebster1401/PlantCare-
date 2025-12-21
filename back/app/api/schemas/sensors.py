"""
Schemas Pydantic para sensores (v2 con UUID).
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class SensorRegister(BaseModel):
    """Datos para registrar un nuevo sensor (v2)"""
    device_id: str = Field(..., description="ID único del dispositivo Wemos desde Arduino (ej: WEMOS_001)")
    device_type: str = Field(default="esp8266", description="Tipo de dispositivo (esp8266 o esp32)")
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del sensor (ej: 'Sensor Viña Norte')")


class SensorAssign(BaseModel):
    """Datos para asignar un sensor a una planta"""
    plant_id: int


class SensorDataInput(BaseModel):
    """Datos recibidos del sensor IoT (v2 con nuevos campos)"""
    device_id: str = Field(..., description="ID único del dispositivo Wemos")
    temperature: int = Field(..., ge=-20, le=60, description="Temperatura en grados Celsius (entero)")
    air_humidity: float = Field(..., ge=0, le=100, description="Humedad del aire en porcentaje (0-100)")
    soil_moisture: float = Field(..., ge=0, le=100, description="Humedad del suelo en porcentaje (0-100)")
    light_intensity: Optional[int] = Field(None, ge=0, description="Intensidad de luz en Lux o valor analógico")
    electrical_conductivity: Optional[float] = Field(None, ge=0, description="Conductividad eléctrica (mS/cm o similar)")


# Mantener SensorData por compatibilidad temporal (deprecated)
class SensorData(BaseModel):
    """Datos recibidos del sensor IoT (LEGACY - usar SensorDataInput)"""
    device_key: str
    humidity: float
    temperature: float
    pressure: Optional[float] = None


class SensorResponse(BaseModel):
    """Respuesta con información de un sensor (v2 con UUID)"""
    id: UUID
    device_id: str
    user_id: int
    plant_id: Optional[int]
    name: str
    device_type: str
    status: str  # 'active', 'inactive', 'maintenance'
    last_connection: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SensorReadingResponse(BaseModel):
    """Respuesta con datos de una lectura de sensor (v2)"""
    id: UUID
    sensor_id: UUID
    user_id: int
    plant_id: Optional[int]
    temperature: int
    air_humidity: float
    soil_moisture: float
    light_intensity: Optional[int]
    electrical_conductivity: Optional[float]
    timestamp: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class SensorReadingCreate(BaseModel):
    """Schema para crear una lectura de sensor"""
    temperature: int = Field(..., ge=-20, le=60)
    air_humidity: float = Field(..., ge=0, le=100)
    soil_moisture: float = Field(..., ge=0, le=100)
    light_intensity: Optional[int] = Field(None, ge=0)
    electrical_conductivity: Optional[float] = Field(None, ge=0)


class SensorToggle(BaseModel):
    """Datos para activar/desactivar un sensor"""
    is_active: bool
