from fastapi import APIRouter
from app.api.schemas.user import UserRegister
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
router = APIRouter()
