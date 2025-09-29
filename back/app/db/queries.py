from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
import secrets
import string

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

# ===============================================
# FUNCIONES ASÍNCRONAS PARA DISPOSITIVOS
# ===============================================

def generate_device_code(device_type: str = "sensor") -> str:
    """
    Genera un código único para dispositivo tipo patente
    
    Args:
        device_type: Tipo de dispositivo para generar prefijo
        
    Returns:
        str: Código único tipo ABC-1234
    """
    # Prefijos según tipo de dispositivo
    prefixes = {
        "humidity_sensor": "HS",
        "temperature_sensor": "TS", 
        "light_sensor": "LS",
        "multi_sensor": "MS",
        "irrigation_controller": "IC",
        "sensor": "SN"  # Genérico
    }
    
    prefix = prefixes.get(device_type, "SN")
    # Generar 2 letras adicionales y 4 números
    letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    numbers = ''.join(secrets.choice(string.digits) for _ in range(4))
    
    return f"{prefix}{letters}-{numbers}"

async def create_device_code(db, device_type: str = "humidity_sensor", quantity: int = 1) -> List[Dict[str, Any]]:
    """
    Crea códigos de dispositivos únicos en la base de datos
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_type: Tipo de dispositivo
        quantity: Cantidad de códigos a generar
        
    Returns:
        List[Dict]: Lista de dispositivos creados con códigos
    """
    try:
        devices_created = []
        
        for _ in range(quantity):
            # Generar código único
            attempts = 0
            while attempts < 10:  # Máximo 10 intentos
                device_code = generate_device_code(device_type)
                
                # Verificar que el código no exista
                existing = await db.fetch_records(
                    "devices",
                    conditions={"device_code": device_code}
                )
                
                if existing is None or existing.empty:
                    break
                attempts += 1
            
            if attempts >= 10:
                raise Exception("No se pudo generar un código único después de 10 intentos")
            
            # Insertar dispositivo con código
            device_data = {
                "device_code": device_code,
                "device_type": device_type,
                "active": True,
                "connected": False
            }
            
            result = await db.insert_records("devices", device_data)
            
            if result and len(result) > 0:
                device_id = result[0]
                device = await get_device_by_id(db, device_id)
                if device:
                    devices_created.append(device)
        
        return devices_created
        
    except Exception as e:
        logger.error(f"Error creando códigos de dispositivos: {str(e)}")
        raise

