from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
from ..schemas.user import TokenData, UserInDB
from app.db.queries import get_user_by_email, create_user, update_user_last_login, update_user
from app.api.core.database import get_db
import logging
from pgdbtoolkit import AsyncPgDbToolkit
import secrets
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

# Configurar logging
logger = logging.getLogger(__name__)

# Configuración para hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de seguridad HTTP
security = HTTPBearer()

class AuthService:
    """Servicio para manejar autenticación y autorización"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verifica si una contraseña en texto plano coincide con su hash
        
        Args:
            plain_password: Contraseña en texto plano
            hashed_password: Hash de la contraseña
            
        Returns:
            bool: True si la contraseña coincide, False en caso contrario
        """
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Error verificando contraseña: {str(e)}")
            return False
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """
        Genera un hash de la contraseña proporcionada
        
        Args:
            password: Contraseña en texto plano
            
        Returns:
            str: Hash de la contraseña
        """
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Error generando hash de contraseña: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno del servidor"
            )
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Crea un token de acceso JWT
        
        Args:
            data: Datos a incluir en el token
            expires_delta: Tiempo de expiración personalizado
            
        Returns:
            str: Token JWT codificado
        """
        try:
            to_encode = data.copy()
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creando token de acceso: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno del servidor"
            )
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """
        Crea un token de refresco JWT
        
        Args:
            data: Datos a incluir en el token
            
        Returns:
            str: Token de refresco JWT codificado
        """
        try:
            to_encode = data.copy()
            expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
            to_encode.update({"exp": expire, "type": "refresh"})
            encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
            return encoded_jwt
        except Exception as e:
            logger.error(f"Error creando token de refresco: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno del servidor"
            )
    
    @staticmethod
    def verify_token(token: str) -> TokenData:
        """
        🔍 VERIFICACIÓN DE TOKEN JWT - CORAZÓN DE LA PERSISTENCIA
        Decodifica y valida el token que viene desde las cookies del frontend
        """
        try:
            # Decodifica el token usando la clave secreta
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            
            email: str = payload.get("sub")
            user_id: int = payload.get("user_id")
            
            if email is None or user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token inválido",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(email=email, user_id=user_id)
            
        except JWTError as e:
            # Token expirado o corrupto
            logger.error(f"Token inválido: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    async def authenticate_user(email: str, password: str, db: AsyncPgDbToolkit) -> Optional[UserInDB]:
        """
        Autentica un usuario verificando su email y contraseña
        
        Args:
            email: Email del usuario
            password: Contraseña en texto plano
            db: Conexión a la base de datos
            
        Returns:
            UserInDB: Usuario autenticado o None si falla la autenticación
        """
        try:
            user = await get_user_by_email(db, email)
            if not user:
                return None
            
            # Compatibilidad con ambos esquemas
            password_field = user.get("hashed_password") or user.get("password_hash")
            if not password_field or not AuthService.verify_password(password, password_field):
                return None
            
            # Actualizar último login
            await update_user_last_login(db, user["id"])
            
            return user
        except Exception as e:
            logger.error(f"Error autenticando usuario: {str(e)}")
            return None
    
    @staticmethod
    async def register_user(user_data: dict, db: AsyncPgDbToolkit) -> UserInDB:
        """
        Registra un nuevo usuario en el sistema
        
        Args:
            user_data: Datos del usuario a registrar
            db: Conexión a la base de datos
            
        Returns:
            UserInDB: Usuario creado
            
        Raises:
            HTTPException: Si el usuario ya existe o hay un error en el registro
        """
        try:
            logger.info("AuthService: Verificando si usuario ya existe")
            
            # ✅ CORRECTO: Pasar db como primer parámetro
            existing_user = await get_user_by_email(db, user_data["email"])
            
            if existing_user:
                logger.warning(f"Usuario ya existe: {user_data['email']}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El email ya está registrado"
                )
            
            logger.info("AuthService: Generando hash de contraseña")
            # Hash de la contraseña
            password_hash = AuthService.get_password_hash(user_data["password"])
            
            # Crear usuario (ESQUEMA V2 CON role_id)
            user_dict = {
                "email": user_data["email"],
                "full_name": user_data.get("full_name", ""),
                "hashed_password": password_hash,
                "role_id": 1,  # 1 = user, 2 = admin
                "is_active": True
            }
            
            logger.info("AuthService: Creando usuario en base de datos")
            # ✅ CORRECTO: Pasar db a create_user también
            user = await create_user(db, user_dict)
            
            logger.info(f"AuthService: Usuario creado exitosamente con ID: {user.get('id')}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error registrando usuario: {str(e)}")
            logger.error(f"   Tipo: {type(e).__name__}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno del servidor: {str(e)}"
            )

    @staticmethod
    async def authenticate_google_user(credential: str, db: AsyncPgDbToolkit) -> UserInDB:
        """
        Autentica o registra un usuario usando Google ID token.
        """
        try:
            if not settings.GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="La autenticación con Google no está configurada"
                )

            request = google_requests.Request()
            try:
                id_info = google_id_token.verify_oauth2_token(
                    credential,
                    request,
                    settings.GOOGLE_CLIENT_ID
                )
            except Exception as e:
                logger.error(f"Error verificando token de Google: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token de Google inválido"
                )

            email = id_info.get("email")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo obtener el email de Google"
                )

            if not id_info.get("email_verified", False):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tu cuenta de Google aún no está verificada"
                )

            # Solo validar dominio si GOOGLE_ALLOWED_DOMAINS está configurado y no está vacío
            if settings.GOOGLE_ALLOWED_DOMAINS and settings.GOOGLE_ALLOWED_DOMAINS.strip():
                allowed_domains = [
                    domain.strip().lower()
                    for domain in settings.GOOGLE_ALLOWED_DOMAINS.split(",")
                    if domain.strip()
                ]
                if allowed_domains:
                    domain = email.split("@")[-1].lower()
                    if domain not in allowed_domains:
                        logger.warning(f"Intento de login con dominio no autorizado: {domain}")
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="El dominio de tu email no está autorizado"
                        )
            else:
                logger.info("GOOGLE_ALLOWED_DOMAINS no configurado, permitiendo cualquier dominio")

            full_name = id_info.get("name", "")
            if not full_name:
                first_name = id_info.get("given_name", "Usuario")
                last_name = id_info.get("family_name", "PlantCare")
                full_name = f"{first_name} {last_name}"

            user = await get_user_by_email(db, email)

            if user:
                # Compatibilidad con ambos esquemas
                is_active = user.get("is_active") or user.get("active", True)
                if not is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Usuario inactivo, contacta al administrador"
                    )

                updates = {
                    "full_name": full_name,
                }
                await update_user(db, user["id"], updates)
                user = await get_user_by_email(db, email)
            else:
                random_secret = secrets.token_urlsafe(32)
                password_hash = AuthService.get_password_hash(random_secret)
                user_payload = {
                    "email": email,
                    "full_name": full_name,
                    "hashed_password": password_hash,
                    "role": "user",
                    "is_active": True,
                }
                user = await create_user(db, user_payload)
                user = await get_user_by_email(db, email)
            return user

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error autenticando usuario con Google: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno del servidor"
            )

# Función para obtener el usuario actual desde el token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncPgDbToolkit = Depends(get_db)
) -> UserInDB:
    """
    👤 VALIDACIÓN DE SESIÓN PERSISTENTE
    Función clave que valida el token JWT en cada request protegido
    """
    try:
        # Extrae token del header Authorization (viene desde cookies)
        token = credentials.credentials
        
        # Verifica que el token sea válido y no haya expirado
        token_data = AuthService.verify_token(token)
        
        if token_data.email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Busca al usuario en la base de datos
        user = await get_user_by_email(db, token_data.email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error de autenticación: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error de autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )

# 🛡️ VALIDACIÓN FINAL - SE USA EN TODOS LOS ENDPOINTS PROTEGIDOS
async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """
    Verifica que el usuario esté activo después de validar el token
    Se usa como Dependency en endpoints como /api/ai/ask, /api/devices/connect
    """
    # ← SOLO 4 ESPACIOS (el nivel de la función)
    is_active = current_user.get("is_active") or current_user.get("active", True)
    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return current_user
