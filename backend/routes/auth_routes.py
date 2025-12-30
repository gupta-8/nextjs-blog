from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid
from datetime import datetime, timezone

from auth import (
    UserCreate, UserLogin, User, Token,
    verify_password, get_password_hash, create_access_token, decode_token,
    create_refresh_token, decode_refresh_token
)
from utils import (
    check_rate_limit, record_attempt,
    check_account_lockout, increment_failure_count, clear_failure_count,
    log_audit, AuditAction, set_rate_limiter_db
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Rate limiting constants (now using persistent MongoDB storage)
MAX_ATTEMPTS = 5
TOTP_MAX_ATTEMPTS = 3  # Stricter for TOTP
WINDOW_SECONDS = 300  # 5 minutes
MAX_FAILURES_BEFORE_LOCKOUT = 10
LOCKOUT_DURATION_MINUTES = 30

# Will be set from main server.py
db = None

def set_db(database):
    global db
    db = database
    # Also set db for rate limiter
    set_rate_limiter_db(database)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await db.users.find_one({"email": token_data.email}, {"_id": 0})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return User(**user)


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure current user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/setup-status")
async def get_setup_status():
    """Check if initial setup is needed (no admin user exists)"""
    user_count = await db.users.count_documents({})
    return {
        "setup_required": user_count == 0,
        "message": "Setup required - create your admin account" if user_count == 0 else "Setup complete"
    }


@router.post("/setup")
async def initial_setup(user_data: UserCreate):
    """Initial admin setup - Only works if NO users exist"""
    # SECURITY: Only allow setup if no users exist
    user_count = await db.users.count_documents({})
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed. Admin user exists."
        )
    
    # Validate password strength (optional but recommended)
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create admin user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": get_password_hash(user_data.password),
        "is_admin": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    return {
        "success": True,
        "message": "Admin account created successfully",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }


@router.post("/register", response_model=User)
async def register(user_data: UserCreate):
    """Register a new user - Only works if NO users exist (first admin setup)"""
    # SECURITY: Only allow registration if no users exist
    user_count = await db.users.count_documents({})
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled. Contact admin."
        )
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # First user is always admin
    is_admin = True
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": get_password_hash(user_data.password),
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Return user without password
    return User(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        is_admin=user["is_admin"],
        created_at=datetime.fromisoformat(user["created_at"])
    )


@router.post("/login")
async def login(credentials: UserLogin, request: Request):
    """Login and get access token with persistent rate limiting and account lockout."""
    # Get real client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Check account lockout first
    is_locked, unlock_time = await check_account_lockout(
        credentials.email, 
        MAX_FAILURES_BEFORE_LOCKOUT, 
        LOCKOUT_DURATION_MINUTES
    )
    if is_locked:
        await log_audit(
            AuditAction.LOGIN_FAILED,
            user_email=credentials.email,
            ip_address=client_ip,
            details={"reason": "account_locked"},
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again after {unlock_time.strftime('%H:%M UTC') if unlock_time else 'some time'}."
        )
    
    # Check IP-based rate limit (persistent)
    is_allowed, remaining = await check_rate_limit(
        identifier=client_ip,
        limit_type="login",
        max_attempts=MAX_ATTEMPTS,
        window_seconds=WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {WINDOW_SECONDS // 60} minutes."
        )
    
    user = await db.users.find_one({"email": credentials.email})
    
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        # Record failed attempt for both IP and account
        await record_attempt(client_ip, "login")
        await increment_failure_count(credentials.email, MAX_FAILURES_BEFORE_LOCKOUT, LOCKOUT_DURATION_MINUTES)
        await log_audit(
            AuditAction.LOGIN_FAILED,
            user_email=credentials.email,
            ip_address=client_ip,
            details={"reason": "invalid_credentials"},
            success=False
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",  # Generic message to prevent user enumeration
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear rate limits on successful credential verification
    await record_attempt(client_ip, "login", success=True)
    await clear_failure_count(credentials.email)
    
    # Check if TOTP is enabled for this user
    if user.get('totp_enabled') and user.get('totp_secret'):
        # Return indicator that TOTP is required
        return {
            "requires_totp": True,
            "email": credentials.email,
            "message": "TOTP verification required"
        }
    
    # Store current login time and get previous login time/IP
    previous_login = user.get('last_login')
    previous_ip = user.get('last_login_ip')
    current_login = datetime.now(timezone.utc).isoformat()
    
    # Update last login in database
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {
            "last_login": current_login, 
            "previous_login": previous_login,
            "last_login_ip": client_ip,
            "previous_login_ip": previous_ip
        }}
    )
    
    # Generate tokens
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["email"]})
    
    await log_audit(
        AuditAction.LOGIN_SUCCESS,
        user_id=user.get("id"),
        user_email=user["email"],
        ip_address=client_ip
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "last_login": previous_login,
        "last_login_ip": previous_ip
    }


