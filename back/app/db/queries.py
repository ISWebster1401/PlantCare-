from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ===============================================
# FUNCIONES ASÍNCRONAS PARA USUARIOS
# ===============================================

async def create_user(db, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un nuevo usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_data: Datos del usuario a crear
        
    Returns:
        Dict: Usuario creado
    """
    try:
        # Insertar el usuario usando pgdbtoolkit
        result = await db.insert_records("users", user_data)
        
        # Verificar si el resultado es válido
        if result is not None and len(result) > 0:
            # Obtener el usuario completo recién creado
            user_id = result[0]
            user = await get_user_by_id(db, user_id)
            if user:
                return user
            else:
                raise Exception("Usuario creado pero no se pudo recuperar")
        else:
            raise Exception("No se pudo crear el usuario")
    except Exception as e:
        logger.error(f"Error creando usuario: {str(e)}")
        raise

async def get_user_by_id(db, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un usuario por su ID usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        Dict: Usuario encontrado o None
    """
    try:
        result = await db.fetch_records(
            "users",
            conditions={"id": user_id}
        )
        # Verificar si el DataFrame no está vacío
        if result is not None and not result.empty:
            # Convertir la primera fila a diccionario
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo usuario por ID: {str(e)}")
        return None

async def get_user_by_email(db, email: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un usuario por su email usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        email: Email del usuario
        
    Returns:
        Dict: Usuario encontrado o None
    """
    try:
        result = await db.fetch_records(
            "users",
            conditions={"email": email}
        )
        # Verificar si el DataFrame no está vacío
        if result is not None and not result.empty:
            # Convertir la primera fila a diccionario
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo usuario por email: {str(e)}")
        return None

async def update_user(db, user_id: int, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Actualiza un usuario existente usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario a actualizar
        user_data: Datos a actualizar
        
    Returns:
        Dict: Usuario actualizado o None
    """
    try:
        # Filtrar campos None para no sobrescribir con valores vacíos
        update_data = {k: v for k, v in user_data.items() if v is not None}
        
        if not update_data:
            return await get_user_by_id(db, user_id)
        
        # Actualizar usando pgdbtoolkit
        set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
        values = list(update_data.values()) + [user_id]
        await db.execute_query(
            f"UPDATE users SET {set_clause} WHERE id = %s",
            values
        )
        
        # Obtener el usuario actualizado
        return await get_user_by_id(db, user_id)
    except Exception as e:
        logger.error(f"Error actualizando usuario: {str(e)}")
        return None

async def update_user_last_login(db, user_id: int) -> bool:
    """
    Actualiza el último login de un usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        await db.execute_query(
            "UPDATE users SET last_login = %s WHERE id = %s",
            (datetime.utcnow(), user_id)
        )
        return True
    except Exception as e:
        logger.error(f"Error actualizando último login: {str(e)}")
        return False

async def update_user_password(db, user_id: int, password_hash: str) -> bool:
    """
    Actualiza la contraseña de un usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        password_hash: Hash de la nueva contraseña
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        await db.execute_query(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, user_id)
        )
        return True
    except Exception as e:
        logger.error(f"Error actualizando contraseña: {str(e)}")
        return False

async def deactivate_user(db, user_id: int) -> bool:
    """
    Desactiva un usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        bool: True si se desactivó correctamente
    """
    try:
        await db.execute_query(
            "UPDATE users SET active = false WHERE id = %s",
            (user_id,)
        )
        return True
    except Exception as e:
        logger.error(f"Error desactivando usuario: {str(e)}")
        return False

async def activate_user(db, user_id: int) -> bool:
    """
    Activa un usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        bool: True si se activó correctamente
    """
    try:
        await db.execute_query(
            "UPDATE users SET active = true WHERE id = %s",
            (user_id,)
        )
        return True
    except Exception as e:
        logger.error(f"Error activando usuario: {str(e)}")
        return False

async def delete_user(db, user_id: int) -> bool:
    """
    Elimina un usuario usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        await db.delete_records(
            "users",
            {"id": user_id}
        )
        return True
    except Exception as e:
        logger.error(f"Error eliminando usuario: {str(e)}")
        return False

async def get_all_users(db) -> List[Dict[str, Any]]:
    """
    Obtiene todos los usuarios usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        
    Returns:
        List[Dict]: Lista de usuarios
    """
    try:
        result = await db.fetch_records(
            "users",
            order_by=[("created_at", "DESC")]
        )
        return result if result else []
    except Exception as e:
        logger.error(f"Error obteniendo todos los usuarios: {str(e)}")
        return []

async def get_users_by_region(db, region: str) -> List[Dict[str, Any]]:
    """
    Obtiene usuarios por región usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        region: Región de los usuarios
        
    Returns:
        List[Dict]: Lista de usuarios de la región
    """
    try:
        result = await db.fetch_records(
            "users",
            conditions={
                "region": region,
                "active": True
            },
            order_by=[("created_at", "DESC")]
        )
        return result if result else []
    except Exception as e:
        logger.error(f"Error obteniendo usuarios por región: {str(e)}")
        return []

async def search_users(db, search_term: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Busca usuarios por término de búsqueda usando pgdbtoolkit
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        search_term: Término de búsqueda
        limit: Límite de resultados
        
    Returns:
        List[Dict]: Lista de usuarios que coinciden con la búsqueda
    """
    try:
        # Buscar en nombre, apellido, email y región
        result = await db.search_records(
            "users",
            search_term,
            search_column="first_name,last_name,email,region",
            additional_conditions={"active": True},
            limit=limit
        )
        return result if result else []
    except Exception as e:
        logger.error(f"Error buscando usuarios: {str(e)}")
        return []
