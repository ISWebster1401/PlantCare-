from pydantic import BaseModel
from pydantic import Field

class UserRegister(BaseModel):
    id: int
    name: str
    last_name: str
    email: str
    phone: int
    address: str
    vineyard_name: str
    hectares: int
    grape_type: str
    password: str = Field(..., min_length=9)


class User(BaseModel):
    id: int
    name: str
    last_name: str
    email: str
    phone: int
    address: str
    vineyard_name: str
    hectares: int
    grape_type: str
    