@router.post("/login/totp")
async def login_with_totp(request: Request):
    """Complete login with TOTP code after password verification"""
    from utils.crypto import decrypt_sensitive_data
    
    # Get real client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Rate limiting for TOTP attempts (stricter than login, persistent)
    is_allowed, _ = await check_rate_limit(
        identifier=client_ip,
        limit_type="totp",
        max_attempts=TOTP_MAX_ATTEMPTS,
        window_seconds=WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many TOTP attempts. Try again in {WINDOW_SECONDS // 60} minutes."
        )
    
    body = await request.json()
    email = body.get('email')
    password = body.get('password')
    totp_code = body.get('totp_code')
    
    if not email or not password or not totp_code:
        raise HTTPException(status_code=400, detail="Email, password, and TOTP code required")
    
    user = await db.users.find_one({"email": email})
    
    if not user or not verify_password(password, user["hashed_password"]):
        await record_attempt(client_ip, "totp")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"  # Generic message to prevent enumeration
        )
    
    if not user.get('totp_secret'):
        raise HTTPException(status_code=400, detail="TOTP not enabled for this user")
    
    import pyotp
    
    # Decrypt TOTP secret if encrypted (new format)
    totp_secret = user['totp_secret']
    if totp_secret.startswith('gAAAAA'):  # Fernet encrypted format
        try:
            totp_secret = decrypt_sensitive_data(totp_secret)
        except Exception:
            pass  # Use as-is if decryption fails (legacy unencrypted)
    
    totp = pyotp.TOTP(totp_secret)
    if not totp.verify(totp_code, valid_window=1):  # Allow 1 window tolerance
        await record_attempt(client_ip, "totp")
        raise HTTPException(status_code=401, detail="Invalid TOTP code")
    
    # Clear attempts on success
    await record_attempt(client_ip, "totp", success=True)
    
    # Store current login time and get previous login time/IP
    previous_login = user.get('last_login')
    previous_ip = user.get('last_login_ip')
    current_login = datetime.now(timezone.utc).isoformat()
    
    # Update last login in database
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {
            "last_login": current_login, 
            "previous_login": previous_login,
            "last_login_ip": client_ip,
            "previous_login_ip": previous_ip
        }}
    )
    
    access_token = create_access_token(data={"sub": user["email"]})
    refresh_token = create_refresh_token(data={"sub": user["email"]})
    
    await log_audit(
        AuditAction.LOGIN_SUCCESS,
        user_id=user.get("id"),
        user_email=user["email"],
        ip_address=client_ip,
        details={"method": "totp"}
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "last_login": previous_login,
        "last_login_ip": previous_ip
    }


@router.post("/refresh")
async def refresh_token(request: Request):
    """Refresh access token using refresh token"""
    body = await request.json()
    refresh_token_str = body.get('refresh_token')
    
    if not refresh_token_str:
        raise HTTPException(status_code=400, detail="Refresh token required")
    
    token_data = decode_refresh_token(refresh_token_str)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    # Verify user still exists
    user = await db.users.find_one({"email": token_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Issue new access token
    new_access_token = create_access_token(data={"sub": user["email"]})
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user
