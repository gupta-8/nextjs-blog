"""
Cryptographic utilities for sensitive data encryption
Used for encrypting TOTP secrets and other sensitive stored data
"""
import os
import hashlib
import secrets
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

# Encryption key derived from JWT secret
_fernet = None


def _get_fernet():
    """Get or create Fernet instance for encryption."""
    global _fernet
    
    if _fernet is None:
        # Use JWT secret as base for encryption key
        jwt_secret = os.environ.get('JWT_SECRET_KEY', os.environ.get('JWT_SECRET', ''))
        
        if not jwt_secret or jwt_secret == 'change-this-in-production-immediately':
            raise ValueError("JWT_SECRET_KEY must be set for encryption")
        
        # Use a per-deployment salt from environment variable
        encryption_salt = os.environ.get('ENCRYPTION_SALT', '')
        if not encryption_salt:
            logger.warning(
                "ENCRYPTION_SALT is not set. Falling back to legacy static salt. "
                "Set ENCRYPTION_SALT in your environment for improved security. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
            # Legacy fallback to maintain backward compatibility with existing encrypted data
            salt = b'your_domain_security_salt_v1'
        else:
            salt = encryption_salt.encode('utf-8')
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(jwt_secret.encode()))
        _fernet = Fernet(key)
    
    return _fernet


def encrypt_sensitive_data(plaintext: str) -> str:
    """
    Encrypt sensitive data like TOTP secrets.
    
    Args:
        plaintext: Data to encrypt
    
    Returns:
        Base64-encoded encrypted data
    """
    try:
        fernet = _get_fernet()
        encrypted = fernet.encrypt(plaintext.encode())
        return encrypted.decode()
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        raise ValueError("Encryption failed")


def decrypt_sensitive_data(ciphertext: str) -> str:
    """
    Decrypt sensitive data.
    
    Args:
        ciphertext: Base64-encoded encrypted data
    
    Returns:
        Decrypted plaintext
    """
    try:
        fernet = _get_fernet()
        decrypted = fernet.decrypt(ciphertext.encode())
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        raise ValueError("Decryption failed")


def hash_otp_code(otp_code: str, session_token: str) -> str:
    """
    Hash OTP code for secure storage.
    Uses session token as salt to prevent rainbow table attacks.
    """
    salted = f"{session_token}:{otp_code}"
    return hashlib.sha256(salted.encode()).hexdigest()


def verify_otp_hash(otp_code: str, session_token: str, stored_hash: str) -> bool:
    """
    Verify OTP code against stored hash.
    """
    computed_hash = hash_otp_code(otp_code, session_token)
    return secrets.compare_digest(computed_hash, stored_hash)


def hash_ip_address(ip_address: str) -> str:
    """
    Hash IP address for privacy-preserving storage.
    """
    from datetime import datetime
    daily_salt = datetime.now().strftime('%Y-%m-%d')
    salted = f"{daily_salt}:{ip_address}"
    return hashlib.sha256(salted.encode()).hexdigest()[:16]


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    
    special_chars = set('!@#$%^&*()_+-=[]{}|;:,.<>?/~`')
    if not any(c in special_chars for c in password):
        return False, "Password must contain at least one special character (!@#$%^&*...)"
    
    common_patterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
    lower_password = password.lower()
    for pattern in common_patterns:
        if pattern in lower_password:
            return False, f"Password contains common weak pattern: {pattern}"
    
    return True, ""
