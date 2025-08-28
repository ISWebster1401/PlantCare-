"""
Database functions for user management
"""
import logging
from typing import Optional, Dict, Any
from pgdbtoolkit.async_db import AsyncPgDbToolkit
from app.db.queries import (
    CREATE_USERS_TABLE, 
    INSERT_USER, 
    GET_USER_BY_ID, 
    GET_USER_BY_EMAIL,
    UPDATE_USER,
    DELETE_USER,
    GET_ALL_USERS,
    UPDATE_LAST_LOGIN
)
from app.api.schemas.user import User, UserRegister
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserDatabase:
    """Database operations for users"""
    
    @staticmethod
    async def create_users_table(db: AsyncPgDbToolkit) -> bool:
        """Create users table if not exists"""
        try:
            await db.execute_query(CREATE_USERS_TABLE)
            logger.info("Users table created or already exists")
            return True
        except Exception as e:
            logger.error(f"Error creating users table: {e}")
            return False
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    async def create_user(db: AsyncPgDbToolkit, user_data: UserRegister) -> Optional[int]:
        """Create a new user and return the user ID"""
        try:
            # Hash the password
            hashed_password = UserDatabase.hash_password(user_data.password)
            
            # Insert user
            result = await db.execute_query(
                INSERT_USER,
                (
                    user_data.first_name,
                    user_data.last_name,
                    user_data.email,
                    user_data.phone,
                    user_data.region,
                    user_data.vineyard_name,
                    user_data.hectares,
                    user_data.grape_type,
                    hashed_password
                )
            )
            
            if result and len(result) > 0:
                user_id = result[0][0]
                logger.info(f"User created successfully with ID: {user_id}")
                return user_id
            else:
                logger.error("No result returned from user creation")
                return None
                
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    @staticmethod
    async def get_user_by_email(db: AsyncPgDbToolkit, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email (includes password hash for authentication)"""
        try:
            result = await db.execute_query(GET_USER_BY_EMAIL, (email,))
            
            if result and len(result) > 0:
                row = result[0]
                return {
                    'id': row[0],
                    'first_name': row[1],
                    'last_name': row[2],
                    'email': row[3],
                    'phone': row[4],
                    'region': row[5],
                    'vineyard_name': row[6],
                    'hectares': row[7],
                    'grape_type': row[8],
                    'password_hash': row[9],
                    'created_at': row[10],
                    'last_login': row[11],
                    'active': row[12]
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    @staticmethod
    async def get_user_by_id(db: AsyncPgDbToolkit, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID (without password hash)"""
        try:
            result = await db.execute_query(GET_USER_BY_ID, (user_id,))
            
            if result and len(result) > 0:
                row = result[0]
                return {
                    'id': row[0],
                    'first_name': row[1],
                    'last_name': row[2],
                    'email': row[3],
                    'phone': row[4],
                    'region': row[5],
                    'vineyard_name': row[6],
                    'hectares': row[7],
                    'grape_type': row[8],
                    'created_at': row[9],
                    'last_login': row[10],
                    'active': row[11]
                }
            return None
            
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    @staticmethod
    async def update_last_login(db: AsyncPgDbToolkit, user_id: int) -> bool:
        """Update user's last login timestamp"""
        try:
            await db.execute_query(UPDATE_LAST_LOGIN, (user_id,))
            logger.info(f"Updated last login for user ID: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating last login for user {user_id}: {e}")
            return False
    
    @staticmethod
    async def authenticate_user(db: AsyncPgDbToolkit, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        try:
            user = await UserDatabase.get_user_by_email(db, email)
            
            if not user:
                logger.warning(f"Authentication failed: User with email {email} not found")
                return None
            
            if not user['active']:
                logger.warning(f"Authentication failed: User {email} is inactive")
                return None
            
            if not UserDatabase.verify_password(password, user['password_hash']):
                logger.warning(f"Authentication failed: Invalid password for user {email}")
                return None
            
            # Remove password hash from returned user data
            user_data = user.copy()
            del user_data['password_hash']
            
            logger.info(f"User {email} authenticated successfully")
            return user_data
            
        except Exception as e:
            logger.error(f"Error authenticating user {email}: {e}")
            return None