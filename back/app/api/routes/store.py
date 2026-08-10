"""
Tienda: canjear puntos de logros por accesorios.

Los puntos disponibles son los ganados en logros menos los ya gastados, así
que la economía cierra sola sin llevar un saldo aparte que se pueda
desincronizar.
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

router = APIRouter(prefix="/store", tags=["store"])


class StoreItem(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    cost_points: int
    category: str
    icon: Optional[str] = None
    owned: bool
    affordable: bool


class StoreResponse(BaseModel):
    earned_points: int
    spent_points: int
    available_points: int
    items: List[StoreItem]


class RedeemResponse(BaseModel):
    message: str
    item: StoreItem
    available_points: int


async def _points_balance(db: AsyncPgDbToolkit, user_id: int) -> tuple:
    """(ganados, gastados, disponibles) para el usuario."""
    earned = (await list_achievements(db, user_id))["total_points"]

    spent_df = await db.execute_query(
        "SELECT COALESCE(SUM(s.cost_points), 0) AS spent "
        "FROM user_items u JOIN store_items s ON s.id = u.item_id "
        "WHERE u.user_id = %s",
        (user_id,),
    )
    spent = 0
    if spent_df is not None and not spent_df.empty:
        try:
            spent = int(spent_df.iloc[0]["spent"] or 0)
        except (TypeError, ValueError):
            spent = 0

    return earned, spent, max(earned - spent, 0)


@router.get("/", response_model=StoreResponse)
async def get_store(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Catálogo de la tienda con el saldo de puntos del usuario."""
    try:
        user_id = current_user["id"]
        earned, spent, available = await _points_balance(db, user_id)

        df = await db.execute_query(
            "SELECT s.id, s.code, s.name, s.description, s.cost_points, "
            "       s.category, s.icon, u.id AS owned_id "
            "FROM store_items s "
            "LEFT JOIN user_items u ON u.item_id = s.id AND u.user_id = %s "
            "ORDER BY s.cost_points ASC",
            (user_id,),
        )

        items: List[StoreItem] = []
        if df is not None and not df.empty:
            for _, row in df.iterrows():
                d = row.to_dict()
                owned_raw = d.get("owned_id")
                owned = owned_raw is not None and str(owned_raw) not in ("nan", "NaT", "None")
                cost = int(d.get("cost_points") or 0)
                items.append(StoreItem(
                    id=int(d["id"]),
                    code=d.get("code"),
                    name=d.get("name"),
                    description=d.get("description"),
                    cost_points=cost,
                    category=d.get("category") or "accesorio",
                    icon=d.get("icon"),
                    owned=owned,
                    affordable=(not owned) and available >= cost,
                ))

        return StoreResponse(
            earned_points=earned, spent_points=spent,
            available_points=available, items=items,
        )
    except Exception as e:
        logger.error(f"Error obteniendo tienda: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo cargar la tienda.",
        )


@router.post("/{item_id}/redeem", response_model=RedeemResponse)
async def redeem_item(
    item_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db),
):
    """Canjea un accesorio con los puntos disponibles."""
    try:
        user_id = current_user["id"]

        item_df = await db.execute_query(
            "SELECT id, code, name, description, cost_points, category, icon "
            "FROM store_items WHERE id = %s",
            (item_id,),
        )
        if item_df is None or item_df.empty:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Ese accesorio no existe.")
        item = item_df.iloc[0].to_dict()
        cost = int(item.get("cost_points") or 0)

        owned_df = await db.execute_query(
            "SELECT id FROM user_items WHERE user_id = %s AND item_id = %s",
            (user_id, item_id),
        )
        if owned_df is not None and not owned_df.empty:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Ya tienes este accesorio.")

        _, _, available = await _points_balance(db, user_id)
        if available < cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Te faltan {cost - available} puntos para este accesorio.",
            )

        await db.execute_query(
            "INSERT INTO user_items (user_id, item_id) VALUES (%s, %s) "
            "ON CONFLICT (user_id, item_id) DO NOTHING",
            (user_id, item_id),
        )

        _, _, available_after = await _points_balance(db, user_id)
        logger.info(f"🛍️ Usuario {user_id} canjeó '{item.get('name')}' por {cost} pts")

        return RedeemResponse(
            message=f"¡Canjeaste {item.get('name')}!",
            item=StoreItem(
                id=int(item["id"]), code=item.get("code"), name=item.get("name"),
                description=item.get("description"), cost_points=cost,
                category=item.get("category") or "accesorio", icon=item.get("icon"),
                owned=True, affordable=False,
            ),
            available_points=available_after,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canjeando accesorio: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo canjear el accesorio.",
        )
