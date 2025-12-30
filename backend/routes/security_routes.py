from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import Optional, List
from pydantic import BaseModel, EmailStr
import uuid
import pyotp
import qrcode
import io
import base64
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
import json
import logging
import os

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    PublicKeyCredentialDescriptor,
    AuthenticatorTransport
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from routes.auth_routes import get_admin_user, get_current_user, User
from auth import verify_password, get_password_hash
from utils import (
    check_rate_limit, record_attempt,
    log_audit, AuditAction,
    encrypt_sensitive_data, decrypt_sensitive_data,
    hash_otp_code, verify_otp_hash,
    validate_password_strength
)

router = APIRouter(prefix="/security", tags=["Security"])

# Rate limiting constants (using persistent MongoDB storage now)
PASSKEY_MAX_ATTEMPTS = 5
PASSKEY_WINDOW_SECONDS = 300  # 5 minutes
WEBAUTHN_CHALLENGE_TTL_SECONDS = 300  # 5 minutes

# Will be set from main server.py
db = None

def set_db(database):
    global db
    db = database


# ============ Models ============

class SMTPConfig(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_email: str
    smtp_password: str
    use_tls: bool = True

class SecuritySettings(BaseModel):
    email_otp_enabled: bool = False
    totp_enabled: bool = False
    passkey_enabled: bool = False
    admin_email: str = ''  # Set via admin dashboard

class OTPVerify(BaseModel):
    otp_code: str
    session_token: str

class TOTPSetup(BaseModel):
    totp_code: str

class PasskeyCredential(BaseModel):
    id: str
    name: str
    created_at: str
    last_used: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ============ SMTP Email Functions ============

async def get_smtp_config():
    """Get SMTP configuration from database"""
    config = await db.smtp_config.find_one({}, {"_id": 0})
    return config

async def send_otp_email(to_email: str, otp_code: str):
    """Send OTP code via email using SMTP"""
    config = await get_smtp_config()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured. Please configure SMTP settings."
        )
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'🔐 Your Admin Login Code: {otp_code}'
        msg['From'] = config['smtp_email']
        msg['To'] = to_email
        
        # Plain text version
        text = f"""
Your one-time login code is: {otp_code}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

- YourDomain Security
        """
        
        # HTML version
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Monaco', 'Consolas', monospace; background: #0a0a0a; color: #ffffff; padding: 40px; }}
        .container {{ max-width: 500px; margin: 0 auto; }}
        .header {{ color: #a78bfa; font-size: 12px; margin-bottom: 20px; }}
        .code {{ background: #1a1a2e; border: 1px solid #a78bfa; padding: 30px; text-align: center; margin: 20px 0; }}
        .otp {{ font-size: 36px; letter-spacing: 8px; color: #a78bfa; font-weight: bold; }}
        .footer {{ color: #666; font-size: 11px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">// admin_authentication.php</div>
        <h2 style="color: #fff;">$login_verification</h2>
        <p style="color: #888;">Your one-time login code:</p>
        <div class="code">
            <div class="otp">{otp_code}</div>
        </div>
        <p style="color: #888; font-size: 12px;">
            <span style="color: #a78bfa;">$expires_in</span> = "5 minutes";
        </p>
        <div class="footer">
            // If you didn't request this code, ignore this email.<br>
            // yourdomain.com security system
        </div>
    </div>
</body>
</html>
        """
        
        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        if config.get('use_tls', True):
            server = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(config['smtp_host'], config['smtp_port'])
        
        server.login(config['smtp_email'], config['smtp_password'])
        server.sendmail(config['smtp_email'], to_email, msg.as_string())
        server.quit()
        
        return True
    except Exception as e:
        print(f"Email error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to send email: {str(e)}"
        )


# ============ SMTP Configuration ============

@router.get("/smtp-config")
async def get_smtp_settings(admin: User = Depends(get_admin_user)):
    """Get SMTP configuration (password hidden)"""
    config = await db.smtp_config.find_one({}, {"_id": 0})
    if config:
        config['smtp_password'] = '********' if config.get('smtp_password') else ''
    return config or {}

@router.post("/smtp-config")
async def save_smtp_settings(config: SMTPConfig, admin: User = Depends(get_admin_user)):
    """Save SMTP configuration"""
    config_dict = config.model_dump()
    config_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.smtp_config.update_one(
        {},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"message": "SMTP configuration saved"}

@router.post("/smtp-test")
async def test_smtp_settings(admin: User = Depends(get_admin_user)):
    """Test SMTP configuration by sending a test email"""
    settings = await db.security_settings.find_one({}, {"_id": 0})
    admin_email = settings.get('admin_email', 'admin@example.com') if settings else 'admin@example.com'
    
    try:
        await send_otp_email(admin_email, "123456")
        return {"message": f"Test email sent to {admin_email}"}
    except HTTPException as e:
        raise e


# ============ Security Settings ============

@router.get("/settings")
async def get_security_settings(admin: User = Depends(get_admin_user)):
    """Get current security settings"""
    settings = await db.security_settings.find_one({}, {"_id": 0})
    if not settings:
        settings = {
            "email_otp_enabled": False,
            "totp_enabled": False,
            "passkey_enabled": False,
            "admin_email": "admin@example.com"
        }
    return settings

@router.put("/settings")
async def update_security_settings(settings: SecuritySettings, admin: User = Depends(get_admin_user)):
    """Update security settings"""
    settings_dict = settings.model_dump()
    settings_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.security_settings.update_one(
        {},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "Security settings updated"}


# ============ Email OTP ============

@router.post("/otp/send")
async def send_otp(request: Request):
    """Send OTP code to admin email - called during login flow"""
    body = await request.json()
    email = body.get('email')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    # Check if user exists and is admin
    user = await db.users.find_one({"email": email})
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Check if OTP is enabled
    settings = await db.security_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get('email_otp_enabled'):
        return {"required": False, "message": "OTP not enabled"}
    
    # Generate OTP
    otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    session_token = secrets.token_urlsafe(32)
    
    # Hash OTP code before storage for security
    otp_hash = hash_otp_code(otp_code, session_token)
    
    # Store OTP with expiration (hashed)
    await db.otp_codes.insert_one({
        "email": email,
        "otp_hash": otp_hash,  # Store hash, not plain code
        "session_token": session_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "used": False
    })
    
    # Send email (with plain code)
    admin_email = settings.get('admin_email', email)
    await send_otp_email(admin_email, otp_code)
    
    return {
        "required": True,
        "session_token": session_token,
        "message": f"OTP sent to {admin_email[:3]}***{admin_email[-10:]}"
    }

@router.post("/otp/verify")
async def verify_otp(data: OTPVerify):
    """Verify OTP code"""
    # Find OTP record
    otp_record = await db.otp_codes.find_one({
        "session_token": data.session_token,
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired session")
    
    # Check expiration
    expires_at = datetime.fromisoformat(otp_record['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Verify code using hash comparison
    if otp_record.get('otp_hash'):
        # New secure format - verify hash
        if not verify_otp_hash(data.otp_code, data.session_token, otp_record['otp_hash']):
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    elif otp_record.get('otp_code'):
        # Legacy format - direct comparison (for backwards compatibility)
        if otp_record['otp_code'] != data.otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP code")
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP record")
    
    # Mark as used
    await db.otp_codes.update_one(
        {"session_token": data.session_token},
        {"$set": {"used": True}}
    )
    
    return {"verified": True, "email": otp_record['email']}


# ============ TOTP (Authenticator App) ============

@router.get("/totp/setup")
async def setup_totp(admin: User = Depends(get_admin_user)):
    """Generate TOTP secret and QR code for setup"""
    # Generate secret
    secret = pyotp.random_base32()
    
    # Create TOTP URI
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=admin.email,
        issuer_name="YourDomain Admin"
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store temporary secret (encrypted, not enabled yet)
    encrypted_secret = encrypt_sensitive_data(secret)
    await db.totp_setup.update_one(
        {"user_id": admin.id},
        {"$set": {
            "secret_encrypted": encrypted_secret,
            "secret_plain": secret,  # Temp storage for verification only
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "uri": uri
    }

@router.post("/totp/enable")
async def enable_totp(data: TOTPSetup, admin: User = Depends(get_admin_user)):
    """Verify TOTP code and enable for account"""
    # Get pending setup
    setup = await db.totp_setup.find_one({"user_id": admin.id})
    if not setup:
        raise HTTPException(status_code=400, detail="No TOTP setup in progress")
    
    # Get plain secret for verification
    plain_secret = setup.get('secret_plain') or setup.get('secret')
    if not plain_secret:
        raise HTTPException(status_code=400, detail="Invalid setup state")
    
    # Verify code
    totp = pyotp.TOTP(plain_secret)
    if not totp.verify(data.totp_code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")
    
    # Encrypt secret for storage
    encrypted_secret = setup.get('secret_encrypted') or encrypt_sensitive_data(plain_secret)
    
    # Save encrypted secret to user
    await db.users.update_one(
        {"id": admin.id},
        {"$set": {
            "totp_secret": encrypted_secret,
            "totp_enabled": True
        }}
    )
    
    # Enable in security settings
    await db.security_settings.update_one(
        {},
        {"$set": {"totp_enabled": True}},
        upsert=True
    )
    
    # Clean up setup
    await db.totp_setup.delete_one({"user_id": admin.id})
    
    await log_audit(
        AuditAction.TOTP_ENABLED,
        user_id=admin.id,
        user_email=admin.email
    )
    
    return {"message": "TOTP enabled successfully"}

@router.post("/totp/verify")
async def verify_totp(request: Request):
    """Verify TOTP code during login"""
    body = await request.json()
    email = body.get('email')
    totp_code = body.get('totp_code')
    
    if not email or not totp_code:
        raise HTTPException(status_code=400, detail="Email and TOTP code required")
    
    user = await db.users.find_one({"email": email})
    if not user or not user.get('totp_secret'):
        raise HTTPException(status_code=400, detail="TOTP not configured for this user")
    
    # Decrypt TOTP secret if encrypted
    totp_secret = user['totp_secret']
    if totp_secret.startswith('gAAAAA'):  # Fernet encrypted format
        try:
            totp_secret = decrypt_sensitive_data(totp_secret)
        except Exception:
            pass  # Use as-is if decryption fails (legacy)
    
    totp = pyotp.TOTP(totp_secret)
    if not totp.verify(totp_code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")
    
    return {"verified": True}

@router.delete("/totp")
async def disable_totp(admin: User = Depends(get_admin_user)):
    """Disable TOTP for account"""
    await db.users.update_one(
        {"id": admin.id},
        {"$unset": {"totp_secret": "", "totp_enabled": ""}}
    )
    
    await db.security_settings.update_one(
        {},
        {"$set": {"totp_enabled": False}}
    )
    
    await log_audit(
        AuditAction.TOTP_DISABLED,
        user_id=admin.id,
        user_email=admin.email
    )
    
    return {"message": "TOTP disabled"}


# ============ Passkey / WebAuthn ============

# WebAuthn configuration defaults - can be overridden via admin panel
DEFAULT_RP_ID = 'localhost'
DEFAULT_RP_NAME = 'Portfolio Admin'
DEFAULT_ORIGIN = 'http://localhost:3000'

@router.get("/passkey/config")
async def get_passkey_config(admin: User = Depends(get_admin_user)):
    """Get passkey configuration"""
    config = await db.passkey_config.find_one({}, {"_id": 0})
    return config or {"rp_id": DEFAULT_RP_ID, "rp_name": DEFAULT_RP_NAME, "origin": DEFAULT_ORIGIN}

@router.put("/passkey/config")
async def update_passkey_config(request: Request, admin: User = Depends(get_admin_user)):
    """Update passkey configuration (domain settings)"""
    body = await request.json()
    
    config = {
        "rp_id": body.get('rp_id', DEFAULT_RP_ID),
        "rp_name": body.get('rp_name', DEFAULT_RP_NAME),
        "origin": body.get('origin', DEFAULT_ORIGIN),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.passkey_config.update_one({}, {"$set": config}, upsert=True)
    return {"message": "Passkey configuration updated"}

@router.get("/passkey/register-options")
async def get_passkey_registration_options(admin: User = Depends(get_admin_user)):
    """Generate WebAuthn registration options"""
    config = await db.passkey_config.find_one({}, {"_id": 0})
    rp_id = config.get('rp_id', DEFAULT_RP_ID) if config else DEFAULT_RP_ID
    rp_name = config.get('rp_name', DEFAULT_RP_NAME) if config else DEFAULT_RP_NAME
    
    # Get existing credentials
    existing_creds = await db.passkey_credentials.find({"user_id": admin.id}).to_list(100)
    exclude_credentials = []
    for cred in existing_creds:
        exclude_credentials.append(
            PublicKeyCredentialDescriptor(id=base64.b64decode(cred['credential_id']))
        )
    
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=rp_name,
        user_id=admin.id.encode(),
        user_name=admin.email,
        user_display_name=admin.name,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED,  # Required for usernameless login
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ]
    )
    
    # Store challenge
    await db.webauthn_challenges.update_one(
        {"user_id": admin.id},
        {"$set": {
            "challenge": base64.b64encode(options.challenge).decode(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return json.loads(options_to_json(options))

@router.post("/passkey/register")
async def register_passkey(request: Request, admin: User = Depends(get_admin_user)):
    """Complete passkey registration"""
    body = await request.json()
    credential = body.get('credential')
    passkey_name = body.get('name', 'My Passkey')
    
    config = await db.passkey_config.find_one({}, {"_id": 0})
    rp_id = config.get('rp_id', DEFAULT_RP_ID) if config else DEFAULT_RP_ID
    origin = config.get('origin', DEFAULT_ORIGIN) if config else DEFAULT_ORIGIN
    
    # Get stored challenge
    challenge_doc = await db.webauthn_challenges.find_one({"user_id": admin.id})
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No registration in progress")
    
    expected_challenge = base64.b64decode(challenge_doc['challenge'])
    
    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
        )
        
        # Store credential - use the original credential ID from browser (base64url format)
        # This ensures consistency between registration and authentication
        credential_doc = {
            "id": str(uuid.uuid4()),
            "user_id": admin.id,
            "credential_id": credential.get('id'),  # Store as-is from browser (base64url)
            "public_key": base64.b64encode(verification.credential_public_key).decode(),
            "sign_count": verification.sign_count,
            "name": passkey_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used": None
        }
        
        await db.passkey_credentials.insert_one(credential_doc)
        
        # Enable passkey in settings
        await db.security_settings.update_one(
            {},
            {"$set": {"passkey_enabled": True}},
            upsert=True
        )
        
        # Clean up challenge
        await db.webauthn_challenges.delete_one({"user_id": admin.id})
        
        return {"message": "Passkey registered successfully", "id": credential_doc['id']}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.get("/passkey/list")
async def list_passkeys(admin: User = Depends(get_admin_user)):
    """List all registered passkeys"""
    passkeys = await db.passkey_credentials.find(
        {"user_id": admin.id},
        {"_id": 0, "public_key": 0}
    ).to_list(100)
    
    return passkeys

@router.delete("/passkey/{passkey_id}")
async def delete_passkey(passkey_id: str, admin: User = Depends(get_admin_user)):
    """Delete a passkey"""
    result = await db.passkey_credentials.delete_one({
        "id": passkey_id,
        "user_id": admin.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Passkey not found")
    
    # Check if any passkeys remain
    remaining = await db.passkey_credentials.count_documents({"user_id": admin.id})
    if remaining == 0:
        await db.security_settings.update_one(
            {},
            {"$set": {"passkey_enabled": False}}
        )
    
    return {"message": "Passkey deleted"}

@router.put("/passkey/{passkey_id}")
async def update_passkey(passkey_id: str, request: Request, admin: User = Depends(get_admin_user)):
    """Update passkey name"""
    body = await request.json()
    new_name = body.get('name')
    
    if not new_name or not new_name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    
    result = await db.passkey_credentials.update_one(
        {"id": passkey_id, "user_id": admin.id},
        {"$set": {"name": new_name.strip()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Passkey not found")
    
    return {"message": "Passkey updated"}


@router.post("/passkey/authenticate-options")
async def get_passkey_auth_options(request: Request):
    """Generate WebAuthn authentication options for discoverable credentials (no email needed)"""
    # Get real client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Rate limiting (persistent)
    is_allowed, _ = await check_rate_limit(
        identifier=client_ip,
        limit_type="passkey",
        max_attempts=PASSKEY_MAX_ATTEMPTS,
        window_seconds=PASSKEY_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {PASSKEY_WINDOW_SECONDS // 60} minutes."
        )
    
    config = await db.passkey_config.find_one({}, {"_id": 0})
    rp_id = config.get('rp_id', DEFAULT_RP_ID) if config else DEFAULT_RP_ID
    
    # Generate options WITHOUT allowCredentials - browser will discover passkeys
    options = generate_authentication_options(
        rp_id=rp_id,
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    
    # Store challenge with a temporary session ID and TTL
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=WEBAUTHN_CHALLENGE_TTL_SECONDS)
    await db.webauthn_challenges.update_one(
        {"session_id": session_id},
        {"$set": {
            "challenge": base64.b64encode(options.challenge).decode(),
            "type": "authentication",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat()
        }},
        upsert=True
    )
    
    response = json.loads(options_to_json(options))
    response['session_id'] = session_id  # Return session ID to client
    return response

@router.post("/passkey/authenticate")
async def authenticate_passkey(request: Request):
    """Verify passkey for authentication and return JWT token (usernameless)"""
    from auth import create_access_token, create_refresh_token
    
    # Get real client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Rate limiting (persistent)
    is_allowed, _ = await check_rate_limit(
        identifier=client_ip,
        limit_type="passkey",
        max_attempts=PASSKEY_MAX_ATTEMPTS,
        window_seconds=PASSKEY_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {PASSKEY_WINDOW_SECONDS // 60} minutes."
        )
    
    body = await request.json()
    credential = body.get('credential')
    session_id = body.get('session_id')
    
    if not credential or not session_id:
        await record_attempt(client_ip, "passkey")
        raise HTTPException(status_code=400, detail="Credential and session_id required")
    
    config = await db.passkey_config.find_one({}, {"_id": 0})
    rp_id = config.get('rp_id', DEFAULT_RP_ID) if config else DEFAULT_RP_ID
    origin = config.get('origin', DEFAULT_ORIGIN) if config else DEFAULT_ORIGIN
    
    # Get challenge using session_id
    challenge_doc = await db.webauthn_challenges.find_one({"session_id": session_id})
    if not challenge_doc:
        await record_attempt(client_ip, "passkey")
        raise HTTPException(status_code=400, detail="No authentication in progress")
    
    # Check if challenge has expired
    if challenge_doc.get('expires_at'):
        expires_at = datetime.fromisoformat(challenge_doc['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            await db.webauthn_challenges.delete_one({"session_id": session_id})
            await record_attempt(client_ip, "passkey")
            raise HTTPException(status_code=400, detail="Authentication challenge expired")
    
    expected_challenge = base64.b64decode(challenge_doc['challenge'])
    
    # Find credential by credential_id
    credential_id = credential.get('id')
    stored_cred = await db.passkey_credentials.find_one({"credential_id": credential_id})
    
    if not stored_cred:
        await record_attempt(client_ip, "passkey")
        raise HTTPException(status_code=400, detail="Passkey not found")
    
    # Get user from stored credential
    user = await db.users.find_one({"id": stored_cred['user_id']})
    if not user:
        await record_attempt(client_ip, "passkey")
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=rp_id,
            expected_origin=origin,
            credential_public_key=base64.b64decode(stored_cred['public_key']),
            credential_current_sign_count=stored_cred['sign_count'],
        )
        
        # Clear rate limit on success
        await record_attempt(client_ip, "passkey", success=True)
        
        # Update sign count and last used
        await db.passkey_credentials.update_one(
            {"id": stored_cred['id']},
            {"$set": {
                "sign_count": verification.new_sign_count,
                "last_used": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Clean up challenge
        await db.webauthn_challenges.delete_one({"session_id": session_id})
        
        # Generate JWT tokens for the user (passwordless login)
        access_token = create_access_token(data={"sub": user["email"]})
        refresh_token = create_refresh_token(data={"sub": user["email"]})
        
        await log_audit(
            AuditAction.LOGIN_SUCCESS,
            user_id=user.get("id"),
            user_email=user["email"],
            ip_address=client_ip,
            details={"method": "passkey"}
        )
        
        return {
            "verified": True, 
            "email": user["email"],
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    except Exception as e:
        await record_attempt(client_ip, "passkey")
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


# ============ Check MFA Requirements ============

@router.post("/mfa/check")
async def check_mfa_requirements(request: Request):
    """Check what MFA methods are required/available for a user"""
    body = await request.json()
    email = body.get('email')
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    user = await db.users.find_one({"email": email})
    if not user:
        return {"mfa_required": False}
    
    settings = await db.security_settings.find_one({}, {"_id": 0})
    if not settings:
        return {"mfa_required": False}
    
    # Check what's enabled
    has_passkeys = await db.passkey_credentials.count_documents({"user_id": user['id']}) > 0
    has_totp = user.get('totp_enabled', False)
    
    return {
        "mfa_required": settings.get('email_otp_enabled') or settings.get('totp_enabled') or settings.get('passkey_enabled'),
        "email_otp_enabled": settings.get('email_otp_enabled', False),
        "totp_enabled": has_totp,
        "passkey_enabled": has_passkeys,
        "available_methods": {
            "email_otp": settings.get('email_otp_enabled', False),
            "totp": has_totp,
            "passkey": has_passkeys
        }
    }


# ============ Cleanup Endpoints ============

@router.post("/cleanup/challenges")
async def cleanup_expired_challenges(admin: User = Depends(get_admin_user)):
    """Clean up expired WebAuthn challenges and OTP codes"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Clean up expired WebAuthn challenges
    challenge_result = await db.webauthn_challenges.delete_many({
        "expires_at": {"$lt": now}
    })
    
    # Clean up expired OTP codes
    otp_result = await db.otp_codes.delete_many({
        "expires_at": {"$lt": now}
    })
    
    # Clean up old rate limit records (older than 1 hour)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    rate_limit_result = await db.rate_limits.delete_many({
        "timestamp": {"$lt": cutoff}
    })
    
    return {
        "message": "Cleanup completed",
        "challenges_deleted": challenge_result.deleted_count,
        "otp_codes_deleted": otp_result.deleted_count,
        "rate_limits_deleted": rate_limit_result.deleted_count
    }


# ============ Audit Log Endpoint ============

@router.get("/audit-logs")
async def get_audit_logs_endpoint(
    limit: int = 100,
    action_prefix: str = None,
    admin: User = Depends(get_admin_user)
):
    """Get audit logs for admin review"""
    from utils import get_audit_logs as fetch_audit_logs
    
    logs = await fetch_audit_logs(
        action_prefix=action_prefix,
        limit=limit
    )
    
    return logs


# ============ Password Change ============

@router.post("/change-password")
async def change_password(data: PasswordChange, request: Request, admin: User = Depends(get_admin_user)):
    """Change admin password with strong validation"""
    # Get client IP for audit
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Get current user from database
    user = await db.users.find_one({"id": admin.id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(data.current_password, user['hashed_password']):
        await log_audit(
            AuditAction.PASSWORD_CHANGED,
            user_id=admin.id,
            user_email=admin.email,
            ip_address=client_ip,
            details={"reason": "wrong_current_password"},
            success=False
        )
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Ensure new password is different from current
    if verify_password(data.new_password, user['hashed_password']):
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Hash and save new password
    new_hash = get_password_hash(data.new_password)
    await db.users.update_one(
        {"id": admin.id},
        {"$set": {"hashed_password": new_hash}}
    )
    
    await log_audit(
        AuditAction.PASSWORD_CHANGED,
        user_id=admin.id,
        user_email=admin.email,
        ip_address=client_ip
    )
    
    return {"message": "Password changed successfully"}