from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import logging
from pgdbtoolkit.async_db import AsyncPgDbToolkit
from app.api.core.database import get_db
from app.api.schemas.user import User, UserResponse, Token, TokenData
from app.api.core.user_db import UserDatabase
import os

logger = logging.getLogger(__name__)

# Environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/auth/login",
)

class AuthService:
    """Authentication service for JWT tokens and user management"""
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[str]:
        """Verify JWT token and return email if valid"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            token_type_check: str = payload.get("type")
            
            if email is None or token_type_check != token_type:
                return None
            
            return email
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.JWTError:
            logger.warning("Invalid token")
            return None
    
    @staticmethod
    async def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Optional[AsyncPgDbToolkit] = Depends(get_db)
    ) -> UserResponse:
        """Get current user from JWT token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            # Check if database is available
            if db is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database service unavailable"
                )
            
            email = AuthService.verify_token(token, "access")
            if email is None:
                raise credentials_exception
            
            user_data = await UserDatabase.get_user_by_email(db, email)
            if user_data is None:
                raise credentials_exception
            
            if not user_data['active']:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Inactive user"
                )
            
            # Convert to UserResponse (without password hash)
            return UserResponse(
                id=user_data['id'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                email=user_data['email'],
                phone=user_data['phone'],
                region=user_data['region'],
                vineyard_name=user_data['vineyard_name'],
                hectares=user_data['hectares'],
                grape_type=user_data['grape_type'],
                created_at=user_data['created_at'],
                last_login=user_data['last_login']
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting current user: {e}")
            raise credentials_exception
    
    @staticmethod
    async def authenticate_user(db: AsyncPgDbToolkit, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user and return user data if valid"""
        return await UserDatabase.authenticate_user(db, email, password)
    
    @staticmethod
    async def create_tokens(user_data: Dict[str, Any]) -> Token:
        """Create both access and refresh tokens for a user"""
        access_token = AuthService.create_access_token(data={"sub": user_data["email"]})
        refresh_token = AuthService.create_refresh_token(data={"sub": user_data["email"]})
        
        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
