"""
Rutas de gamificación: rachas de cuidado.
"""
import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pgdbtoolkit import AsyncPgDbToolkit

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..core.streaks import get_streak

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/streaks", tags=["streaks"])


class StreakResponse(BaseModel):
    """Estado de la racha de cuidado del usuario."""
    current_streak: int
    best_streak: int
    last_care_date: Optional[date] = None
    total_care_days: int
    cared_today: bool
    at_risk: bool


@router.get("/me", response_model=StreakResponse)
async def get_my_streak(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Racha de cuidado del usuario: días de calendario consecutivos cuidando
    alguna planta. `at_risk` indica que cuidó ayer pero aún no hoy.
    """
    try:
        return StreakResponse(**await get_streak(db, current_user["id"]))
    except Exception as e:
        logger.error(f"Error obteniendo racha: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo obtener la racha.",
        )
