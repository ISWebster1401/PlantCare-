from pydantic import BaseModel, EmailStr, Field, validator, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """Roles de usuario disponibles"""
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"

class UserBase(BaseModel):
    """Esquema base para usuarios"""
    first_name: str = Field(..., min_length=2, max_length=100, description="Nombre del usuario")
    last_name: str = Field(..., min_length=2, max_length=100, description="Apellido del usuario")
    email: EmailStr = Field(..., description="Email único del usuario")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono del usuario")
    region: Optional[str] = Field(None, max_length=100, description="Región del usuario")
    vineyard_name: Optional[str] = Field(None, max_length=200, description="Nombre del viñedo")
    hectares: Optional[float] = Field(None, ge=0, le=999999.99, description="Hectáreas del viñedo")
    grape_type: Optional[str] = Field(None, max_length=100, description="Tipo de uva")

    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Remover espacios y caracteres especiales
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 7 or len(cleaned) > 15:
                raise ValueError('El número de teléfono debe tener entre 7 y 15 dígitos')
        return v

    @field_validator('hectares')
    def validate_hectares(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Las hectáreas deben ser mayores a 0')
        return v

class UserCreate(UserBase):
    """Esquema para crear un nuevo usuario"""
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

class UserUpdate(BaseModel):
    """Esquema para actualizar usuario"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    region: Optional[str] = Field(None, max_length=100)
    vineyard_name: Optional[str] = Field(None, max_length=200)
    hectares: Optional[float] = Field(None, ge=0, le=999999.99)
    grape_type: Optional[str] = Field(None, max_length=100)

    @field_validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            cleaned = ''.join(filter(str.isdigit, v))
            if len(cleaned) < 7 or len(cleaned) > 15:
                raise ValueError('El número de teléfono debe tener entre 7 y 15 dígitos')
        return v

    @field_validator('hectares')
    def validate_hectares(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Las hectáreas deben ser mayores a 0')
        return v

class UserResponse(UserBase):
    """Esquema de respuesta para usuario"""
    id: int
    role: UserRole = UserRole.USER
    created_at: datetime
    last_login: Optional[datetime]
    active: bool

    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserResponse):
    """Esquema interno para usuario en base de datos"""
    password_hash: str

class UserProfile(UserResponse):
    """Esquema extendido para perfil de usuario"""
    device_count: int = 0
    last_activity: Optional[datetime] = None
    preferences: Optional[dict] = None

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
    role: Optional[UserRole] = None

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

class UserStats(BaseModel):
    """Esquema para estadísticas de usuario"""
    total_devices: int
    active_devices: int
    total_readings: int
    last_reading: Optional[datetime]
    alerts_count: int
    recommendations_count: int
    
