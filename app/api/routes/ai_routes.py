from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.ai_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])

class PlantQuery(BaseModel):
    query: str

class AIResponse(BaseModel):
    recommendation: str
    usage: dict

@router.post("/recommendation", response_model=AIResponse)
async def get_plant_recommendation(query: PlantQuery):
    try:
        response = await ai_service.get_plant_recommendation(query.query)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 