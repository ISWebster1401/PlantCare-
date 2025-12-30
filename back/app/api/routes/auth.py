from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from datetime import datetime
from app.api.core.auth_user import AuthService, get_current_user, get_current_active_user
from app.api.core.database import get_db, get_role_by_id
from app.api.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, 
    UserUpdate, PasswordChange, GoogleAuthRequest,
    EmailChangeRequest, EmailChangeConfirm
)
from app.db.queries import (
    get_user_by_email, get_user_by_id, update_user_password, update_user, deactivate_user,
    create_email_verification_token, get_verification_token, mark_email_verified,
    create_email_verification_code, verify_email_with_code,
    create_email_change_request, confirm_email_change
)
from app.api.core.email_service import email_service
from pgdbtoolkit import AsyncPgDbToolkit
import logging

# Configurar logging
logger = logging.getLogger(__name__)

async def build_user_response(user: dict) -> UserResponse:
    """
    Construye un UserResponse desde un dict de usuario de la DB.
    Obtiene el nombre del rol desde la tabla roles usando role_id.
    """
    role_id = user.get("role_id", 1)
    role_name = "user"  # Default
    
    try:
        role_data = await get_role_by_id(role_id)
        if role_data:
            role_name = role_data.get("name", "user")
    except Exception as e:
        logger.warning(f"No se pudo obtener nombre del rol para role_id={role_id}: {e}")
    
    return UserResponse(
        id=user["id"],
        full_name=user.get("full_name", ""),
        email=user["email"],
        role_id=role_id,
        role=role_name,
        is_active=user.get("is_active", True),
        created_at=user.get("created_at", datetime.now()),
        updated_at=user.get("updated_at")
    )
# Asegurar que los logs de auth aparezcan en el archivo y consola
import sys
from logging.handlers import RotatingFileHandler
import os

