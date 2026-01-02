from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from typing import Optional
from enum import Enum
from datetime import datetime

class InquiryType(str, Enum):
    """Tipos de consulta disponibles"""
    GENERAL = "general"
    TECHNICAL_SUPPORT = "technical_support"
    SALES = "sales"
    PARTNERSHIP = "partnership"
    BILLING = "billing"
    FEEDBACK = "feedback"


class ContactForm(BaseModel):
    """Esquema para formulario de contacto general"""
    name: str = Field(..., min_length=2, max_length=100, description="Nombre completo")
    email: EmailStr = Field(..., description="Email de contacto")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    company: Optional[str] = Field(None, max_length=200, description="Empresa u organización")
    inquiry_type: InquiryType = Field(InquiryType.GENERAL, description="Tipo de consulta")
    subject: str = Field(..., min_length=5, max_length=200, description="Asunto del mensaje")
    message: str = Field(..., min_length=10, max_length=2000, description="Mensaje detallado")
    
    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Remover espacios y caracteres especiales para validación
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 7 or len(cleaned) > 15:
                raise ValueError('El número de teléfono debe tener entre 7 y 15 dígitos')
        return v
    
    @field_validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()
    
    @field_validator('subject', 'message')
    def validate_text_fields(cls, v):
        if not v.strip():
            raise ValueError('Este campo no puede estar vacío')
        return v.strip()

class ContactResponse(BaseModel):
    """Esquema de respuesta para formularios de contacto"""
    success: bool
    message: str
    reference_id: Optional[str] = None
    estimated_response_time: str = "24 horas"

class SupportTicket(BaseModel):
    """Esquema para tickets de soporte técnico"""
    title: str = Field(..., min_length=5, max_length=200, description="Título del problema")
    description: str = Field(..., min_length=20, max_length=2000, description="Descripción detallada")
    priority: str = Field("medium", description="Prioridad: low, medium, high, urgent")
    category: str = Field("technical", description="Categoría del problema")
    device_id: Optional[int] = Field(None, description="ID del dispositivo relacionado")
    error_message: Optional[str] = Field(None, max_length=500, description="Mensaje de error específico")
    steps_to_reproduce: Optional[str] = Field(None, max_length=1000, description="Pasos para reproducir el problema")
    
    @field_validator('priority')
    def validate_priority(cls, v):
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        if v.lower() not in valid_priorities:
            raise ValueError(f'Prioridad debe ser una de: {", ".join(valid_priorities)}')
        return v.lower()

class FAQItem(BaseModel):
    """Esquema para elementos de FAQ"""
    id: int
    question: str
    answer: str
    category: str
    helpful_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

class HelpCategory(BaseModel):
    """Esquema para categorías de ayuda"""
    id: int
    name: str
    description: str
    icon: Optional[str] = None
    article_count: int = 0
    order_index: int = 0

class HelpArticle(BaseModel):
    """Esquema para artículos de ayuda"""
    id: int
    title: str
    content: str
    category_id: int
    category_name: str
    tags: list[str] = []
    views: int = 0
    helpful_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    estimated_read_time: int = 5  # minutos
