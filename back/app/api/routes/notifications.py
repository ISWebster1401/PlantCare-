"""
Rutas para gestión de notificaciones.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
import logging
import pandas as pd

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..schemas.notifications import NotificationResponse
from pgdbtoolkit import AsyncPgDbToolkit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Retorna notificaciones del usuario.
    Si unread_only=True, solo las no leídas.
    """
    try:
        conditions = {"user_id": current_user["id"]}
        if unread_only:
            conditions["is_read"] = False
        
        notifications = await db.fetch_records(
            "notifications",
            conditions=conditions,
            order_by="created_at DESC",
            limit=50  # Limitar a las últimas 50
        )
        
        if notifications is None or notifications.empty:
            return []
        
        # Enriquecer con datos de la planta
        result = []
        for _, row in notifications.iterrows():
            try:
                notif = row.to_dict()
                
                # Inicializar campos opcionales
                notif["plant_name"] = None
                notif["character_image_url"] = None
                
                # Obtener datos de la planta si existe
                plant_id = notif.get("plant_id")
                if plant_id and pd.notna(plant_id):
                    try:
                        plants = await db.fetch_records(
                            "plants",
                            conditions={"id": int(plant_id)}
                        )
                        if plants is not None and not plants.empty:
                            plant = plants.iloc[0].to_dict()
                            notif["plant_name"] = plant.get("plant_name")
                            notif["character_image_url"] = plant.get("character_image_url")
                    except Exception as plant_error:
                        logger.warning(f"Error obteniendo datos de planta {plant_id}: {plant_error}")
                        # Continuar sin datos de la planta
                
                result.append(NotificationResponse(**notif))
            except Exception as row_error:
                logger.warning(f"Error procesando notificación: {row_error}")
                # Continuar con la siguiente notificación
                continue
        
        return result
        
    except Exception as e:
        logger.error(f"Error listando notificaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listando notificaciones: {str(e)}"
        )


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Marca una notificación como leída.
    """
    try:
        # Verificar que la notificación pertenece al usuario
        notifications = await db.fetch_records(
            "notifications",
            conditions={"id": notification_id, "user_id": current_user["id"]}
        )
        
        if notifications is None or notifications.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notificación no encontrada"
            )
        
        # Marcar como leída
        await db.execute_query(
            "UPDATE notifications SET is_read = %s WHERE id = %s",
            (True, notification_id)
        )
        
        return {"message": "Notificación marcada como leída"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marcando notificación como leída: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marcando notificación: {str(e)}"
        )


@router.put("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Marca todas las notificaciones del usuario como leídas.
    """
    try:
        await db.execute_query(
            "UPDATE notifications SET is_read = %s WHERE user_id = %s AND is_read = %s",
            (True, current_user["id"], False)
        )
        
        return {"message": "Todas las notificaciones fueron marcadas como leídas"}
        
    except Exception as e:
        logger.error(f"Error marcando todas las notificaciones: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marcando notificaciones: {str(e)}"
        )
