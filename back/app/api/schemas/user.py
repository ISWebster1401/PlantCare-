from pydantic import BaseModel, EmailStr
from pydantic import Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    region: Optional[str] = Field(None, max_length=100)
    vineyard_name: Optional[str] = Field(None, max_length=100)
    hectares: Optional[int] = Field(None, ge=0)
    grape_type: Optional[str] = Field(None, max_length=50)
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    region: Optional[str]
    vineyard_name: Optional[str]
    hectares: Optional[int]
    grape_type: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]
    active: bool

class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    region: Optional[str]
    vineyard_name: Optional[str]
    hectares: Optional[int]
    grape_type: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    
class TokenData(BaseModel):
    email: Optional[str] = None
