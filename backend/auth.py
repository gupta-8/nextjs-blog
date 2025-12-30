from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import os
import logging
import sys

# Secret key for JWT - MUST be set in production environment
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.environ.get('JWT_SECRET', ''))

# CRITICAL: Fail startup if JWT secret is not properly configured
if not SECRET_KEY or SECRET_KEY == 'change-this-in-production-immediately':
    logging.critical("FATAL: JWT_SECRET_KEY environment variable must be set to a secure random value!")
    logging.critical("Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"")
    # In production, exit. In development, use a generated key with warning
    if os.environ.get('ENVIRONMENT', 'development').lower() == 'production':
        sys.exit(1)
    else:
        import secrets
        SECRET_KEY = secrets.token_urlsafe(64)
        logging.warning("WARNING: Using auto-generated JWT secret for development. Set JWT_SECRET_KEY in production!")

ALGORITHM = "HS256"
# Reduced token expiry for security - use refresh tokens for longer sessions
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 4  # 4 hours (reduced from 7 days)
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Refresh token valid for 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Pydantic Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: str
    is_admin: bool = False
    created_at: datetime


# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# JWT utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None


def create_refresh_token(data: dict) -> str:
    """Create a refresh token with longer expiry."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_refresh_token(token: str) -> Optional[TokenData]:
    """Decode and validate a refresh token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None
