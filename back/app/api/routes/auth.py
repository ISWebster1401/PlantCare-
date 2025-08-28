from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from pgdbtoolkit.async_db import AsyncPgDbToolkit
from app.api.core.database import get_db
from app.api.schemas.user import (
    UserRegister, 
    UserLogin, 
    UserResponse, 
    Token
)
from app.api.core.user_db import UserDatabase
from app.api.core.auth_user import AuthService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    db: Optional[AsyncPgDbToolkit] = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if database is available
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        # Check if user already exists
        existing_user = await UserDatabase.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_id = await UserDatabase.create_user(db, user_data)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
        
        # Get created user data
        created_user = await UserDatabase.get_user_by_id(db, user_id)
        if not created_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created user"
            )
        
        logger.info(f"User registered successfully: {user_data.email}")
        return UserResponse(**created_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/login", response_model=Token)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Optional[AsyncPgDbToolkit] = Depends(get_db)
):
    """Login user and return JWT tokens"""
    try:
        # Check if database is available
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        
        # Authenticate user
        user_data = await AuthService.authenticate_user(db, form_data.username, form_data.password)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        await UserDatabase.update_last_login(db, user_data['id'])
        
        # Create tokens
        tokens = await AuthService.create_tokens(user_data)
        
        logger.info(f"User logged in successfully: {user_data['email']}")
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/login-json", response_model=Token)
async def login_user_json(
    login_data: UserLogin,
    db: Optional[AsyncPgDbToolkit] = Depends(get_db)
):
    """Login user with JSON payload and return JWT tokens"""
    try:
        # Check if database is available
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        
        # Authenticate user
        user_data = await AuthService.authenticate_user(db, login_data.email, login_data.password)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last login
        await UserDatabase.update_last_login(db, user_data['id'])
        
        # Create tokens
        tokens = await AuthService.create_tokens(user_data)
        
        logger.info(f"User logged in successfully: {user_data['email']}")
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: UserResponse = Depends(AuthService.get_current_user)
):
    """Get current user information"""
    return current_user

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Optional[AsyncPgDbToolkit] = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # Check if database is available
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service unavailable"
            )
        
        # Verify refresh token
        email = AuthService.verify_token(refresh_token, "refresh")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user data
        user_data = await UserDatabase.get_user_by_email(db, email)
        if not user_data or not user_data['active']:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        tokens = await AuthService.create_tokens(user_data)
        
        logger.info(f"Token refreshed for user: {email}")
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
