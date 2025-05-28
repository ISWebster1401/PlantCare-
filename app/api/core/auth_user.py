from fastapi import HTTPException, Depends, Header, Response
from fastapi.security import OAuth2PasswordBearer
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Union
import logging
from app.api.core.log import Log
from app.api.core.config import db
import pandas as pd
from passlib.context import CryptContext
from passlib.hash import bcrypt
from fastapi import status
from pgdbtoolkit.async_db import AsyncPgDbToolkit
from app.api.core.database import get_db
from app.api.schemas.user import  User
import os

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES"))

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/login",  # Ensure this path matches your login endpoint
)

class TokenManager:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

        @staticmethod
        def get_current_user(db: AsyncPgDbToolkit = Depends(get_db)) -> User:
            credentials_exception = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