async def get_device_by_code(db, device_code: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene un dispositivo por su código verificador
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_code: Código verificador del dispositivo
        
    Returns:
        Dict: Dispositivo encontrado o None
    """
    try:
        # Limpiar el código de entrada
        clean_code = device_code.upper().replace(' ', '').strip()
        
        # Intentar buscar primero con el código tal como viene
        result = await db.fetch_records(
            "devices",
            conditions={"device_code": clean_code}
        )
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        
        # Si no lo encuentra, probar diferentes variantes
        # Si tiene guiones, probar sin guiones
        if '-' in clean_code:
            code_without_dash = clean_code.replace('-', '')
            result = await db.fetch_records(
                "devices",
                conditions={"device_code": code_without_dash}
            )
            if result is not None and not result.empty:
                return result.iloc[0].to_dict()
        else:
            # Si no tiene guiones, probar agregando guión en la posición típica
            # Formato típico: ABC-1234 (3 letras, guión, 4 números)
            if len(clean_code) >= 7:
                code_with_dash = clean_code[:3] + '-' + clean_code[3:]
                result = await db.fetch_records(
                    "devices",
                    conditions={"device_code": code_with_dash}
                )
                if result is not None and not result.empty:
                    return result.iloc[0].to_dict()
        
        return None
    except Exception as e:
        logger.error(f"Error obteniendo dispositivo por código: {str(e)}")
        return None

async def get_device_by_id(db, device_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un dispositivo por su ID
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_id: ID del dispositivo
        
    Returns:
        Dict: Dispositivo encontrado o None
    """
    try:
        result = await db.fetch_records(
            "devices",
            conditions={"id": device_id}
        )
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo dispositivo por ID: {str(e)}")
        return None

async def connect_device_to_user(db, device_code: str, user_id: int, device_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Conecta un dispositivo a un usuario usando el código verificador
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_code: Código verificador del dispositivo
        user_id: ID del usuario
        device_data: Datos adicionales del dispositivo (nombre, ubicación, etc.)
        
    Returns:
        Dict: Dispositivo conectado o None
    """
    try:
        # Verificar que el dispositivo existe y no está conectado
        device = await get_device_by_code(db, device_code)
        if not device:
            raise Exception("Dispositivo no encontrado")
        
        if device.get("connected"):
            raise Exception("Este dispositivo ya está conectado a otro usuario")
        
        # Actualizar dispositivo con datos del usuario
        update_data = {
            "user_id": user_id,
            "connected": True,
            "connected_at": datetime.utcnow(),
            "name": device_data.get("name"),
            "location": device_data.get("location"),
            "plant_type": device_data.get("plant_type")
        }
        
        # Filtrar campos None
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        # Actualizar usando SQL directo
        set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
        values = list(update_data.values()) + [device["id"]]
        
        await db.execute_query(
            f"UPDATE devices SET {set_clause} WHERE id = %s",
            values
        )
        
        # Obtener dispositivo actualizado
        return await get_device_by_id(db, device["id"])
        
    except Exception as e:
        logger.error(f"Error conectando dispositivo a usuario: {str(e)}")
        raise

async def get_user_devices(db, user_id: int) -> List[Dict[str, Any]]:
    """
    Obtiene todos los dispositivos de un usuario
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        List[Dict]: Lista de dispositivos del usuario
    """
    try:
        result = await db.fetch_records(
            "devices",
            conditions={
                "user_id": user_id,
                "connected": True
            },
            order_by=[("connected_at", "DESC")]
        )
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
    except Exception as e:
        logger.error(f"Error obteniendo dispositivos del usuario: {str(e)}")
        return []

async def disconnect_device(db, device_id: int, user_id: int) -> bool:
    """
    Desconecta un dispositivo de un usuario
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_id: ID del dispositivo
        user_id: ID del usuario
        
    Returns:
        bool: True si se desconectó correctamente
    """
    try:
        # Verificar que el dispositivo pertenece al usuario
        device = await get_device_by_id(db, device_id)
        if not device or device.get("user_id") != user_id:
            return False
        
        # Desconectar dispositivo
        await db.execute_query(
            """UPDATE devices 
               SET user_id = NULL, connected = false, name = NULL, 
                   location = NULL, plant_type = NULL 
               WHERE id = %s""",
            (device_id,)
        )
        
        return True
    except Exception as e:
        logger.error(f"Error desconectando dispositivo: {str(e)}")
        return False

async def update_device_last_seen(db, device_id: int) -> bool:
    """
    Actualiza la última vez que se vió el dispositivo
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_id: ID del dispositivo
        
    Returns:
        bool: True si se actualizó correctamente
    """
    try:
        await db.execute_query(
            "UPDATE devices SET last_seen = %s WHERE id = %s",
            (datetime.utcnow(), device_id)
        )
        return True
    except Exception as e:
        logger.error(f"Error actualizando última conexión del dispositivo: {str(e)}")
        return False

async def get_device_stats(db, user_id: int) -> Dict[str, int]:
    """
    Obtiene estadísticas de dispositivos de un usuario
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        Dict: Estadísticas de dispositivos
    """
    try:
        # Contar dispositivos por estado
        result = await db.execute_query("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN connected = true THEN 1 END) as connected,
                COUNT(CASE WHEN active = true THEN 1 END) as active,
                COUNT(CASE WHEN last_seen < NOW() - INTERVAL '1 hour' OR last_seen IS NULL THEN 1 END) as offline
            FROM devices 
            WHERE user_id = %s
        """, (user_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        
        return {"total": 0, "connected": 0, "active": 0, "offline": 0}
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de dispositivos: {str(e)}")
        return {"total": 0, "connected": 0, "active": 0, "offline": 0}
