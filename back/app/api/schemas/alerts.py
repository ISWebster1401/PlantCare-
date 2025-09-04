from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AlertType(str, Enum):
    """Tipos de alertas disponibles"""
    LOW_HUMIDITY = "low_humidity"
    HIGH_HUMIDITY = "high_humidity"
    DEVICE_OFFLINE = "device_offline"
    BATTERY_LOW = "battery_low"
    SIGNAL_WEAK = "signal_weak"
    TEMPERATURE_HIGH = "temperature_high"
    TEMPERATURE_LOW = "temperature_low"
    LIGHT_LOW = "light_low"
    MAINTENANCE_DUE = "maintenance_due"

class AlertSeverity(str, Enum):
    """Niveles de severidad de alertas"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(str, Enum):
    """Estados de alertas"""
    ACTIVE = "active"
    READ = "read"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class AlertBase(BaseModel):
    """Esquema base para alertas"""
    alert_type: AlertType = Field(..., description="Tipo de alerta")
    message: str = Field(..., min_length=1, max_length=500, description="Mensaje de la alerta")
    severity: AlertSeverity = Field(AlertSeverity.MEDIUM, description="Severidad de la alerta")
    device_id: int = Field(..., description="ID del dispositivo relacionado")

    @validator('message')
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('El mensaje de la alerta no puede estar vacío')
        return v.strip()

class AlertCreate(AlertBase):
    """Esquema para crear una nueva alerta"""
    pass

class AlertUpdate(BaseModel):
    """Esquema para actualizar alerta"""
    status: Optional[AlertStatus] = None
    read_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class AlertResponse(AlertBase):
    """Esquema de respuesta para alerta"""
    id: int
    user_id: int
    created_at: datetime
    read_at: Optional[datetime]
    resolved_at: Optional[datetime]
    status: AlertStatus = AlertStatus.ACTIVE

    model_config = ConfigDict(from_attributes=True)

class AlertDetail(AlertResponse):
    """Esquema extendido para detalles de alerta"""
    device_name: Optional[str] = None
    device_location: Optional[str] = None
    current_value: Optional[float] = None
    threshold_value: Optional[float] = None

class AlertSummary(BaseModel):
    """Esquema para resumen de alertas"""
    total_alerts: int
    active_alerts: int
    read_alerts: int
    resolved_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int

class AlertFilter(BaseModel):
    """Esquema para filtros de alertas"""
    device_id: Optional[int] = None
    alert_type: Optional[AlertType] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[AlertStatus] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(50, ge=1, le=100)
    offset: int = Field(0, ge=0)

class AlertBulkUpdate(BaseModel):
    """Esquema para actualización masiva de alertas"""
    alert_ids: List[int] = Field(..., min_items=1, max_items=100)
    status: AlertStatus
    action: str = Field(..., description="Acción a realizar: 'mark_read', 'resolve', 'dismiss'")

    @validator('alert_ids')
    def validate_alert_ids(cls, v):
        if not v:
            raise ValueError('Debe especificar al menos un ID de alerta')
        return v

class NotificationPreferences(BaseModel):
    """Esquema para preferencias de notificaciones"""
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    critical_alerts: bool = True
    high_alerts: bool = True
    medium_alerts: bool = True
    low_alerts: bool = False
    daily_summary: bool = True
    weekly_report: bool = True

class AlertRule(BaseModel):
    """Esquema para reglas de alertas"""
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la regla")
    alert_type: AlertType = Field(..., description="Tipo de alerta")
    condition: str = Field(..., description="Condición de la regla (ej: 'humidity < 20')")
    threshold: float = Field(..., description="Valor umbral")
    severity: AlertSeverity = Field(AlertSeverity.MEDIUM, description="Severidad por defecto")
    enabled: bool = True
    device_id: Optional[int] = None  # None para aplicar a todos los dispositivos
    cooldown_minutes: int = Field(30, ge=1, le=1440, description="Tiempo de espera entre alertas (minutos)")

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('El nombre de la regla no puede estar vacío')
        return v.strip()

class AlertRuleResponse(AlertRule):
    """Esquema de respuesta para regla de alerta"""
    id: int
    user_id: int
    created_at: datetime
    last_triggered: Optional[datetime]
    trigger_count: int = 0

    model_config = ConfigDict(from_attributes=True)
