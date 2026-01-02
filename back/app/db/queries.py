from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import secrets
import string
from dateutil import parser as date_parser

# Intentar usar el logger de la app, sino usar el estándar
try:
    from app.api.core.log import logger
except ImportError:
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)

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
        logger.info(f"🆕 Creando usuario con email: {user_data.get('email', 'N/A')}")
        # Insertar el usuario usando pgdbtoolkit
        result = await db.insert_records("users", user_data)
        
        logger.info(f"📊 Resultado de insert_records: {result}")
        
        # Recuperar el usuario por email ya que insert_records no devuelve el ID de forma confiable
        user = await get_user_by_email(db, user_data.get('email'))
        if user:
            logger.info(f"✅ Usuario creado y recuperado: ID={user.get('id')}, Email={user.get('email')}")
            return user
        else:
            raise Exception("Usuario creado pero no se pudo recuperar por email")
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

# ===============================================
# VERIFICACIÓN POR CÓDIGO (OTP)
# ===============================================

async def create_email_verification_code(db, user_id: int, code: Optional[str] = None, hours_valid: int = 24) -> Dict[str, Any]:
    """
    Crea o reemplaza un código de verificación de 4 dígitos para un usuario.
    Reutiliza la tabla email_verification_tokens guardando el código en el campo token.
    Invalida códigos anteriores (no usados) del mismo usuario.
    """
    try:
        # Generar código de 4 dígitos si no se provee
        if not code:
            code = ''.join(secrets.choice('0123456789') for _ in range(4))

        # Marcar como usados los códigos previos sin usar
        try:
            await db.execute_raw_sql(
                "UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = %s AND used_at IS NULL",
                (user_id,)
            )
        except Exception:
            # Silencioso: puede no existir la tabla aún
            pass

        # Insertar nuevo código
        expires_at = datetime.utcnow() + timedelta(hours=hours_valid)
        await db.execute_raw_sql(
            """
            INSERT INTO email_verification_tokens (user_id, token, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, code, expires_at)
        )

        return {"user_id": user_id, "token": code, "expires_at": expires_at}
    except Exception as e:
        logger.error(f"Error creando código de verificación: {str(e)}")
        raise

async def get_active_verification_code(db, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene el código activo (no usado, no vencido) del usuario.
    """
    try:
        df = await db.execute_query(
            """
            SELECT * FROM email_verification_tokens
            WHERE user_id = %s AND used_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id,)
        )
        if df is not None and not df.empty:
            return df.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo código activo: {str(e)}")
        return None

async def verify_email_with_code(db, email: str, code: str) -> bool:
    """
    Verifica el email del usuario comparando el código (4 dígitos).
    Marca el token como usado y al usuario como verificado.
    """
    try:
        user = await get_user_by_email(db, email)
        if not user:
            logger.warning(f"Usuario no encontrado para email: {email}")
            return False

        # Buscar token/código activo usando fetch_records
        tokens = await db.fetch_records(
            "email_verification_tokens",
            conditions={"user_id": user["id"], "token": code, "used_at": None},
            order_by="created_at DESC",
            limit=1
        )
        
        if tokens is None or tokens.empty:
            logger.warning(f"No se encontró token activo para usuario {user['id']} con código {code}")
            return False

        token_row = tokens.iloc[0].to_dict()
        
        # Verificar expiración
        if token_row.get("expires_at"):
            expires_at = token_row["expires_at"]
            # Convertir a datetime si es necesario
            if isinstance(expires_at, str):
                try:
                    expires_at = date_parser.parse(expires_at)
                except Exception as e:
                    logger.error(f"Error parseando fecha de expiración: {e}")
                    return False
            # Si es un objeto datetime de pandas, convertir a datetime de Python
            if hasattr(expires_at, 'to_pydatetime'):
                expires_at = expires_at.to_pydatetime()
            
            now = datetime.utcnow()
            if expires_at < now:
                logger.warning(f"Token expirado. Expira: {expires_at}, Ahora: {now}")
                return False

        # Marcar usuario como verificado y token como usado usando execute_query
        await db.execute_query(
            "UPDATE users SET is_verified = %s WHERE id = %s",
            (True, user["id"])
        )
        await db.execute_query(
            "UPDATE email_verification_tokens SET used_at = %s WHERE id = %s",
            (datetime.utcnow(), token_row["id"])
        )
        logger.info(f"Email verificado exitosamente para usuario {user['id']} ({email})")
        return True
    except Exception as e:
        logger.error(f"Error verificando email con código: {str(e)}", exc_info=True)
        return False

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
    Nota: La columna last_login puede no existir en todas las versiones de la BD
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        bool: True si se actualizó correctamente, False si la columna no existe
    """
    try:
        await db.execute_query(
            "UPDATE users SET last_login = %s WHERE id = %s",
            (datetime.utcnow(), user_id)
        )
        return True
    except Exception as e:
        # Si la columna no existe, simplemente retornar False sin loggear error
        error_msg = str(e).lower()
        if "last_login" in error_msg and "does not exist" in error_msg:
            logger.debug(f"Columna last_login no existe, omitiendo actualización para usuario {user_id}")
            return False
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
            "UPDATE users SET is_active = false WHERE id = %s",
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
            "UPDATE users SET is_active = true WHERE id = %s",
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
                "is_active": True
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
            additional_conditions={"is_active": True},
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
    Genera un código único para dispositivo tipo patente ABC-1234
    
    Args:
        device_type: Tipo de dispositivo para generar prefijo
        
    Returns:
        str: Código único tipo ABC-1234 (3 letras + 4 dígitos)
    """
    # Generar 3 letras aleatorias y 4 números
    letters = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(3))
    numbers = ''.join(secrets.choice(string.digits) for _ in range(4))
    
    return f"{letters}-{numbers}"

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
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
                COUNT(CASE WHEN last_connection < NOW() - INTERVAL '1 hour' OR last_connection IS NULL THEN 1 END) as offline
            FROM sensors 
            WHERE user_id = %s
        """, (user_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        
        return {"total": 0, "connected": 0, "active": 0, "offline": 0}
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de dispositivos: {str(e)}")
        return {"total": 0, "connected": 0, "active": 0, "offline": 0}

# ===============================================
# FUNCIONES ASÍNCRONAS PARA ADMINISTRACIÓN
# ===============================================

async def get_all_users_admin(db, filters: dict = None) -> List[Dict[str, Any]]:
    """
    Obtiene todos los usuarios para el panel de administración
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        filters: Filtros opcionales (role_id, active, region, search, page, limit)
        
    Returns:
        List[Dict]: Lista de usuarios con información completa
    """
    try:
        # Query simplificada sin roles por ahora (hasta que la tabla roles esté lista)
        base_query = """
            SELECT u.*, 
                   CASE 
                       WHEN u.role_id = 2 THEN 'admin'
                       ELSE 'user'
                   END as role_name,
                   COALESCE(device_counts.device_count, 0) as device_count
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as device_count
                FROM sensors 
                WHERE status = 'active'
                GROUP BY user_id
            ) device_counts ON u.id = device_counts.user_id
        """
        
        conditions = []
        params = []
        
        if filters:
            if filters.get("role_id"):
                conditions.append("u.role_id = %s")
                params.append(filters["role_id"])
            
            if filters.get("active") is not None:
                conditions.append("u.is_active = %s")
                params.append(filters["active"])
            
            if filters.get("region"):
                conditions.append("u.region ILIKE %s")
                params.append(f"%{filters['region']}%")
            
            if filters.get("search"):
                conditions.append("""
                    (u.first_name ILIKE %s OR u.last_name ILIKE %s 
                     OR u.email ILIKE %s OR u.vineyard_name ILIKE %s)
                """)
                search_term = f"%{filters['search']}%"
                params.extend([search_term, search_term, search_term, search_term])
        
        # Agregar condiciones WHERE si existen
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        # Agregar ORDER BY
        base_query += " ORDER BY u.created_at DESC"
        
        # Agregar paginación si se especifica
        if filters and filters.get("page") and filters.get("limit"):
            offset = (filters["page"] - 1) * filters["limit"]
            base_query += f" LIMIT {filters['limit']} OFFSET {offset}"
        
        result = await db.execute_query(base_query, params)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo usuarios para admin: {str(e)}")
        return []

async def get_user_by_id_admin(db, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un usuario específico para administración
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        Dict: Usuario con información completa o None
    """
    try:
        result = await db.execute_query("""
            SELECT u.*, 
                   CASE 
                       WHEN u.role_id = 2 THEN 'admin'
                       ELSE 'user'
                   END as role_name,
                   COALESCE(device_counts.device_count, 0) as device_count
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) as device_count
                FROM sensors 
                WHERE status = 'active' AND user_id = %s
                GROUP BY user_id
            ) device_counts ON u.id = device_counts.user_id
            WHERE u.id = %s
        """, (user_id, user_id))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
        
    except Exception as e:
        logger.error(f"Error obteniendo usuario por ID para admin: {str(e)}")
        return None

async def create_user_admin(db, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Crea un nuevo usuario desde el panel de administración
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_data: Datos del usuario a crear
        
    Returns:
        Dict: Usuario creado
    """
    try:
        result = await db.insert_records("users", user_data)
        
        if result is not None and len(result) > 0:
            user_id = result[0]
            return await get_user_by_id_admin(db, user_id)
        else:
            raise Exception("No se pudo crear el usuario")
            
    except Exception as e:
        logger.error(f"Error creando usuario desde admin: {str(e)}")
        raise

async def update_user_admin(db, user_id: int, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Actualiza un usuario desde el panel de administración
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario a actualizar
        user_data: Datos a actualizar
        
    Returns:
        Dict: Usuario actualizado o None
    """
    try:
        # Filtrar campos None
        update_data = {k: v for k, v in user_data.items() if v is not None}
        
        if not update_data:
            return await get_user_by_id_admin(db, user_id)
        
        # Actualizar usando SQL directo
        set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
        values = list(update_data.values()) + [user_id]
        
        await db.execute_query(
            f"UPDATE users SET {set_clause} WHERE id = %s",
            values
        )
        
        return await get_user_by_id_admin(db, user_id)
        
    except Exception as e:
        logger.error(f"Error actualizando usuario desde admin: {str(e)}")
        return None

async def delete_user_admin(db, user_id: int) -> bool:
    """
    Elimina un usuario completamente (solo para admin)
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario a eliminar
        
    Returns:
        bool: True si se eliminó correctamente
    """
    try:
        await db.delete_records("users", {"id": user_id})
        return True
        
    except Exception as e:
        logger.error(f"Error eliminando usuario desde admin: {str(e)}")
        return False

# ===============================================
# VERIFICACIÓN DE EMAIL (LINK Y CÓDIGO)
# ===============================================

def _generate_verification_token() -> str:
    # 43 chars url-safe ~256 bits
    return secrets.token_urlsafe(43)

async def create_email_verification_token(db, user_id: int, hours_valid: int = 24) -> Dict[str, Any]:
    """
    Crea un token de verificación de email para un usuario.
    Reemplaza tokens previos no usados del mismo usuario.
    """
    try:
        # Invalidar tokens previos no usados
        await db.execute_query(
            """
            DELETE FROM email_verification_tokens
            WHERE user_id = %s AND used_at IS NULL
            """,
            (user_id,)
        )

        token = _generate_verification_token()
        expires_at = datetime.utcnow() + timedelta(hours=hours_valid)
        result = await db.insert_records("email_verification_tokens", {
            "user_id": user_id,
            "token": token,
            "expires_at": expires_at
        })
        return {"token": token, "expires_at": expires_at}
    except Exception as e:
        logger.error(f"Error creando token de verificación: {str(e)}")
        raise

async def get_verification_token(db, token: str) -> Optional[Dict[str, Any]]:
    try:
        result = await db.fetch_records(
            "email_verification_tokens",
            conditions={"token": token}
        )
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo token de verificación: {str(e)}")
        return None

async def mark_email_verified(db, token_row: Dict[str, Any]) -> bool:
    """
    Marca el token como usado y al usuario como verificado si está vigente.
    """
    try:
        if token_row.get("used_at") is not None:
            return False
        if token_row.get("expires_at") and token_row["expires_at"] < datetime.utcnow():
            return False

        user_id = token_row["user_id"]
        # Marcar usuario verificado usando execute_query
        await db.execute_query(
            "UPDATE users SET is_verified = %s WHERE id = %s",
            (True, user_id)
        )
        # Marcar token usado
        await db.execute_query(
            "UPDATE email_verification_tokens SET used_at = %s WHERE id = %s",
            (datetime.utcnow(), token_row["id"])
        )
        return True
    except Exception as e:
        logger.error(f"Error marcando email verificado: {str(e)}")
        return False

# === NUEVO: Verificación por código de 4 dígitos ===

def _generate_4_digit_code() -> str:
    """Genera un código de 4 dígitos (como string con ceros a la izquierda)."""
    # Usamos secrets para aleatoriedad criptográfica
    number = secrets.randbelow(10000)
    return f"{number:04d}"

async def create_email_verification_code(db, user_id: int, minutes_valid: int = 15) -> Dict[str, Any]:
    """
    Crea un código de 4 dígitos para verificación de email.
    Reutiliza la tabla email_verification_tokens guardando el código en la columna token.
    Invalida códigos/tokens previos no usados para ese usuario.
    """
    try:
        # Invalidar tokens/códigos previos no usados usando execute_query
        await db.execute_query(
            "UPDATE email_verification_tokens SET used_at = %s WHERE user_id = %s AND used_at IS NULL",
            (datetime.utcnow(), user_id)
        )

        code = _generate_4_digit_code()
        expires_at = datetime.utcnow() + timedelta(minutes=minutes_valid)
        await db.execute_query(
            "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user_id, code, expires_at)
        )
        return {"code": code, "expires_at": expires_at}
    except Exception as e:
        logger.error(f"Error creando código de verificación: {str(e)}")
        raise

async def create_email_change_request(db, user_id: int, new_email: str, minutes_valid: int = 15) -> Dict[str, Any]:
    """
    Crea un código de verificación para cambio de email.
    Almacena el nuevo email pendiente hasta que se verifique el código.
    """
    try:
        # Invalidar solicitudes previas no usadas para este usuario
        await db.execute_query(
            "UPDATE email_change_requests SET used_at = %s WHERE user_id = %s AND used_at IS NULL",
            (datetime.utcnow(), user_id)
        )

        code = _generate_4_digit_code()
        expires_at = datetime.utcnow() + timedelta(minutes=minutes_valid)
        await db.execute_query(
            "INSERT INTO email_change_requests (user_id, new_email, token, expires_at) VALUES (%s, %s, %s, %s)",
            (user_id, new_email, code, expires_at)
        )
        return {"code": code, "expires_at": expires_at, "new_email": new_email}
    except Exception as e:
        logger.error(f"Error creando solicitud de cambio de email: {str(e)}")
        raise

async def confirm_email_change(db, user_id: int, new_email: str, code: str) -> bool:
    """
    Confirma el cambio de email verificando el código y actualizando el email del usuario.
    """
    try:
        logger.info(f"🔍 Confirmando cambio de email para user_id={user_id}, new_email={new_email}")
        
        # Buscar solicitud activa
        requests_df = await db.execute_query(
            """
            SELECT * FROM email_change_requests
            WHERE user_id = %s AND new_email = %s AND token = %s AND used_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user_id, new_email, code)
        )

        if requests_df is None or requests_df.empty:
            logger.warning(f"No se encontró solicitud activa para user_id={user_id}, email={new_email}, code={code}")
            return False

        request_row = requests_df.iloc[0].to_dict()
        
        # Verificar expiración
        if request_row.get("expires_at"):
            expires_at = request_row["expires_at"]
            if isinstance(expires_at, str):
                try:
                    expires_at = date_parser.parse(expires_at)
                except Exception as e:
                    logger.error(f"Error parseando fecha de expiración: {e}")
                    return False
            if hasattr(expires_at, 'to_pydatetime'):
                expires_at = expires_at.to_pydatetime()
            
            now = datetime.utcnow()
            if expires_at < now:
                logger.warning(f"Solicitud expirada. Expira: {expires_at}, Ahora: {now}")
                return False

        # Verificar que el nuevo email no esté en uso
        existing_user = await get_user_by_email(db, new_email)
        if existing_user and existing_user["id"] != user_id:
            logger.warning(f"El email {new_email} ya está en uso por otro usuario")
            return False

        # Actualizar el email del usuario
        logger.info(f"🔄 Actualizando email del usuario {user_id} a {new_email}")
        await db.execute_query(
            "UPDATE users SET email = %s, is_verified = %s WHERE id = %s",
            (new_email, True, user_id)
        )
        
        # Marcar solicitud como usada
        logger.info(f"🔄 Marcando solicitud {request_row['id']} como usada")
        await db.execute_query(
            "UPDATE email_change_requests SET used_at = %s WHERE id = %s",
            (datetime.utcnow(), request_row["id"])
        )
        
        logger.info(f"✅ Email cambiado exitosamente para usuario {user_id} a {new_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Error confirmando cambio de email: {str(e)}", exc_info=True)
        return False

async def verify_email_with_code(db, email: str, code: str) -> bool:
    """
    Verifica el email buscando por email del usuario y el código (token) activo.
    """
    try:
        logger.info(f"🔍 Iniciando verificación para email: {email}, código: {code}")
        user = await get_user_by_email(db, email)
        if not user:
            logger.warning(f"Usuario no encontrado para email: {email}")
            return False

        logger.info(f"✅ Usuario encontrado: ID={user['id']}")
        
        # Buscar token/código activo usando SQL directo (más confiable)
        logger.info(f"🔍 Buscando token con user_id={user['id']}, token={code}")
        tokens_df = await db.execute_query(
            """
            SELECT * FROM email_verification_tokens
            WHERE user_id = %s AND token = %s AND used_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (user["id"], code)
        )

        if tokens_df is None or tokens_df.empty:
            logger.warning(f"No se encontró token activo para usuario {user['id']} con código {code}")
            return False

        logger.info(f"✅ Token encontrado")
        token_row = tokens_df.iloc[0].to_dict()
        logger.info(f"📋 Token row: {token_row}")
        
        # Verificar expiración
        if token_row.get("expires_at"):
            expires_at = token_row["expires_at"]
            # Convertir a datetime si es necesario
            if isinstance(expires_at, str):
                try:
                    expires_at = date_parser.parse(expires_at)
                except Exception as e:
                    logger.error(f"Error parseando fecha de expiración: {e}")
                    return False
            # Si es un objeto datetime de pandas, convertir a datetime de Python
            if hasattr(expires_at, 'to_pydatetime'):
                expires_at = expires_at.to_pydatetime()
            
            now = datetime.utcnow()
            if expires_at < now:
                logger.warning(f"Token expirado. Expira: {expires_at}, Ahora: {now}")
                return False

        # Marcar verificado usando execute_query (AsyncPgDbToolkit no tiene update_records)
        logger.info(f"🔄 Actualizando usuario {user['id']} a verificado")
        await db.execute_query(
            "UPDATE users SET is_verified = %s WHERE id = %s",
            (True, user["id"])
        )
        logger.info(f"🔄 Marcando token {token_row['id']} como usado")
        await db.execute_query(
            "UPDATE email_verification_tokens SET used_at = %s WHERE id = %s",
            (datetime.utcnow(), token_row["id"])
        )
        logger.info(f"✅ Email verificado exitosamente para usuario {user['id']} ({email})")
        return True
    except Exception as e:
        logger.error(f"❌ Error verificando email con código: {str(e)}", exc_info=True)
        import traceback
        logger.error(f"Traceback completo: {traceback.format_exc()}")
        return False

async def get_all_devices_admin(db, filters: dict = None) -> List[Dict[str, Any]]:
    """
    Obtiene todos los sensores/dispositivos para el panel de administración
    Usa la tabla sensors (v2 con UUID) en lugar de devices
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        filters: Filtros opcionales
        
    Returns:
        List[Dict]: Lista de sensores con información completa
    """
    try:
        base_query = """
            SELECT s.id::text as id,
                   s.device_id as device_code,
                   s.name,
                   s.device_type,
                   NULL as location,
                   NULL as plant_type,
                   s.user_id,
                   s.plant_id,
                   u.first_name || ' ' || u.last_name as user_name,
                   u.email as user_email,
                   s.created_at,
                   s.last_connection as last_seen,
                   s.last_connection as connected_at,
                   (s.status = 'active') as active,
                   (s.last_connection > NOW() - INTERVAL '1 hour') as connected
            FROM sensors s
            LEFT JOIN users u ON s.user_id = u.id
        """
        
        conditions = []
        params = []
        
        if filters:
            if filters.get("device_type"):
                conditions.append("s.device_type = %s")
                params.append(filters["device_type"])
            
            if filters.get("connected") is not None:
                # connected se determina por last_connection reciente
                if filters["connected"]:
                    conditions.append("s.last_connection > NOW() - INTERVAL '1 hour'")
                else:
                    conditions.append("(s.last_connection IS NULL OR s.last_connection <= NOW() - INTERVAL '1 hour')")
            
            if filters.get("active") is not None:
                if filters["active"]:
                    conditions.append("s.status = 'active'")
                else:
                    conditions.append("s.status != 'active'")
            
            if filters.get("user_id"):
                conditions.append("s.user_id = %s")
                params.append(filters["user_id"])
            
            if filters.get("search"):
                conditions.append("""
                    (s.device_id ILIKE %s OR s.name ILIKE %s 
                     OR u.email ILIKE %s OR u.first_name ILIKE %s OR u.last_name ILIKE %s)
                """)
                search_term = f"%{filters['search']}%"
                params.extend([search_term] * 5)
        
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        base_query += " ORDER BY s.created_at DESC"
        
        # Paginación
        if filters and filters.get("page") and filters.get("limit"):
            offset = (filters["page"] - 1) * filters["limit"]
            base_query += f" LIMIT {filters['limit']} OFFSET {offset}"
        
        result = await db.execute_query(base_query, params)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo sensores para admin: {str(e)}")
        return []

# ===============================================
# FUNCIONES SIMPLIFICADAS PARA ADMIN
# ===============================================

async def get_users_admin_simple(db) -> List[Dict[str, Any]]:
    """
    Obtiene lista simplificada de usuarios para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        
    Returns:
        List[Dict]: Lista de usuarios con conteos de plantas y sensores
    """
    try:
        result = await db.execute_query("""
            SELECT 
                u.id,
                u.email,
                u.full_name,
                u.is_active,
                COUNT(DISTINCT p.id) as plants_count,
                COUNT(DISTINCT s.id) as sensors_count
            FROM users u
            LEFT JOIN plants p ON p.user_id = u.id
            LEFT JOIN sensors s ON s.user_id = u.id
            GROUP BY u.id, u.email, u.full_name, u.is_active
            ORDER BY u.created_at DESC
        """)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
    except Exception as e:
        logger.error(f"Error obteniendo usuarios para admin: {str(e)}")
        return []

async def get_plants_admin_simple(db) -> List[Dict[str, Any]]:
    """
    Obtiene lista simplificada de plantas para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        
    Returns:
        List[Dict]: Lista de plantas con info de usuario y sensor
    """
    try:
        result = await db.execute_query("""
            SELECT 
                p.id,
                p.plant_name,
                p.plant_type,
                u.email as user_email,
                CASE WHEN p.sensor_id IS NOT NULL THEN true ELSE false END as sensor_connected,
                s.device_id as sensor_device_id
            FROM plants p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN sensors s ON p.sensor_id = s.id
            ORDER BY p.created_at DESC
        """)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
    except Exception as e:
        logger.error(f"Error obteniendo plantas para admin: {str(e)}")
        return []

async def get_sensors_admin_simple(db) -> List[Dict[str, Any]]:
    """
    Obtiene lista simplificada de sensores para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        
    Returns:
        List[Dict]: Lista de sensores con info de usuario y planta
    """
    try:
        result = await db.execute_query("""
            SELECT 
                s.id::text as id,
                s.device_id,
                s.name,
                u.email as user_email,
                p.plant_name,
                s.status,
                s.last_connection,
                CASE WHEN s.last_connection > NOW() - INTERVAL '1 hour' THEN true ELSE false END as is_connected
            FROM sensors s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plants p ON s.plant_id = p.id
            ORDER BY s.created_at DESC
        """)
        
        if result is not None and not result.empty:
            return result.to_dict('records')
        return []
    except Exception as e:
        logger.error(f"Error obteniendo sensores para admin: {str(e)}")
        return []

async def get_user_detail_admin(db, user_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene detalle de usuario para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_id: ID del usuario
        
    Returns:
        Dict: Detalle del usuario o None
    """
    try:
        result = await db.execute_query("""
            SELECT 
                u.id,
                u.email,
                u.full_name,
                u.is_active,
                u.is_verified,
                u.created_at,
                COUNT(DISTINCT p.id) as plants_count,
                COUNT(DISTINCT s.id) as sensors_count
            FROM users u
            LEFT JOIN plants p ON p.user_id = u.id
            LEFT JOIN sensors s ON s.user_id = u.id
            WHERE u.id = %s
            GROUP BY u.id, u.email, u.full_name, u.is_active, u.is_verified, u.created_at
        """, (user_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo detalle de usuario para admin: {str(e)}")
        return None

async def get_plant_detail_admin(db, plant_id: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene detalle de planta para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        plant_id: ID de la planta
        
    Returns:
        Dict: Detalle de la planta o None
    """
    try:
        result = await db.execute_query("""
            SELECT 
                p.id,
                p.plant_name,
                p.plant_type,
                p.scientific_name,
                p.health_status,
                u.email as user_email,
                u.id as user_id,
                p.sensor_id::text as sensor_id,
                s.device_id as sensor_device_id,
                p.created_at
            FROM plants p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN sensors s ON p.sensor_id = s.id
            WHERE p.id = %s
        """, (plant_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo detalle de planta para admin: {str(e)}")
        return None

async def get_sensor_detail_admin(db, sensor_id: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene detalle de sensor para admin
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        sensor_id: ID del sensor (UUID como string)
        
    Returns:
        Dict: Detalle del sensor o None
    """
    try:
        result = await db.execute_query("""
            SELECT 
                s.id::text as id,
                s.device_id,
                s.name,
                s.device_type,
                s.status,
                s.user_id,
                u.email as user_email,
                s.plant_id,
                p.plant_name,
                CASE WHEN s.last_connection > NOW() - INTERVAL '1 hour' THEN true ELSE false END as is_connected,
                s.last_connection,
                s.created_at
            FROM sensors s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN plants p ON s.plant_id = p.id
            WHERE s.id::text = %s
        """, (sensor_id,))
        
        if result is not None and not result.empty:
            return result.iloc[0].to_dict()
        return None
    except Exception as e:
        logger.error(f"Error obteniendo detalle de sensor para admin: {str(e)}")
        return None

async def get_admin_stats(db) -> Dict[str, Any]:
    """
    Obtiene estadísticas generales para el panel de administración
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        
    Returns:
        Dict: Estadísticas del sistema
    """
    try:
        # Estadísticas simplificadas
        stats_query = await db.execute_query("""
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
                (SELECT COUNT(*) FROM sensors) as total_sensors,
                (SELECT COUNT(*) FROM sensors WHERE last_connection > NOW() - INTERVAL '1 hour') as connected_sensors,
                (SELECT COUNT(*) FROM plants) as total_plants
        """)
        
        if stats_query is not None and not stats_query.empty:
            return stats_query.iloc[0].to_dict()
        
        return {
            "total_users": 0,
            "active_users": 0,
            "total_sensors": 0,
            "connected_sensors": 0,
            "total_plants": 0
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de admin: {str(e)}")
        return {}

async def bulk_update_users(db, user_ids: List[int], action: str) -> bool:
    """
    Realiza acciones en lote sobre usuarios
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        user_ids: Lista de IDs de usuarios
        action: Acción a realizar (activate, deactivate, delete)
        
    Returns:
        bool: True si se realizó correctamente
    """
    try:
        if action == "activate":
            await db.execute_query(
                f"UPDATE users SET is_active = true WHERE id = ANY(%s)",
                (user_ids,)
            )
        elif action == "deactivate":
            await db.execute_query(
                f"UPDATE users SET is_active = false WHERE id = ANY(%s)",
                (user_ids,)
            )
        elif action == "delete":
            await db.execute_query(
                f"DELETE FROM users WHERE id = ANY(%s)",
                (user_ids,)
            )
        else:
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error en acción en lote de usuarios: {str(e)}")
        return False

async def bulk_update_devices(db, device_ids: List[Any], action: str) -> bool:
    """
    Realiza acciones en lote sobre sensores (v2 con UUID)
    
    Args:
        db: Instancia de AsyncPgDbToolkit
        device_ids: Lista de IDs UUID de sensores (pueden ser strings o UUIDs)
        action: Acción a realizar (activate, deactivate, disconnect, delete)
        
    Returns:
        bool: True si se realizó correctamente
    """
    try:
        # Convertir todos los IDs a strings para trabajar con UUIDs
        device_ids_str = [str(did) for did in device_ids]
        
        if action == "activate":
            await db.execute_query(
                "UPDATE sensors SET status = 'active' WHERE id::text = ANY(%s)",
                (device_ids_str,)
            )
        elif action == "deactivate":
            await db.execute_query(
                "UPDATE sensors SET status = 'inactive' WHERE id::text = ANY(%s)",
                (device_ids_str,)
            )
        elif action == "disconnect":
            await db.execute_query(
                "UPDATE sensors SET user_id = NULL, plant_id = NULL WHERE id::text = ANY(%s)",
                (device_ids_str,)
            )
        elif action == "delete":
            await db.execute_query(
                "DELETE FROM sensors WHERE id::text = ANY(%s)",
                (device_ids_str,)
            )
        else:
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error en acción en lote de sensores: {str(e)}")
        return False