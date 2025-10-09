from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import settings
from ..schemas.user import TokenData, UserInDB
from app.db.queries import get_user_by_email, create_user, update_user_last_login
from app.api.core.database import get_db
import logging
from pgdbtoolkit import AsyncPgDbToolkit

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
            
            if not AuthService.verify_password(password, user["password_hash"]):
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
            
            # Crear usuario
            user_dict = user_data.copy()
            user_dict.pop("password", None)
            user_dict.pop("confirm_password", None)
            user_dict["password_hash"] = password_hash
            
            logger.info("AuthService: Creando usuario en base de datos")
            # ✅ CORRECTO: Pasar db a create_user también
            user = await create_user(db, user_dict)
            
            logger.info(f"AuthService: Usuario creado exitosamente con ID: {user.get('id')}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error registrando usuario: {str(e)}")
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
    if not current_user["active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return current_user
