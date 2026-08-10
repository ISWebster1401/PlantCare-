"""
Rutas de gamificación: logros.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pgdbtoolkit import AsyncPgDbToolkit

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..core.achievements import list_achievements

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/achievements", tags=["achievements"])


class AchievementItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    points: int
    requirement_value: int
    progress: int
    """False si el criterio aún no se puede medir (ej: histórico de sensores)."""
    measurable: bool
    earned: bool
    earned_at: Optional[str] = None


class AchievementsResponse(BaseModel):
    total_points: int
    earned_count: int
    total_count: int
    achievements: List[AchievementItem]


@router.get("/", response_model=AchievementsResponse)
async def get_my_achievements(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Logros del usuario con su progreso. Evalúa los criterios antes de
    responder, así que abrir esta pantalla desbloquea lo que ya se cumplió.
    """
    try:
        return AchievementsResponse(**await list_achievements(db, current_user["id"]))
    except Exception as e:
        logger.error(f"Error obteniendo logros: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudieron obtener los logros.",
        )
