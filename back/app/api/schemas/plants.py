"""
Schemas Pydantic para plantas.
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime


class PlantIdentify(BaseModel):
    """Respuesta de identificación de planta por IA"""
    plant_type: str
    scientific_name: str
    care_level: str
    care_tips: str
    optimal_humidity_min: float
    optimal_humidity_max: float
    optimal_temp_min: float
    optimal_temp_max: float


class PlantCreate(BaseModel):
    """Datos para crear una nueva planta"""
    plant_name: str
    plant_type: Optional[str] = None
    scientific_name: Optional[str] = None
    care_level: Optional[str] = None
    care_tips: Optional[str] = None
    optimal_humidity_min: Optional[float] = None
    optimal_humidity_max: Optional[float] = None
    optimal_temp_min: Optional[float] = None
    optimal_temp_max: Optional[float] = None


class PlantResponse(BaseModel):
    """Respuesta con información de una planta"""
    id: int
    user_id: int
    sensor_id: Optional[int]
    plant_name: str
    plant_type: Optional[str]
    scientific_name: Optional[str]
    care_level: Optional[str]
    care_tips: Optional[str]
    original_photo_url: Optional[str]
    character_image_url: Optional[str]
    character_personality: Optional[str]
    character_mood: str
    health_status: str
    last_watered: Optional[datetime]
    optimal_humidity_min: Optional[float]
    optimal_humidity_max: Optional[float]
    optimal_temp_min: Optional[float]
    optimal_temp_max: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PlantHealth(BaseModel):
    """Estado de salud de una planta"""
    health_status: str
    character_mood: str
    humidity_current: Optional[float]
    temperature_current: Optional[float]
    needs_water: bool
    message: str  # Mensaje del personaje tipo "¡Tengo sed! 💧"


class PlantUpdate(BaseModel):
    """Datos para actualizar una planta"""
    plant_name: Optional[str] = None
    last_watered: Optional[datetime] = None
