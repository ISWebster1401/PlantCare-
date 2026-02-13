"""
Schemas Pydantic para notificaciones.
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationResponse(BaseModel):
    """Respuesta con información de una notificación"""
    id: int
    user_id: int
    plant_id: Optional[int]
    notification_type: str
    message: str
    is_read: bool
    sent_via_email: bool
    created_at: datetime
    
    # Datos adicionales de la planta para el frontend
    plant_name: Optional[str] = None
    character_image_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class NotificationMarkRead(BaseModel):
    """Datos para marcar notificación como leída"""
    is_read: bool = True
