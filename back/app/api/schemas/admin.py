from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

class RoleResponse(BaseModel):
    """Esquema de respuesta para roles"""
    id: int
    name: str
    description: Optional[str]
    created_at: datetime

class UserAdminResponse(BaseModel):
    """Esquema de respuesta para usuarios en panel admin"""
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    region: Optional[str] = None
    vineyard_name: Optional[str] = None
    hectares: Optional[float] = None
    grape_type: Optional[str] = None
    role_id: int
    role_name: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    active: bool
    device_count: int = 0
    
    @field_validator('id', 'role_id', 'device_count', mode='before')
    @classmethod
    def convert_to_int(cls, v: Any) -> int:
        """Convierte cualquier número a int"""
        if v is None:
            return 0
        if isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, str):
            try:
                return int(float(v))
            except (ValueError, TypeError):
                return 0
        return 0
    
    @field_validator('hectares', mode='before')
    @classmethod
    def convert_to_float(cls, v: Any) -> Optional[float]:
        """Convierte a float o None"""
        if v is None:
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None
    
    @field_validator('active', mode='before')
    @classmethod
    def convert_to_bool(cls, v: Any) -> bool:
        """Convierte a bool"""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ('true', '1', 't', 'yes', 'y')
        return bool(v)

class UserAdminCreate(BaseModel):
    """Esquema para crear usuario desde admin"""
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    region: Optional[str] = Field(None, max_length=100)
    vineyard_name: Optional[str] = Field(None, max_length=200)
    hectares: Optional[float] = Field(None, ge=0, le=999999.99)
    grape_type: Optional[str] = Field(None, max_length=100)
    role_id: int = Field(1, ge=1, le=3)
    password: str = Field(..., min_length=8, max_length=128)
    active: bool = True

    @field_validator('password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        return v

class UserAdminUpdate(BaseModel):
    """Esquema para actualizar usuario desde admin"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    region: Optional[str] = Field(None, max_length=100)
    vineyard_name: Optional[str] = Field(None, max_length=200)
    hectares: Optional[float] = Field(None, ge=0, le=999999.99)
    grape_type: Optional[str] = Field(None, max_length=100)
    role_id: Optional[int] = Field(None, ge=1, le=3)
    active: Optional[bool] = None

class DeviceAdminResponse(BaseModel):
    """Esquema de respuesta para dispositivos en panel admin"""
    id: int
    device_code: str
    name: Optional[str]
    device_type: str
    location: Optional[str]
    plant_type: Optional[str]
    user_id: Optional[int]
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    created_at: datetime
    last_seen: Optional[datetime]
    connected_at: Optional[datetime]
    active: bool
    connected: bool

class DeviceCodeBatch(BaseModel):
    """Esquema para generar lotes de códigos de dispositivos"""
    device_type: str = Field("humidity_sensor", description="Tipo de dispositivo")
    quantity: int = Field(..., ge=1, le=1000, description="Cantidad de códigos a generar")
    prefix: Optional[str] = Field(None, max_length=4, description="Prefijo personalizado (opcional)")

class AdminStats(BaseModel):
    """Esquema para estadísticas del panel admin"""
    total_users: int
    active_users: int
    inactive_users: int
    admin_users: int
    total_devices: int
    connected_devices: int
    unconnected_devices: int
    active_devices: int
    total_readings_today: int
    total_readings_week: int
    new_users_today: int
    new_users_week: int
    new_devices_today: int
    new_devices_week: int

class SystemHealth(BaseModel):
    """Esquema para salud del sistema"""
    database_status: str
    api_status: str
    email_service_status: str
    ai_service_status: str
    last_backup: Optional[datetime]
    disk_usage: Optional[float]
    memory_usage: Optional[float]
    cpu_usage: Optional[float]

class UserListFilters(BaseModel):
    """Filtros para lista de usuarios"""
    role_id: Optional[int] = None
    active: Optional[bool] = None
    region: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

class DeviceListFilters(BaseModel):
    """Filtros para lista de dispositivos"""
    device_type: Optional[str] = None
    connected: Optional[bool] = None
    active: Optional[bool] = None
    user_id: Optional[int] = None
    search: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

class BulkAction(BaseModel):
    """Esquema para acciones en lote"""
    action: str = Field(..., description="Acción a realizar: activate, deactivate, delete")
    user_ids: List[int] = Field(..., min_items=1, description="IDs de usuarios")

class BulkDeviceAction(BaseModel):
    """Esquema para acciones en lote de dispositivos"""
    action: str = Field(..., description="Acción a realizar: activate, deactivate, disconnect, delete")
    device_ids: List[int] = Field(..., min_items=1, description="IDs de dispositivos")

class AdminActivityLog(BaseModel):
    """Esquema para log de actividades de admin"""
    id: int
    admin_user_id: int
    admin_name: str
    action: str
    target_type: str  # user, device, system
    target_id: Optional[int]
    description: str
    ip_address: Optional[str]
    created_at: datetime

class DatabaseBackup(BaseModel):
    """Esquema para respaldo de base de datos"""
    filename: str
    size: int
    created_at: datetime
    type: str  # full, incremental
    status: str  # completed, failed, in_progress
