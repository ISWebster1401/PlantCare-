from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class HumedadData(BaseModel):
    humedad: float = Field(..., description="Valor de humedad del suelo")

class DatoHumedad(BaseModel):
    id: int
    device_id: int
    valor: float
    fecha: datetime

    class Config:
        from_attributes = True

class MensajeRespuesta(BaseModel):
    message: str
    data: Optional[dict] = None