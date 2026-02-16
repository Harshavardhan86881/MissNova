"""
Fort Knox Security Layer for Voice Tutor App
- Argon2id password hashing (GPU-resistant)
- Pwned Passwords API integration
- JWT with httpOnly cookies
- Short-lived access + long-lived refresh tokens
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from passlib.hash import argon2
import httpx
import hashlib
import secrets
import os
import re
from jose import JWTError, jwt
from fastapi import HTTPException, status, Request, Response, Depends, Cookie
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, validator

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(64))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived (15 min)
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Long-lived (7 days)

HTTP_ONLY_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
HTTP_ONLY_COOKIE_SAME_SITE = os.getenv("COOKIE_SAME_SITE", "lax")

security = HTTPBearer(auto_error=False)


# ============= PASSWORD VALIDATION =============

COMMON_PASSWORDS = {
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", "master",
    "dragon", "111111", "baseball", "iloveyou", "trustno1", "sunshine", "princess",
    "welcome", "shadow", "superman", "michael", "football", "letmein", "starwars",
}

def validate_password_strength(password: str) -> Dict[str, Any]:
    """
    Validate password strength with comprehensive checks.
    Returns: { valid: bool, score: 0-4, errors: [], warnings: [] }
    """
    errors = []
    warnings = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters")
    if len(password) < 12:
        warnings.append("Consider using 12+ characters for better security")
    
    if not re.search(r'[A-Z]', password):
        errors.append("Must contain at least one uppercase letter")
    if not re.search(r'[a-z]', password):
        errors.append("Must contain at least one lowercase letter")
    if not re.search(r'\d', password):
        errors.append("Must contain at least one number")
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]', password):
        errors.append("Must contain at least one special character")
    
    # Check for common patterns
    lower_password = password.lower()
    if lower_password in COMMON_PASSWORDS:
        errors.append("This password is too common and easy to guess")
    
    for common in COMMON_PASSWORDS:
        if common in lower_password:
            warnings.append(f"Contains common pattern: '{common}'")
    
    # Check for repeated characters
    if re.search(r'(.)\1{2,}', password):
        warnings.append("Avoid repeated characters")
    
    # Check for sequences
    sequences = ['123', '234', '345', '456', '567', '678', '789', 'abc', 'bcd', 'cde', 'qwe', 'asd']
    for seq in sequences:
        if seq in lower_password:
            warnings.append("Avoid sequential characters")
    
    # Calculate score (0-4)
    score = 0
    if len(password) >= 8:
        score += 1
    if len(password) >= 12:
        score += 1
    if re.search(r'[A-Z]', password) and re.search(r'[a-z]', password):
        score += 1
    if re.search(r'\d', password) and re.search(r'[!@#$%^&*()_+\-=]', password):
        score += 1
    
    return {
        "valid": len(errors) == 0,
        "score": score,
        "errors": errors,
        "warnings": warnings
    }


async def check_pwned_password(password: str) -> Dict[str, Any]:
    """
    Check password against Have I Been Pwned API.
    Returns: { compromised: bool, count: int }
    Uses k-anonymity - only sends first 5 chars of SHA-1 hash.
    """
    try:
        sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
        prefix = sha1_hash[:5]
        suffix = sha1_hash[5:]
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                timeout=5.0
            )
            
        if response.status_code == 200:
            hashes = response.text.splitlines()
            for line in hashes:
                parts = line.strip().split(':')
                if len(parts) == 2 and parts[0] == suffix:
                    count = int(parts[1])
                    return {
                        "compromised": True,
                        "count": count,
                        "message": f"This password has appeared in {count:,} data breaches. Please choose a different password."
                    }
        
        return {"compromised": False, "count": 0, "message": "Password not found in known data breaches"}
        
    except Exception as e:
        # Don't block registration if API check fails
        return {"compromised": False, "count": 0, "message": "Unable to verify password status", "error": str(e)}


# ============= ARGON2ID HASHING =============

def hash_password(password: str) -> Tuple[str, str]:
    """
    Hash password using Argon2id.
    Returns: (hashed_password, salt)
    
    Argon2id is the winner of the Password Hashing Competition (2015).
    It's resistant to:
    - GPU attacks (memory-hard)
    - Side-channel attacks (hybrid mode)
    - Time-memory trade-off attacks
    """
    # Generate a unique salt
    salt = secrets.token_hex(16)
    
    # Argon2id with recommended parameters
    # time_cost=3: Number of iterations
    # memory_cost=65536: 64MB memory
    # parallelism=4: Number of threads
    # hash_len=32: Output hash length
    # salt_len=32: Salt length (will be overridden with our generated salt)
    hasher = argon2.using(
        time_cost=3,
        memory_cost=65536,  # 64 MB
        parallelism=4,
        hash_len=32,
        salt_len=32,
        type="id"  # Argon2id hybrid mode
    )
    
    # Hash with our custom salt
    hashed = hasher.hash(password + salt)
    
    return hashed, salt


def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """
    Verify password against stored hash using Argon2id.
    """
    try:
        return argon2.verify(hashed_password, password + salt)
    except Exception:
        return False


# ============= EMAIL VALIDATION =============

DISPOSABLE_EMAIL_DOMAINS = {
    "tempmail.com", "throwaway.email", "mailinator.com", "guerrillamail.com",
    "emailondeck.com", "fakeinbox.com", "10minutemail.com", "maildrop.cc",
    "dispostable.com", "mailnesia.com", "inboxbear.com", "getairmail.com",
    "sharklasers.com", "grr.la", "pokemail.net", "spam4.me", "yopmail.com",
}

def validate_email(email: str) -> Dict[str, Any]:
    """
    Validate email format and check for disposable domains.
    """
    errors = []
    
    # Basic format check
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        errors.append("Invalid email format")
        return {"valid": False, "errors": errors}
    
    # Check for disposable domains
    domain = email.split('@')[1].lower()
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        errors.append("Disposable email addresses are not allowed")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "domain": domain
    }


# ============= JWT TOKENS =============

class TokenPayload(BaseModel):
    sub: str
    type: str  # "access" or "refresh"
    exp: datetime
    iat: datetime
    jti: Optional[str] = None  # JWT ID for revocation

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create short-lived access token (15 min default)."""
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    to_encode.update({
        "type": "access",
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(16)  # Unique token ID
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create long-lived refresh token (7 days default)."""
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    
    to_encode.update({
        "type": "refresh",
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(16)
    })
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str, expected_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token.
    Returns payload if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("type") != expected_type:
            return None
            
        return payload
        
    except JWTError:
        return None


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode token without verifying (for inspection only)."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
    except JWTError:
        return None


# ============= COOKIE-BASED AUTH (HttpOnly) =============

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set httpOnly cookies for tokens."""
    
    # Access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=HTTP_ONLY_COOKIE_SECURE,
        samesite=HTTP_ONLY_COOKIE_SAME_SITE,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )
    
    # Refresh token cookie (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=HTTP_ONLY_COOKIE_SECURE,
        samesite=HTTP_ONLY_COOKIE_SAME_SITE,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/"
    )


def clear_auth_cookies(response: Response):
    """Clear auth cookies on logout."""
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


async def get_current_user_from_cookie(
    request: Request,
    access_token: Optional[str] = Cookie(None)
) -> Dict[str, Any]:
    """
    Dependency to get current user from httpOnly cookie.
    Raises 401 if not authenticated.
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = verify_token(access_token, "access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


async def get_current_user_optional(
    request: Request,
    access_token: Optional[str] = Cookie(None)
) -> Optional[Dict[str, Any]]:
    """Get current user if authenticated, otherwise return None."""
    if not access_token:
        return None
    
    return verify_token(access_token, "access")


# ============= RATE LIMITING =============

from collections import defaultdict
from datetime import datetime

_login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

def check_login_rate_limit(identifier: str) -> Tuple[bool, Optional[int]]:
    """
    Check if login attempts exceed limit.
    Returns: (allowed: bool, lockout_seconds: Optional[int])
    """
    now = datetime.utcnow()
    attempts = _login_attempts[identifier]
    
    # Clean old attempts
    cutoff = now - timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    _login_attempts[identifier] = [a for a in attempts if a > cutoff]
    
    if len(_login_attempts[identifier]) >= MAX_LOGIN_ATTEMPTS:
        # Calculate lockout time
        oldest_attempt = min(_login_attempts[identifier])
        lockout_end = oldest_attempt + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        lockout_seconds = int((lockout_end - now).total_seconds())
        return False, lockout_seconds
    
    return True, None


def record_login_attempt(identifier: str):
    """Record a failed login attempt."""
    _login_attempts[identifier].append(datetime.utcnow())


def clear_login_attempts(identifier: str):
    """Clear login attempts after successful login."""
    if identifier in _login_attempts:
        del _login_attempts[identifier]


# ============= HELPER FUNCTIONS =============

def is_early_bird() -> bool:
    """Check if current server time is before 9:00 AM."""
    return datetime.utcnow().hour < 9


def is_night_owl() -> bool:
    """Check if current server time is between 11 PM and 2 AM."""
    hour = datetime.utcnow().hour
    return hour >= 23 or hour < 2


def get_client_ip(request: Request) -> str:
    """Get client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"