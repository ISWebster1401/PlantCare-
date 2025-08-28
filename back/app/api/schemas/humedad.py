from pydantic import BaseModel, Field
from datetime import datetime

class HumedadData(BaseModel):
    humedad: float = Field(..., description="Valor de humedad del suelo")

class DatoHumedad(BaseModel):
    id: int
    valor: float
    fecha: str

class MensajeRespuesta(BaseModel):
    mensaje: str 