# Agregar handler de archivo si no existe
if not any(isinstance(h, RotatingFileHandler) for h in logger.handlers):
    try:
        log_file = os.getenv("LOG_FILE", "plantcare.log")
        if log_file:
            log_dir = os.path.dirname(log_file) if os.path.dirname(log_file) else None
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir)
            
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5,
                encoding='utf-8'
            )
            file_handler.setLevel(logging.INFO)
            file_formatter = logging.Formatter(
                fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: No se pudo configurar logging a archivo en auth: {e}")

# Asegurar handler de consola si no existe
if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)
logger.setLevel(logging.INFO)

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
    logger.info(f"Datos recibidos - Nombre: {user_data.full_name}")
    
    try:
        logger.info("Paso 1: Convirtiendo modelo Pydantic a diccionario")
        # Convertir el modelo Pydantic a diccionario
        user_dict = user_data.model_dump()
        logger.info(f"Conversión exitosa. Claves en dict: {list(user_dict.keys())}")
        
        logger.info("Paso 2: Llamando a AuthService.register_user")
        # Registrar el usuario usando el servicio de autenticación
        user = await AuthService.register_user(user_dict, db)
        logger.info(f"AuthService completado. Usuario ID: {user.get('id', 'N/A')}, Email: {user.get('email', 'N/A')}")
        
        logger.info("Paso 3: Construyendo UserResponse")
        # Convertir el resultado a UserResponse (ESQUEMA V2 CON role_id)
        try:
            user_response = await build_user_response(user)
            logger.info("UserResponse construido exitosamente")
        except Exception as response_error:
            logger.error(f"Error construyendo UserResponse: {str(response_error)}")
            logger.error(f"Datos disponibles en user: {list(user.keys()) if isinstance(user, dict) else type(user)}")
            raise
        
        # Crear código de verificación y enviar email
        try:
            logger.info(f"📧 Preparando email de verificación (código) para: {user['email']}")
            code_data = await create_email_verification_code(db, user["id"], minutes_valid=15)
            email_sent = await email_service.send_verification_code(
                to_email=user["email"],
                user_name=user.get("full_name", "Usuario"),
                code=code_data["code"],
                minutes_valid=15
            )
            if email_sent:
                logger.info(f"✅ Email de verificación (código) enviado exitosamente a {user['email']}")
            else:
                logger.error(f"❌ No se pudo enviar email de verificación a {user['email']}. Verifica SENDGRID_API_KEY en .env")
        except Exception as mail_e:
            logger.error(f"❌ Error enviando email de verificación: {mail_e}")
            logger.error(f"   Detalles del error: {repr(mail_e)}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")

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
        
        # Compatibilidad con ambos esquemas
        is_active = user.get("is_active") or user.get("active", True)
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario inactivo"
            )
        
        # Crear tokens
        token_data = {
            "sub": user["email"],
            "user_id": user["id"]
        }
        
        # Si remember_me está activado, crear token de 1 mes, sino 1 hora
        if user_credentials.remember_me:
            from datetime import timedelta
            expires_delta = timedelta(days=30)  # 1 mes
            access_token = AuthService.create_access_token(token_data, expires_delta=expires_delta)
            expires_in_seconds = 30 * 24 * 60 * 60  # 30 días en segundos
            logger.info(f"Usuario autenticado con 'Recordarme' activado: {user['email']} (token válido por 1 mes)")
        else:
            access_token = AuthService.create_access_token(token_data)  # Usa el default de 1 hora
            expires_in_seconds = 60 * 60  # 1 hora en segundos
            logger.info(f"Usuario autenticado: {user['email']} (token válido por 1 hora)")
        
        refresh_token = AuthService.create_refresh_token(token_data)
        
        user_response = await build_user_response(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=expires_in_seconds,
            refresh_token=refresh_token,
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login de usuario: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/google", response_model=Token)
async def login_with_google(
    payload: GoogleAuthRequest,
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Autentica un usuario utilizando Google Identity Services.
    """
    try:
        user = await AuthService.authenticate_google_user(payload.credential, db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No se pudo autenticar con Google"
            )

        token_data = {
            "sub": user["email"],
            "user_id": user["id"]
        }

        access_token = AuthService.create_access_token(token_data)
        refresh_token = AuthService.create_refresh_token(token_data)

        user_response = await build_user_response(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=60 * 60,  # 1 hora en segundos
            refresh_token=refresh_token,
            user=user_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en autenticación con Google: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/verify-code")
async def verify_code(payload: dict, db: AsyncPgDbToolkit = Depends(get_db)):
    """Verifica el email validando un código de 4 dígitos enviado por correo."""
    try:
        email = payload.get("email")
        code = payload.get("code")
        if not email or not code:
            raise HTTPException(status_code=400, detail="Email y código son requeridos")
        ok = await verify_email_with_code(db, email, str(code))
        if not ok:
            raise HTTPException(status_code=400, detail="Código inválido o expirado")
        return {"message": "Correo verificado correctamente. Ya puedes iniciar sesión."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando código: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/resend-code")
async def resend_verification(user_credentials: UserLogin, db: AsyncPgDbToolkit = Depends(get_db)):
    """Reenvía el código de verificación a un usuario no verificado."""
    try:
        if user_credentials and user_credentials.email:
            user = await get_user_by_email(db, user_credentials.email)
        else:
            raise HTTPException(status_code=400, detail="Email requerido")
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if bool(user.get("is_verified", False)):
            return {"message": "El usuario ya está verificado"}
        code_data = await create_email_verification_code(db, user["id"], minutes_valid=15)  # reemplaza anteriores
        await email_service.send_verification_code(
            to_email=user["email"],
            user_name=user.get("full_name", "Usuario"),
            code=code_data["code"],
            minutes_valid=15
        )
        return {"message": "Código de verificación reenviado"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reenviando código: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

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
        
        user_response = await build_user_response(user)
        
        return Token(
            access_token=new_access_token,
            token_type="bearer",
            expires_in=30 * 60,  # 30 minutos en segundos
            refresh_token=new_refresh_token,
            user=user_response
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
        user_response = await build_user_response(current_user)
        
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
        user_response = await build_user_response(updated_user)
        
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
        # Verificar la contraseña actual (compatibilidad con ambos esquemas)
        password_field = current_user.get("hashed_password") or current_user.get("password_hash")
        if not password_field or not AuthService.verify_password(
            password_data.current_password, 
            password_field
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

@router.delete("/me")
async def delete_account(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Elimina la cuenta del usuario actual (desactivación)
    
    Args:
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        # Desactivar el usuario en lugar de eliminarlo completamente
        success = await deactivate_user(db, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo eliminar la cuenta"
            )
        
        logger.info(f"Cuenta eliminada (desactivada): {current_user['email']}")
        
        return {
            "message": "Cuenta eliminada exitosamente",
            "detail": "Tu cuenta ha sido desactivada. Contacta al soporte si deseas reactivarla."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando cuenta: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/change-email")
async def request_email_change(
    email_data: EmailChangeRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Solicita un cambio de email. Envía un código de verificación al nuevo email.
    
    Args:
        email_data: Datos con el nuevo email
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        dict: Mensaje de confirmación
    """
    try:
        new_email = email_data.new_email.lower().strip()
        
        # Verificar que el nuevo email sea diferente al actual
        if new_email == current_user["email"].lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nuevo email debe ser diferente al actual"
            )
        
        # Verificar que el nuevo email no esté en uso
        existing_user = await get_user_by_email(db, new_email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este email ya está en uso por otra cuenta"
            )
        
        # Crear solicitud de cambio de email
        code_data = await create_email_change_request(
            db, 
            current_user["id"], 
            new_email, 
            minutes_valid=15
        )
        
        # Enviar código al nuevo email
        user_name = current_user.get("full_name", "Usuario")
        await email_service.send_email_change_code(
            to_email=new_email,
            user_name=user_name,
            code=code_data["code"],
            minutes_valid=15
        )
        
        logger.info(f"Código de cambio de email enviado a {new_email} para usuario {current_user['id']}")
        
        return {
            "message": "Código de verificación enviado al nuevo email",
            "new_email": new_email  # Devolver para que el frontend sepa a dónde navegar
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error solicitando cambio de email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/confirm-email-change")
async def confirm_email_change_endpoint(
    confirm_data: EmailChangeConfirm,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncPgDbToolkit = Depends(get_db)
):
    """
    Confirma el cambio de email usando el código de verificación.
    
    Args:
        confirm_data: Datos con el nuevo email y código
        current_user: Usuario actual obtenido del token
        db: Conexión a la base de datos
        
    Returns:
        UserResponse: Usuario actualizado
    """
    try:
        new_email = confirm_data.new_email.lower().strip()
        code = confirm_data.code.strip()
        
        # Confirmar el cambio de email
        success = await confirm_email_change(
            db,
            current_user["id"],
            new_email,
            code
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código inválido o expirado"
            )
        
        # Obtener el usuario actualizado
        updated_user = await get_user_by_id(db, current_user["id"])
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error obteniendo usuario actualizado"
            )
        
        # Construir respuesta
        user_response = await build_user_response(updated_user)
        
        logger.info(f"Email cambiado exitosamente para usuario {current_user['id']} a {new_email}")
        
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirmando cambio de email: {str(e)}")
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
