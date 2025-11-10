from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.api.core.auth_user import get_current_active_user
from app.api.core.database import get_db
from app.api.core.log import logger
from app.api.routes.contact import process_quote_submission
from app.api.schemas.contact import QuoteRequest, ContactResponse
from pgdbtoolkit import AsyncPgDbToolkit
from typing import List, Dict, Any
import pandas as pd

# Crear router para cotizaciones
router = APIRouter(
    prefix="/quotes",
    tags=["Cotizaciones"],
    responses={
        401: {"description": "No autorizado"},
        404: {"description": "Cotización no encontrada"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.get("/my-quotes")
async def get_my_quotes(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Obtiene todas las cotizaciones del usuario actual
    
    Args:
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        Dict con lista de cotizaciones y estadísticas
    """
    try:
        user_id = current_user["id"]
        
        # Obtener todas las cotizaciones del usuario usando fetch_records
        quotes_df = await db.fetch_records(
            "quotes",
            conditions={"user_id": user_id}
        )
        
        # Convertir DataFrame a lista de diccionarios y filtrar deleted_at IS NULL
        quotes = []
        if quotes_df is not None and not quotes_df.empty:
            all_quotes = quotes_df.to_dict('records')
            # Filtrar solo las que no están eliminadas (deleted_at es None o NaN)
            for q in all_quotes:
                deleted_at = q.get('deleted_at')
                # Verificar si deleted_at es None o NaN
                if deleted_at is None:
                    quotes.append(q)
                else:
                    # Verificar si es NaN (pandas)
                    try:
                        if pd.isna(deleted_at):
                            quotes.append(q)
                    except (TypeError, ValueError, ImportError):
                        # Si no se puede verificar con pandas, asumir que no es None
                        pass
        
        # Ordenar por created_at DESC manualmente
        def get_sort_key(q):
            created_at = q.get('created_at')
            if created_at is None:
                return ''
            # Si es un objeto datetime o similar, convertir a string para comparar
            if hasattr(created_at, 'isoformat'):
                return created_at.isoformat()
            return str(created_at)
        
        quotes.sort(key=get_sort_key, reverse=True)
        
        # Calcular estadísticas
        total = len(quotes)
        pending = len([q for q in quotes if q.get('status') == 'pending'])
        quoted = len([q for q in quotes if q.get('status') == 'quoted'])
        accepted = len([q for q in quotes if q.get('status') == 'accepted'])
        
        return {
            "quotes": quotes,
            "total": total,
            "pending": pending,
            "quoted": quoted,
            "accepted": accepted
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error obteniendo cotizaciones del usuario {current_user.get('email', 'unknown')}: {str(e)}")
        logger.error(f"Traceback completo: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener cotizaciones: {str(e)}"
        )


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    quote_request: QuoteRequest,
    request: Request,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """Crea una nueva cotización y envía confirmación por correo."""
    return await process_quote_submission(quote_request, request, db)

