from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from app.api.core.auth_user import AuthService, get_current_user, get_current_active_user
from app.api.core.database import get_db
from app.api.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, 
    UserUpdate, PasswordChange
)
from app.db.queries import get_user_by_email, update_user_password, update_user
from pgdbtoolkit import AsyncPgDbToolkit
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# Crear router para autenticación
router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
    responses={
        401: {"description": "No autorizado"},
        400: {"description": "Datos inválidos"},
        500: {"description": "Error interno del servidor"}
    }
)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
        user_data: UserCreate,
        db: AsyncPgDbToolkit = Depends(get_db)
    ):
    """
    Registra un nuevo usuario en el sistema
    
    Args:
        user_data: Datos del usuario a registrar
        db: Conexión a la base de datos
        
    Returns:
        UserResponse: Usuario creado
        
    Raises:
        HTTPException: Si el usuario ya existe o hay un error en el registro
    """
    logger.info("=== INICIO PROCESO DE REGISTRO ===")
    logger.info(f"Datos recibidos - Email: {user_data.email}")
    logger.info(f"Datos recibidos - Nombre: {user_data.first_name} {user_data.last_name}")
    logger.info(f"Datos recibidos - Viñedo: {user_data.vineyard_name}")
    
    try:
        logger.info("Paso 1: Convirtiendo modelo Pydantic a diccionario")
        # Convertir el modelo Pydantic a diccionario
        user_dict = user_data.model_dump()
        logger.info(f"Conversión exitosa. Claves en dict: {list(user_dict.keys())}")
        
        logger.info("Paso 2: Llamando a AuthService.register_user")
        # Registrar el usuario usando el servicio de autenticación
        user = await AuthService.register_user(user_dict, db)
        logger.info(f"AuthService completado. Usuario ID: {user.get('id', 'N/A')}")
        
        logger.info("Paso 3: Construyendo UserResponse")
        # Convertir el resultado a UserResponse (excluyendo password_hash)
        try:
            user_response = UserResponse(
                id=user["id"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                email=user["email"],
                phone=user["phone"],
                region=user["region"],
                vineyard_name=user["vineyard_name"],
                hectares=user["hectares"],
                grape_type=user["grape_type"],
                created_at=user["created_at"],
                last_login=user["last_login"],
                active=user["active"]
            )
            logger.info("UserResponse construido exitosamente")
        except Exception as response_error:
            logger.error(f"Error construyendo UserResponse: {str(response_error)}")
            logger.error(f"Datos disponibles en user: {list(user.keys()) if isinstance(user, dict) else type(user)}")
            raise
        
        logger.info(f"Usuario registrado exitosamente: {user['email']}")
        logger.info("=== FIN PROCESO DE REGISTRO EXITOSO ===")
        return user_response
        
    except HTTPException as http_exc:
        logger.error(f"HTTPException capturada: Status {http_exc.status_code} - {http_exc.detail}")
        logger.error("=== FIN PROCESO DE REGISTRO CON HTTP ERROR ===")
        raise
    except Exception as e:
        logger.error(f"Exception general capturada: {type(e).__name__}")
        logger.error(f"Mensaje de error: {str(e)}")
        logger.error(f"Detalles del error: {repr(e)}")
        
        # Log adicional para debugging
        import traceback
        logger.error(f"Traceback completo: {traceback.format_exc()}")
        
        logger.error("=== FIN PROCESO DE REGISTRO CON ERROR 500 ===")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/login", response_model=Token)
async def login_user(
    user_credentials: UserLogin,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Autentica un usuario y genera tokens de acceso
    
    Args:
        user_credentials: Credenciales del usuario
        db: Conexión a la base de datos
        
    Returns:
        Token: Tokens de acceso y refresco
        
    Raises:
        HTTPException: Si las credenciales son inválidas
    """
    try:
        # Autenticar el usuario
        user = await AuthService.authenticate_user(
            user_credentials.email, 
            user_credentials.password,
            db
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user["active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario inactivo"
            )
        
        # Crear tokens
        token_data = {
            "sub": user["email"],
            "user_id": user["id"]
        }
        
        access_token = AuthService.create_access_token(token_data)
        refresh_token = AuthService.create_refresh_token(token_data)
        
        logger.info(f"Usuario autenticado exitosamente: {user['email']}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutos en segundos
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login de usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Refresca un token de acceso usando un token de refresco
    
    Args:
        refresh_token: Token de refresco
        db: Conexión a la base de datos
        
    Returns:
        Token: Nuevos tokens de acceso y refresco
        
    Raises:
        HTTPException: Si el token de refresco es inválido
    """
    try:
        # Verificar el token de refresco
        token_data = AuthService.verify_token(refresh_token)
        
        # Verificar que sea un token de refresco
        if not token_data.email or not token_data.user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de refresco inválido"
            )
        
        # Verificar que el usuario existe y está activo
        user = await get_user_by_email(db, token_data.email)
        if not user or not user["active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo"
            )
        
        # Crear nuevos tokens
        new_token_data = {
            "sub": user["email"],
            "user_id": user["id"]
        }
        
        new_access_token = AuthService.create_access_token(new_token_data)
        new_refresh_token = AuthService.create_refresh_token(new_token_data)
        
        logger.info(f"Token refrescado para usuario: {user['email']}")
        
        return Token(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutos en segundos
            refresh_token=new_refresh_token,
            user=UserResponse.model_validate(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refrescando token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Obtiene la información del usuario actual
    
    Args:
        current_user: Usuario actual obtenido del token
        
    Returns:
        UserResponse: Información del usuario actual
    """
    try:
        # Convertir el usuario a UserResponse
        user_response = UserResponse.model_validate(current_user)
        
        return user_response
        
    except Exception as e:
        logger.error(f"Error obteniendo información del usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Actualiza la información del usuario actual
    
    Args:
        user_data: Datos a actualizar
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        UserResponse: Usuario actualizado
    """
    try:
        # Convertir el modelo Pydantic a diccionario
        update_data = user_data.model_dump(exclude_unset=True)
        
        # Actualizar el usuario
        updated_user = await update_user(db, current_user["id"], update_data)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar el usuario"
            )
        
        # Convertir a UserResponse
        user_response = UserResponse.model_validate(current_user)
        
        logger.info(f"Usuario actualizado: {updated_user['email']}")
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Cambia la contraseña del usuario actual
    
    Args:
        password_data: Datos para el cambio de contraseña
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        # Verificar la contraseña actual
        if not AuthService.verify_password(
            password_data.current_password, 
            current_user["password_hash"]
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contraseña actual incorrecta"
            )
        
        # Generar hash de la nueva contraseña
        new_password_hash = AuthService.get_password_hash(password_data.new_password)
        
        # Actualizar la contraseña
        success = await update_user_password(db, current_user["id"], new_password_hash)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo cambiar la contraseña"
            )
        
        logger.info(f"Contraseña cambiada para usuario: {current_user['email']}")
        
        return {"message": "Contraseña cambiada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cambiando contraseña: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/logout")
async def logout_user(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Cierra la sesión del usuario actual
    
    Args:
        current_user: Usuario actual obtenido del token
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        # En un sistema real, aquí se invalidarían los tokens
        # Por ahora, solo registramos el logout
        logger.info(f"Usuario cerró sesión: {current_user['email']}")
        
        return {"message": "Sesión cerrada exitosamente"}
        
    except Exception as e:
        logger.error(f"Error en logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )
