"""
Schemas Pydantic para conversaciones y mensajes de IA.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class AIMessageCreate(BaseModel):
    """Schema para crear un mensaje en una conversación"""
    content: str = Field(..., min_length=1, max_length=10000)
    role: str = Field(..., pattern="^(user|assistant|system)$")
    metadata: Optional[Dict[str, Any]] = None


class AIMessageResponse(BaseModel):
    """Respuesta con información de un mensaje"""
    id: int
    conversation_id: int
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AIConversationCreate(BaseModel):
    """Schema para crear una nueva conversación"""
    title: Optional[str] = Field(None, max_length=255)


class AIConversationResponse(BaseModel):
    """Respuesta con información de una conversación"""
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0  # Número de mensajes en la conversación
    
    class Config:
        from_attributes = True


class AIConversationDetailResponse(BaseModel):
    """Respuesta con conversación completa incluyendo mensajes"""
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[AIMessageResponse] = []
    
    class Config:
        from_attributes = True


class AIChatRequest(BaseModel):
    """Request para enviar un mensaje en una conversación"""
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[int] = None  # Si es None, crea nueva conversación
    device_id: Optional[int] = None  # Opcional: para contexto de dispositivo


class AIChatResponse(BaseModel):
    """Respuesta del chat de IA"""
    conversation_id: int
    message_id: int
    response: str
    tokens_used: Dict[str, int]
    timestamp: str
