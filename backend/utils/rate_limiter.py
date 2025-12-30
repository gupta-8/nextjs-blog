"""
Persistent Rate Limiter using MongoDB
Replaces in-memory rate limiting for scalability and persistence across restarts
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Database reference - set by main server
db = None

def set_db(database):
    global db
    db = database


async def cleanup_old_attempts():
    """Remove expired rate limit records (run periodically)"""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        await db.rate_limits.delete_many({"timestamp": {"$lt": cutoff.isoformat()}})
    except Exception as e:
        logger.warning(f"Rate limit cleanup error: {e}")


async def check_rate_limit(
    identifier: str,
    limit_type: str,
    max_attempts: int,
    window_seconds: int
) -> tuple[bool, int]:
    """
    Check if rate limit exceeded for given identifier.
    
    Args:
        identifier: IP address or email or other unique identifier
        limit_type: Type of limit (login, totp, contact, passkey)
        max_attempts: Maximum attempts allowed in window
        window_seconds: Time window in seconds
    
    Returns:
        tuple: (is_allowed: bool, remaining_attempts: int)
    """
    if db is None:
        logger.warning("Rate limiter DB not initialized")
        return True, max_attempts  # Fail open if DB not ready
    
    current_time = datetime.now(timezone.utc)
    window_start = current_time - timedelta(seconds=window_seconds)
    
    try:
        # Count recent attempts
        count = await db.rate_limits.count_documents({
            "identifier": identifier,
            "type": limit_type,
            "timestamp": {"$gte": window_start.isoformat()}
        })
        
        remaining = max(0, max_attempts - count)
        is_allowed = count < max_attempts
        
        return is_allowed, remaining
    except Exception as e:
        logger.error(f"Rate limit check error: {e}")
        return True, max_attempts  # Fail open on error


async def record_attempt(
    identifier: str,
    limit_type: str,
    success: bool = False
):
    """
    Record an attempt for rate limiting.
    
    Args:
        identifier: IP address or email
        limit_type: Type of limit
        success: If True, clear all attempts for this identifier/type
    """
    if db is None:
        return
    
    try:
        if success:
            # Clear attempts on successful action
            await db.rate_limits.delete_many({
                "identifier": identifier,
                "type": limit_type
            })
        else:
            # Record failed attempt
            await db.rate_limits.insert_one({
                "identifier": identifier,
                "type": limit_type,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
    except Exception as e:
        logger.error(f"Rate limit record error: {e}")


async def check_account_lockout(
    email: str,
    max_failures: int = 10,
    lockout_minutes: int = 30
) -> tuple[bool, Optional[datetime]]:
    """
    Check if account is locked due to too many failed attempts.
    
    Returns:
        tuple: (is_locked: bool, unlock_time: Optional[datetime])
    """
    if db is None:
        return False, None
    
    try:
        lockout = await db.account_lockouts.find_one({"email": email})
        
        if lockout:
            unlock_time = datetime.fromisoformat(lockout["unlock_at"])
            if datetime.now(timezone.utc) < unlock_time:
                return True, unlock_time
            else:
                # Lockout expired, remove it
                await db.account_lockouts.delete_one({"email": email})
        
        return False, None
    except Exception as e:
        logger.error(f"Account lockout check error: {e}")
        return False, None


async def increment_failure_count(email: str, max_failures: int = 10, lockout_minutes: int = 30):
    """
    Increment failure count and lock account if threshold reached.
    """
    if db is None:
        return
    
    try:
        # Get or create failure record
        record = await db.login_failures.find_one({"email": email})
        
        if record:
            new_count = record.get("count", 0) + 1
            await db.login_failures.update_one(
                {"email": email},
                {"$set": {"count": new_count, "last_attempt": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            new_count = 1
            await db.login_failures.insert_one({
                "email": email,
                "count": new_count,
                "last_attempt": datetime.now(timezone.utc).isoformat()
            })
        
        # Lock account if threshold reached
        if new_count >= max_failures:
            unlock_time = datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes)
            await db.account_lockouts.update_one(
                {"email": email},
                {"$set": {
                    "email": email,
                    "unlock_at": unlock_time.isoformat(),
                    "locked_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            # Reset failure count
            await db.login_failures.delete_one({"email": email})
    except Exception as e:
        logger.error(f"Failure count increment error: {e}")


async def clear_failure_count(email: str):
    """Clear failure count on successful login."""
    if db is None:
        return
    
    try:
        await db.login_failures.delete_one({"email": email})
    except Exception as e:
        logger.error(f"Clear failure count error: {e}")
