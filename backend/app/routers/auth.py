from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt
from app.database import users_collection
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_key_change_in_production_12345")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Pydantic Schema for Registration
class UserRegister(BaseModel):
    reg_no: str
    password: str

def create_access_token(data: dict):
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        reg_no: str = payload.get("sub")
        if reg_no is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    user = await users_collection.find_one({"reg_no": reg_no})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

# 1. Register Endpoint (Auto Approve = True)
@router.post("/register", status_code=201)
async def register_user(payload: UserRegister):
    existing_user = await users_collection.find_one({"reg_no": payload.reg_no})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already registered")

    user_doc = {
        "reg_no": payload.reg_no,
        "password": payload.password,
        "is_approved": True,  # 👈 Auto Approved!
        "is_admin": False
    }

    result = await users_collection.insert_one(user_doc)
    return {
        "id": str(result.inserted_id),
        "reg_no": payload.reg_no,
        "is_approved": True,
        "is_admin": False
    }

# 2. Login Endpoint (Bypasses manual approval completely)
@router.post("/login")
async def login_user(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await users_collection.find_one({"reg_no": form_data.username})
    
    if not user or user.get("password") != form_data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # 💡 பழைய அக்கவுண்ட்டில் 'is_approved' False என இருந்தால் கூட, அதை உடனே True ஆக மாற்றி Login அனுமதிக்கும்!
    if not user.get("is_approved", True):
        await users_collection.update_one(
            {"reg_no": form_data.username},
            {"$set": {"is_approved": True}}
        )

    access_token = create_access_token({"sub": form_data.username})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }