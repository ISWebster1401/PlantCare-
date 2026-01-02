"""
Schemas Pydantic para plantas.
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
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


class PlantModelResponse(BaseModel):
    """Respuesta con información de un modelo 3D"""
    id: int
    plant_type: str
    name: str
    model_3d_url: str
    default_render_url: Optional[str] = None
    is_default: bool
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class PlantModelAssignmentResponse(BaseModel):
    """Respuesta con información de asignación de modelo a planta"""
    id: int
    plant_id: int
    model_id: int
    custom_render_url: Optional[str] = None
    model: Optional[PlantModelResponse] = None  # Info del modelo asignado
    
    class Config:
        from_attributes = True


class PlantModelUploadRequest(BaseModel):
    """Esquema para subir un modelo 3D (usado en Form data, no como JSON)"""
    plant_type: Optional[str] = None  # Tipo de planta (ej: "Cactus", "Monstera")
    name: Optional[str] = None  # Nombre del modelo
    is_default: Optional[bool] = False  # Si es modelo predeterminado para ese tipo


class PlantModelAssignRequest(BaseModel):
    """Esquema para asignar un modelo 3D a una planta"""
    model_id: int  # ID del modelo a asignar


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
    # Campos de modelo 3D
    assigned_model_id: Optional[int] = None
    model_3d_url: Optional[str] = None  # URL del modelo 3D asignado
    
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
