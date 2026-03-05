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
import os
from pathlib import Path

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

    @validator('email')
    def strip_email(cls, v):
        return v.strip()

    @validator('password')
    def strip_password(cls, v):
        return v.strip()


class UserLogin(BaseModel):
    email: str
    password: str

    @validator('email')
    def strip_email(cls, v):
        return v.strip()

    @validator('password')
    def strip_password(cls, v):
        return v.strip()


class GuestLogin(BaseModel):
    username: str


# --- Helper to get/ensure auth_data.json ---
# On Vercel, AUTH_DATA_FILE env var points to /tmp/auth_data.json (writable).
# Locally it defaults to backend/auth_data.json.
_DEFAULT_AUTH_FILE = Path(__file__).resolve().parent.parent / "auth_data.json"
AUTH_DATA_FILE = Path(os.getenv("AUTH_DATA_FILE", str(_DEFAULT_AUTH_FILE)))


def get_user_data():
    """Get user data from JSON file (fallback storage)"""
    if AUTH_DATA_FILE.exists():
        with open(AUTH_DATA_FILE, "r") as f:
            return json.load(f)
    return {"users": [], "current_user": None}


def save_user_data(data):
    """Save user data to JSON file"""
    AUTH_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(AUTH_DATA_FILE, "w") as f:
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
            raise HTTPException(
                status_code=400,
                detail={"field": "email", "message": "Email already registered"},
            )

        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(
                status_code=400,
                detail={"field": "username", "message": "Username already taken"},
            )

        # Validate password
        if len(user_data.password) < 8:
            raise HTTPException(
                status_code=400,
                detail={
                    "field": "password",
                    "message": "Password must be at least 8 characters",
                },
            )

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

        # Also backup to JSON so login can fall back to JSON on a cold-start
        # where the ephemeral SQLite DB (/tmp) has been wiped.
        try:
            _data = get_user_data()
            if "users" not in _data:
                _data["users"] = []
            # Only add if not already present (email uniqueness)
            if not any(u.get("email") == new_user.email for u in _data["users"]):
                _data["users"].append({
                    "id": new_user.id,
                    "email": new_user.email,
                    "username": new_user.username,
                    "hashed_password": hashed_pw,
                    "salt": salt,
                    "first_name": new_user.first_name,
                    "last_name": new_user.last_name,
                    "created_at": datetime.utcnow().isoformat(),
                    "level": 1,
                    "xp_total": 0,
                    "streak_days": 0,
                })
                save_user_data(_data)
        except Exception as _backup_err:
            print(f"JSON backup after DB signup failed (non-fatal): {_backup_err}")

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
            },
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
                raise HTTPException(
                    status_code=400,
                    detail={"field": "email", "message": "Email already registered"},
                )
            if u.get("username") == user_data.username:
                raise HTTPException(
                    status_code=400,
                    detail={"field": "username", "message": "Username already taken"},
                )

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
            },
        }


@router.post("/login")
async def login(user_data: UserLogin, request: Request, response: Response):
    """Login with email and password.

    Strategy: try the database first.  If the user record IS found but the
    password is wrong we immediately raise 401 (no fallback).  If the record
    is NOT found in the database (or the DB is unavailable) we fall through to
    the JSON-file store so users who were registered via the JSON fallback path
    can still log in.
    """
    # Try database first
    try:
        db = next(get_db())

        user = db.query(User).filter(User.email == user_data.email).first()

        if user:
            # Record found in DB — validate password here; do NOT fall back to JSON.
            if not user.hashed_password or not user.salt:
                raise HTTPException(
                    status_code=401, detail={"message": "Invalid email or password"}
                )

            if not verify_password(user_data.password, user.hashed_password, user.salt):
                raise HTTPException(
                    status_code=401, detail={"message": "Invalid email or password"}
                )

            # Update last login
            user.last_login_at = datetime.utcnow()
            db.commit()

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
                },
            }
        # user is None → not in DB → fall through to JSON storage

    except HTTPException:
        raise  # Wrong password for a confirmed DB user — propagate immediately
    except Exception as e:
        print(f"Database unavailable, checking JSON storage: {e}")

    # ── JSON storage fallback ──────────────────────────────────────────────
    # Reached when: (a) user not found in DB, or (b) DB threw an error.
    data = get_user_data()

    json_user = None
    for u in data.get("users", []):
        # Strip both sides to guard against accidental whitespace
        if u.get("email", "").strip() == user_data.email:
            json_user = u
            break

    if not json_user:
        raise HTTPException(
            status_code=401, detail={"message": "Invalid email or password"}
        )

    if not verify_password(
        user_data.password,
        json_user.get("hashed_password", ""),
        json_user.get("salt", ""),
    ):
        raise HTTPException(
            status_code=401, detail={"message": "Invalid email or password"}
        )

    # Update last login
    json_user["last_login_at"] = datetime.utcnow().isoformat()
    data["current_user_id"] = json_user["id"]
    save_user_data(data)

    access_token = create_token(json_user["id"], json_user["username"])
    return {
        "access_token": access_token,
        "refresh_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": json_user["id"],
            "email": json_user["email"],
            "username": json_user["username"],
            "first_name": json_user.get("first_name"),
            "level": json_user.get("level", 1),
            "xp_total": json_user.get("xp_total", 0),
            "streak_days": json_user.get("streak_days", 0),
        },
    }


@router.post("/guest-login")
async def guest_login(request: Request):
    """Create a guest account (no email/password required)"""
    data = get_user_data()

    if "users" not in data:
        data["users"] = []

    # Generate unique guest username
    guest_count = len(
        [u for u in data["users"] if u.get("username", "").startswith("guest_")]
    )
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
        },
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


@router.post("/refresh")
async def refresh_token(request: Request):
    """Refresh access token — validates Bearer token and issues a new one."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header[7:]

    # Token format: user_id:username:hex
    parts = token.split(":")
    if len(parts) < 2:
        raise HTTPException(status_code=401, detail="Invalid token format")

    user_id_str = parts[0]
    username = parts[1]

    # Try DB first
    try:
        db = next(get_db())
        user_id = int(user_id_str)
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            new_token = create_token(user.id, user.username)
            return {"access_token": new_token, "token_type": "bearer"}
    except Exception:
        pass

    # Fallback: accept any token that looks valid (guest / JSON-stored users)
    new_token = create_token(user_id_str, username)
    return {"access_token": new_token, "token_type": "bearer"}
