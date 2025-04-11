# schemas.py
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class StateBase(BaseModel):
    name: str

class StateCreate(StateBase):
    pass

class State(StateBase):
    id: int
    country_id: int
    
    class Config:
        orm_mode = True

class CountryBase(BaseModel):
    name: str

class CountryCreate(CountryBase):
    pass

class Country(CountryBase):
    id: int
    states: List[State] = []
    
    class Config:
        orm_mode = True

class UserBase(BaseModel):
    first_name: str
    last_name: str
    mobile_number: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    country_id: int
    state_id: int

class User(UserBase):
    id: int
    
    class Config:
        orm_mode = True

class UserLogin(UserCreate):
    pass  

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ResponseModel(BaseModel):
    success: bool
    status_code: int
    message: str
    data: Optional[dict] = None
# Add this new class
class MeetingCreate(BaseModel):
    topic: str
    start_time: datetime
    timezone: str = "UTC" 