from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# ===============================================
# SCHEMAS SIMPLIFICADOS PARA ADMIN
# ===============================================

class UserSimpleAdmin(BaseModel):
    """Schema minimalista para usuarios en panel admin"""
    id: int
    email: str
    full_name: str
    is_active: bool
    plants_count: int = 0
    sensors_count: int = 0

class PlantSimpleAdmin(BaseModel):
    """Schema minimalista para plantas en panel admin"""
    id: int
    plant_name: str
    plant_type: Optional[str] = None
    user_email: str
    sensor_connected: bool = False
    sensor_device_id: Optional[str] = None

class SensorSimpleAdmin(BaseModel):
    """Schema minimalista para sensores en panel admin"""
    id: str  # UUID como string
    device_id: str
    name: str
    user_email: Optional[str] = None
    plant_name: Optional[str] = None
    status: str
    is_connected: bool = False
    last_connection: Optional[datetime] = None

class AdminStats(BaseModel):
    """Schema para estadísticas básicas del panel admin"""
    total_users: int
    active_users: int
    total_sensors: int
    connected_sensors: int
    total_plants: int

# ===============================================
# SCHEMAS PARA DETALLES
# ===============================================

class UserDetailAdmin(BaseModel):
    """Detalle de usuario para admin"""
    id: int
    email: str
    full_name: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    plants_count: int = 0
    sensors_count: int = 0

class PlantDetailAdmin(BaseModel):
    """Detalle de planta para admin"""
    id: int
    plant_name: str
    plant_type: Optional[str] = None
    scientific_name: Optional[str] = None
    health_status: Optional[str] = None
    user_email: str
    user_id: int
    sensor_id: Optional[str] = None
    sensor_device_id: Optional[str] = None
    created_at: datetime

class SensorDetailAdmin(BaseModel):
    """Detalle de sensor para admin"""
    id: str
    device_id: str
    name: str
    device_type: str
    status: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    plant_id: Optional[int] = None
    plant_name: Optional[str] = None
    is_connected: bool = False
    last_connection: Optional[datetime] = None
    created_at: datetime
