"""
Rutas de la fase social: amigos y ranking de rachas.
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from pgdbtoolkit import AsyncPgDbToolkit

from ..core.auth_user import get_current_active_user
from ..core.database import get_db
from ..core import friends as friends_core

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/friends", tags=["friends"])


class FriendResponse(BaseModel):
    friendship_id: int
    user_id: int
    full_name: str
    email: Optional[str] = None
    current_streak: int
    best_streak: int
    plants_count: int


class RankingEntry(FriendResponse):
    position: int
    is_me: bool


class FriendRequestCreate(BaseModel):
    email: EmailStr


@router.get("/", response_model=List[FriendResponse])
async def get_friends(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Amigos aceptados, con su racha actual."""
    try:
        return await friends_core.list_friends(db, current_user["id"])
    except Exception as e:
        logger.error(f"Error listando amigos: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudieron cargar tus amigos.")


@router.get("/requests", response_model=List[FriendResponse])
async def get_requests(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Invitaciones recibidas que aún no respondes."""
    try:
        return await friends_core.list_pending_requests(db, current_user["id"])
    except Exception as e:
        logger.error(f"Error listando invitaciones: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudieron cargar las invitaciones.")


@router.get("/sent", response_model=List[FriendResponse])
async def get_sent(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Invitaciones que enviaste y siguen sin respuesta."""
    try:
        return await friends_core.list_sent_requests(db, current_user["id"])
    except Exception as e:
        logger.error(f"Error listando enviadas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudieron cargar las invitaciones enviadas.")


@router.get("/ranking", response_model=List[RankingEntry])
async def get_ranking(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Tú y tus amigos ordenados por racha."""
    try:
        return await friends_core.get_ranking(db, current_user["id"])
    except Exception as e:
        logger.error(f"Error armando ranking: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo cargar el ranking.")


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def send_request(
    body: FriendRequestCreate,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Invita a alguien por su correo."""
    try:
        user_id = current_user["id"]
        otro = await friends_core.find_user_by_email(db, body.email)

        # Mismo mensaje si no existe o si ya son amigos seria confuso, pero
        # tampoco conviene confirmar quien tiene cuenta: se responde igual que
        # si no existiera.
        if not otro:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No encontramos a nadie con ese correo.")

        otro_id = int(otro["id"])
        if otro_id == user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="No puedes agregarte a ti mismo.")

        existente = await friends_core.get_friendship(db, user_id, otro_id)
        if existente:
            if existente["status"] == friends_core.ACCEPTED:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail="Ya son amigos.")
            # Si el otro ya te habia invitado, aceptar es mas util que crear
            # una segunda invitacion cruzada que nadie sabria responder.
            if int(existente["addressee_id"]) == user_id:
                await db.execute_query(
                    "UPDATE friendships SET status = %s, responded_at = NOW() WHERE id = %s",
                    (friends_core.ACCEPTED, int(existente["id"])),
                )
                return {"message": f"¡Ahora eres amigo de {otro.get('full_name')}!",
                        "status": friends_core.ACCEPTED}
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Ya enviaste una invitación a esa persona.")

        await db.execute_query(
            "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (%s, %s, %s)",
            (user_id, otro_id, friends_core.PENDING),
        )
        logger.info(f"🤝 Usuario {user_id} invitó a {otro_id}")
        return {"message": f"Invitación enviada a {otro.get('full_name')}.",
                "status": friends_core.PENDING}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enviando invitación: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo enviar la invitación.")


@router.post("/{friendship_id}/accept")
async def accept_request(
    friendship_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Acepta una invitación. Solo quien la recibió puede aceptarla."""
    try:
        df = await db.execute_query(
            "SELECT id FROM friendships WHERE id = %s AND addressee_id = %s AND status = %s",
            (friendship_id, current_user["id"], friends_core.PENDING),
        )
        if df is None or df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Esa invitación ya no está disponible.")

        await db.execute_query(
            "UPDATE friendships SET status = %s, responded_at = NOW() WHERE id = %s",
            (friends_core.ACCEPTED, friendship_id),
        )
        return {"message": "¡Nuevo amigo agregado!"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error aceptando invitación: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo aceptar la invitación.")


@router.delete("/{friendship_id}")
async def remove_friendship(
    friendship_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """
    Rechaza una invitación o elimina una amistad.

    Sirve para los dos casos porque en ambos el resultado es el mismo: la fila
    deja de existir. Cualquiera de los dos lados puede hacerlo.
    """
    try:
        user_id = current_user["id"]
        df = await db.execute_query(
            "SELECT id FROM friendships WHERE id = %s AND (requester_id = %s OR addressee_id = %s)",
            (friendship_id, user_id, user_id),
        )
        if df is None or df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No encontramos esa amistad.")

        await db.execute_query("DELETE FROM friendships WHERE id = %s", (friendship_id,))
        return {"message": "Listo."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando amistad: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="No se pudo completar la acción.")
