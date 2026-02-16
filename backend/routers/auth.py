"""
Auth Router - Simplified for Voice Tutor App
Supports both database-backed users and guest/localStorage mode
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import hashlib
import secrets
import json

from models import get_db, User, init_db
from pydantic import BaseModel, EmailStr, validator
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Password Helpers (Simplified) ---
def simple_hash(password: str, salt: str = None) -> tuple:
    """Simple hash for demo purposes - in production use Argon2id"""
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    """Verify password against hash"""
    test_hash, _ = simple_hash(password, salt)
    return test_hash == hashed

def create_token(user_id: int, username: str) -> str:
    """Create a simple token"""
    return f"{user_id}:{username}:{secrets.token_hex(32)}"

# --- Schemas ---
class UserSignup(BaseModel):
    email: str
    username: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    goals: List[str] = []
    preferred_level: Optional[str] = "intermediate"
    daily_goal_minutes: int = 10
    learning_language: Optional[str] = "english"

class UserLogin(BaseModel):
    email: str
    password: str

class GuestLogin(BaseModel):
    username: str

# --- Helper to get/ensure auth_data.json ---
def get_user_data():
    """Get user data from JSON file (fallback storage)"""
    from pathlib import Path
    data_file = Path(__file__).resolve().parent.parent / "auth_data.json"
    if data_file.exists():
        with open(data_file, "r") as f:
            return json.load(f)
    return {"users": [], "current_user": None}

def save_user_data(data):
    """Save user data to JSON file"""
    from pathlib import Path
    data_file = Path(__file__).resolve().parent.parent / "auth_data.json"
    with open(data_file, "w") as f:
        json.dump(data, f, indent=2, default=str)

# --- Endpoints ---

@router.post("/signup")
async def signup(user_data: UserSignup, request: Request, response: Response):
    """Register a new user"""
    # Try database first
    try:
        db = next(get_db())
        
        # Check if user exists
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=400, detail={"field": "email", "message": "Email already registered"})
        
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(status_code=400, detail={"field": "username", "message": "Username already taken"})

        # Validate password
        if len(user_data.password) < 8:
            raise HTTPException(status_code=400, detail={"field": "password", "message": "Password must be at least 8 characters"})

        # Hash password
        hashed_pw, salt = simple_hash(user_data.password)

        # Create user
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_pw,
            salt=salt,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create tokens
        access_token = create_token(new_user.id, new_user.username)
        refresh_token = create_token(new_user.id, new_user.username)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "username": new_user.username,
                "first_name": new_user.first_name,
                "level": new_user.current_level,
                "xp_total": new_user.xp_total,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error, using JSON storage: {e}")
        
        # Fallback to JSON storage
        data = get_user_data()
        
        # Initialize users list if not exists
        if "users" not in data:
            data["users"] = []
        
        # Check if user exists
        for u in data["users"]:
            if u.get("email") == user_data.email:
                raise HTTPException(status_code=400, detail={"field": "email", "message": "Email already registered"})
            if u.get("username") == user_data.username:
                raise HTTPException(status_code=400, detail={"field": "username", "message": "Username already taken"})

        # Create user
        user_id = len(data["users"]) + 1
        hashed_pw, salt = simple_hash(user_data.password)
        
        new_user = {
            "id": user_id,
            "email": user_data.email,
            "username": user_data.username,
            "hashed_password": hashed_pw,
            "salt": salt,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "created_at": datetime.utcnow().isoformat(),
            "level": 1,
            "xp_total": 0,
            "streak_days": 0,
            "goals": user_data.goals,
            "preferred_level": user_data.preferred_level,
            "daily_goal_minutes": user_data.daily_goal_minutes,
            "learning_language": user_data.learning_language,
        }
        
        data["users"].append(new_user)
        data["current_user_id"] = user_id
        save_user_data(data)

        # Create tokens
        access_token = create_token(user_id, new_user["username"])

        return {
            "access_token": access_token,
            "refresh_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": new_user["email"],
                "username": new_user["username"],
                "first_name": new_user["first_name"],
                "level": 1,
                "xp_total": 0,
            }
        }


@router.post("/login")
async def login(user_data: UserLogin, request: Request, response: Response):
    """Login with email and password"""
    # Try database first
    try:
        db = next(get_db())
        
        user = db.query(User).filter(User.email == user_data.email).first()
        
        if not user:
            raise HTTPException(status_code=401, detail={"message": "Invalid email or password"})

        if not user.hashed_password or not user.salt:
            raise HTTPException(status_code=401, detail={"message": "Invalid email or password"})

        if not verify_password(user_data.password, user.hashed_password, user.salt):
            raise HTTPException(status_code=401, detail={"message": "Invalid email or password"})

        # Update last login
        user.last_login_at = datetime.utcnow()
        db.commit()

        # Create tokens
        access_token = create_token(user.id, user.username)

        return {
            "access_token": access_token,
            "refresh_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "level": user.current_level,
                "xp_total": user.xp_total,
                "streak_days": user.streak_days,
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database error, checking JSON storage: {e}")
        
        # Fallback to JSON storage
        data = get_user_data()
        
        # Find user by email
        user = None
        for u in data.get("users", []):
            if u.get("email") == user_data.email:
                user = u
                break
        
        if not user:
            raise HTTPException(status_code=401, detail={"message": "Invalid email or password"})

        # Verify password
        if not verify_password(user_data.password, user.get("hashed_password", ""), user.get("salt", "")):
            raise HTTPException(status_code=401, detail={"message": "Invalid email or password"})

        # Update last login
        user["last_login_at"] = datetime.utcnow().isoformat()
        data["current_user_id"] = user["id"]
        save_user_data(data)

        # Create tokens
        access_token = create_token(user["id"], user["username"])

        return {
            "access_token": access_token,
            "refresh_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "first_name": user.get("first_name"),
                "level": user.get("level", 1),
                "xp_total": user.get("xp_total", 0),
                "streak_days": user.get("streak_days", 0),
            }
        }


@router.post("/guest-login")
async def guest_login(request: Request):
    """Create a guest account (no email/password required)"""
    data = get_user_data()
    
    if "users" not in data:
        data["users"] = []
    
    # Generate unique guest username
    guest_count = len([u for u in data["users"] if u.get("username", "").startswith("guest_")])
    username = f"guest_{guest_count + 1}_{secrets.token_hex(4)}"
    
    # Create guest user
    user_id = len(data["users"]) + 1
    
    new_user = {
        "id": user_id,
        "email": f"{username}@guest.local",
        "username": username,
        "is_guest": True,
        "first_name": "Guest",
        "created_at": datetime.utcnow().isoformat(),
        "level": 1,
        "xp_total": 0,
        "streak_days": 0,
        "goals": [],
        "preferred_level": "intermediate",
        "daily_goal_minutes": 10,
        "learning_language": "english",
    }
    
    data["users"].append(new_user)
    data["current_user_id"] = user_id
    save_user_data(data)

    # Create token
    access_token = create_token(user_id, username)

    return {
        "access_token": access_token,
        "refresh_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": new_user["email"],
            "username": username,
            "first_name": "Guest",
            "is_guest": True,
            "level": 1,
            "xp_total": 0,
            "streak_days": 0,
        }
    }


@router.post("/logout")
async def logout(response: Response):
    """Logout user"""
    # Clear any cookies if set
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    
    # Clear current user in JSON storage
    try:
        data = get_user_data()
        data["current_user_id"] = None
        save_user_data(data)
    except:
        pass
    
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(request: Request):
    """Get current logged in user"""
    # Try to get from JSON storage
    try:
        data = get_user_data()
        user_id = data.get("current_user_id")
        
        if user_id:
            for u in data.get("users", []):
                if u.get("id") == user_id:
                    return {
                        "id": u["id"],
                        "email": u.get("email"),
                        "username": u.get("username"),
                        "first_name": u.get("first_name"),
                        "is_guest": u.get("is_guest", False),
                        "level": u.get("level", 1),
                        "xp_total": u.get("xp_total", 0),
                        "streak_days": u.get("streak_days", 0),
                    }
    except:
        pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")


@router.get("/check-email")
async def check_email(email: str):
    """Check if email is already registered"""
    data = get_user_data()
    
    for u in data.get("users", []):
        if u.get("email", "").lower() == email.lower():
            return {"available": False}
    
    return {"available": True}


@router.get("/check-username")
async def check_username(username: str):
    """Check if username is already taken"""
    data = get_user_data()
    
    for u in data.get("users", []):
        if u.get("username", "").lower() == username.lower():
            return {"available": False}
    
    return {"available": True}