from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """Roles de usuario disponibles"""
    USER = "user"
    ADMIN = "admin"

class UserBase(BaseModel):
    """Esquema base para usuarios (ESQUEMA V2)"""
    full_name: str = Field(..., min_length=2, max_length=255, description="Nombre completo del usuario")
    email: EmailStr = Field(..., description="Email único del usuario")

class UserCreate(UserBase):
    """Esquema para crear un nuevo usuario (ESQUEMA V2)"""
    password: str = Field(..., min_length=8, max_length=128, description="Contraseña del usuario")
    confirm_password: str = Field(..., description="Confirmación de la contraseña")

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Las contraseñas no coinciden')
        return v

    @field_validator('password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('La contraseña debe contener al menos un carácter especial')
        return v

class UserLogin(BaseModel):
    """Esquema para login de usuario"""
    email: EmailStr = Field(..., description="Email del usuario")
    password: str = Field(..., description="Contraseña del usuario")
    remember_me: bool = Field(default=False, description="Si es True, el token durará 1 mes en lugar de 1 hora")

class GoogleAuthRequest(BaseModel):
    """Payload para autenticación con Google"""
    credential: str = Field(..., description="ID token devuelto por Google Identity Services")

class UserUpdate(BaseModel):
    """Esquema para actualizar usuario (ESQUEMA V2)"""
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    
    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if v is not None:
            stripped = v.strip()
            if len(stripped) < 2:
                raise ValueError('El nombre debe tener al menos 2 caracteres')
            if len(stripped) > 255:
                raise ValueError('El nombre no puede tener más de 255 caracteres')
            return stripped
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            stripped = v.strip()
            if stripped and len(stripped) > 20:
                raise ValueError('El teléfono no puede tener más de 20 caracteres')
            return stripped if stripped else None
        return v
    
    @field_validator('bio')
    @classmethod
    def validate_bio(cls, v):
        if v is not None:
            stripped = v.strip()
            if len(stripped) > 500:
                raise ValueError('La biografía no puede tener más de 500 caracteres')
            return stripped if stripped else None
        return v
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        if v is not None:
            stripped = v.strip()
            if len(stripped) > 100:
                raise ValueError('La ubicación no puede tener más de 100 caracteres')
            return stripped if stripped else None
        return v

class UserResponse(UserBase):
    """Esquema de respuesta para usuario (ESQUEMA V2 CON role_id)"""
    id: int
    role_id: int = 1
    role: Optional[str] = None  # Nombre del rol (se obtiene de la tabla roles)
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserResponse):
    """Esquema interno para usuario en base de datos (ESQUEMA V2)"""
    hashed_password: str

class UserProfile(UserResponse):
    """Esquema extendido para perfil de usuario"""
    plant_count: int = 0
    sensor_count: int = 0
    achievement_count: int = 0
    last_activity: Optional[datetime] = None

class Token(BaseModel):
    """Esquema para token de acceso"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: UserResponse

class TokenData(BaseModel):
    """Esquema para datos del token"""
    email: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None

class PasswordChange(BaseModel):
    """Esquema para cambio de contraseña"""
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, max_length=128, description="Nueva contraseña")
    confirm_new_password: str = Field(..., description="Confirmación de la nueva contraseña")

    @field_validator('confirm_new_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v

    @field_validator('new_password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('La contraseña debe contener al menos un carácter especial')
        return v

class PasswordReset(BaseModel):
    """Esquema para reset de contraseña"""
    email: EmailStr = Field(..., description="Email del usuario")

class ResendCodeRequest(BaseModel):
    """Esquema para reenviar código de verificación"""
    email: EmailStr = Field(..., description="Email del usuario")

class PasswordResetConfirm(BaseModel):
    """Esquema para confirmar reset de contraseña"""
    token: str = Field(..., description="Token de reset")
    new_password: str = Field(..., min_length=8, max_length=128, description="Nueva contraseña")
    confirm_new_password: str = Field(..., description="Confirmación de la nueva contraseña")

    @field_validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v

    @field_validator('new_password')
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una minúscula')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v):
            raise ValueError('La contraseña debe contener al menos un carácter especial')
        return v

class EmailChangeRequest(BaseModel):
    """Esquema para solicitar cambio de email"""
    new_email: EmailStr = Field(..., description="Nuevo email del usuario")

class EmailChangeConfirm(BaseModel):
    """Esquema para confirmar cambio de email con código"""
    new_email: EmailStr = Field(..., description="Nuevo email del usuario")
    code: str = Field(..., min_length=4, max_length=4, description="Código de verificación de 4 dígitos")

class UserStats(BaseModel):
    """Esquema para estadísticas de usuario"""
    total_plants: int
    active_sensors: int
    total_readings: int
    last_reading: Optional[datetime]
    notifications_count: int
    achievements_count: int
