from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class RecommendationType(str, Enum):
    """Tipos de recomendaciones de IA"""
    IRRIGATION = "irrigation"
    FERTILIZATION = "fertilization"
    PRUNING = "pruning"
    PEST_CONTROL = "pest_control"
    HARVEST = "harvest"
    MAINTENANCE = "maintenance"
    OPTIMIZATION = "optimization"
    WEATHER_ADAPTATION = "weather_adaptation"

class RecommendationPriority(str, Enum):
    """Prioridades de recomendaciones"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class RecommendationStatus(str, Enum):
    """Estados de recomendaciones"""
    ACTIVE = "active"
    APPLIED = "applied"
    DISMISSED = "dismissed"
    EXPIRED = "expired"

class AIRecommendationBase(BaseModel):
    """Esquema base para recomendaciones de IA"""
    recommendation_type: RecommendationType = Field(..., description="Tipo de recomendación")
    title: str = Field(..., min_length=1, max_length=200, description="Título de la recomendación")
    description: str = Field(..., min_length=1, description="Descripción detallada")
    action_items: Optional[Dict[str, Any]] = Field(None, description="Elementos de acción específicos")
    priority: RecommendationPriority = Field(RecommendationPriority.MEDIUM, description="Prioridad de la recomendación")
    device_id: int = Field(..., description="ID del dispositivo relacionado")

    @validator('title')
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError('El título de la recomendación no puede estar vacío')
        return v.strip()

    @validator('description')
    def validate_description(cls, v):
        if not v.strip():
            raise ValueError('La descripción de la recomendación no puede estar vacía')
        return v.strip()

class AIRecommendationCreate(AIRecommendationBase):
    """Esquema para crear una nueva recomendación de IA"""
    pass

class AIRecommendationUpdate(BaseModel):
    """Esquema para actualizar recomendación de IA"""
    status: Optional[RecommendationStatus] = None
    applied_at: Optional[datetime] = None
    feedback: Optional[str] = None
    effectiveness_rating: Optional[int] = Field(None, ge=1, le=5, description="Calificación de efectividad (1-5)")

class AIRecommendationResponse(AIRecommendationBase):
    """Esquema de respuesta para recomendación de IA"""
    id: int
    user_id: int
    created_at: datetime
    applied_at: Optional[datetime]
    status: RecommendationStatus = RecommendationStatus.ACTIVE
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Puntuación de confianza de la IA")

    model_config = ConfigDict(from_attributes=True)

class AIRecommendationDetail(AIRecommendationResponse):
    """Esquema extendido para detalles de recomendación"""
    device_name: Optional[str] = None
    device_location: Optional[str] = None
    plant_type: Optional[str] = None
    weather_conditions: Optional[Dict[str, Any]] = None
    historical_context: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None
    effectiveness_rating: Optional[int] = None

class AIAnalysisRequest(BaseModel):
    """Esquema para solicitar análisis de IA"""
    device_id: int = Field(..., description="ID del dispositivo a analizar")
    analysis_type: str = Field(..., description="Tipo de análisis: 'health', 'optimization', 'prediction'")
    time_range: Optional[str] = Field("7d", description="Rango de tiempo: '1d', '7d', '30d', '90d'")
    include_weather: bool = Field(True, description="Incluir datos meteorológicos")
    include_historical: bool = Field(True, description="Incluir contexto histórico")

class AIAnalysisResponse(BaseModel):
    """Esquema de respuesta para análisis de IA"""
    device_id: int
    analysis_type: str
    summary: str
    insights: List[str]
    recommendations: List[AIRecommendationResponse]
    confidence_score: float
    generated_at: datetime
    data_points_analyzed: int
    time_range_used: str

class AIPredictionRequest(BaseModel):
    """Esquema para solicitar predicciones de IA"""
    device_id: int = Field(..., description="ID del dispositivo")
    prediction_type: str = Field(..., description="Tipo de predicción: 'humidity', 'growth', 'harvest', 'maintenance'")
    time_horizon: int = Field(7, ge=1, le=90, description="Horizonte de tiempo en días")
    include_weather_forecast: bool = Field(True, description="Incluir pronóstico meteorológico")

class AIPredictionResponse(BaseModel):
    """Esquema de respuesta para predicciones de IA"""
    device_id: int
    prediction_type: str
    predictions: List[Dict[str, Any]]
    confidence_intervals: List[Dict[str, float]]
    factors_considered: List[str]
    generated_at: datetime
    time_horizon: int

class AIInsight(BaseModel):
    """Esquema para insights de IA"""
    insight_type: str = Field(..., description="Tipo de insight")
    title: str = Field(..., description="Título del insight")
    description: str = Field(..., description="Descripción del insight")
    impact_score: float = Field(..., ge=0, le=1, description="Puntuación de impacto")
    data_evidence: List[str] = Field(..., description="Evidencia de datos")
    recommendations: List[str] = Field(..., description="Recomendaciones relacionadas")

class AIHealthReport(BaseModel):
    """Esquema para reporte de salud de IA"""
    device_id: int
    overall_health_score: float = Field(..., ge=0, le=100, description="Puntuación general de salud")
    health_factors: Dict[str, float] = Field(..., description="Factores de salud individuales")
    trends: List[Dict[str, Any]] = Field(..., description="Tendencias identificadas")
    alerts: List[str] = Field(..., description="Alertas generadas")
    recommendations: List[AIRecommendationResponse] = Field(..., description="Recomendaciones prioritarias")
    generated_at: datetime

class AIOptimizationSuggestion(BaseModel):
    """Esquema para sugerencias de optimización de IA"""
    device_id: int
    optimization_type: str = Field(..., description="Tipo de optimización")
    current_efficiency: float = Field(..., ge=0, le=100, description="Eficiencia actual")
    potential_improvement: float = Field(..., ge=0, le=100, description="Mejora potencial")
    suggested_changes: List[Dict[str, Any]] = Field(..., description="Cambios sugeridos")
    expected_benefits: List[str] = Field(..., description="Beneficios esperados")
    implementation_difficulty: str = Field(..., description="Dificultad de implementación")
    estimated_cost: Optional[float] = Field(None, description="Costo estimado")

class AIFeedback(BaseModel):
    """Esquema para feedback de recomendaciones de IA"""
    recommendation_id: int = Field(..., description="ID de la recomendación")
    applied: bool = Field(..., description="Si la recomendación fue aplicada")
    effectiveness_rating: int = Field(..., ge=1, le=5, description="Calificación de efectividad")
    feedback_text: Optional[str] = Field(None, description="Comentarios adicionales")
    applied_date: Optional[datetime] = Field(None, description="Fecha de aplicación")
    results_observed: Optional[str] = Field(None, description="Resultados observados")
