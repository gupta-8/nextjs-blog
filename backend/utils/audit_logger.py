"""
Audit Logger for Admin Actions
Logs all sensitive admin operations for security review and compliance
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Database reference - set by main server
db = None

def set_db(database):
    global db
    db = database


class AuditAction:
    """Constants for audit action types"""
    # Authentication
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILED = "auth.login.failed"
    LOGOUT = "auth.logout"
    PASSWORD_CHANGED = "auth.password.changed"
    TOTP_ENABLED = "auth.totp.enabled"
    TOTP_DISABLED = "auth.totp.disabled"
    PASSKEY_REGISTERED = "auth.passkey.registered"
    PASSKEY_DELETED = "auth.passkey.deleted"
    
    # Blog Management
    BLOG_CREATED = "blog.created"
    BLOG_UPDATED = "blog.updated"
    BLOG_DELETED = "blog.deleted"
    BLOG_PUBLISHED = "blog.published"
    BLOG_UNPUBLISHED = "blog.unpublished"
    
    # Comment Management
    COMMENT_APPROVED = "comment.approved"
    COMMENT_HIDDEN = "comment.hidden"
    COMMENT_DELETED = "comment.deleted"
    
    # File Management
    FILE_UPLOADED = "file.uploaded"
    FILE_DELETED = "file.deleted"
    
    # User/Profile
    PROFILE_UPDATED = "profile.updated"
    USER_CREATED = "user.created"
    
    # Security Settings
    SECURITY_SETTINGS_UPDATED = "security.settings.updated"
    SMTP_CONFIG_UPDATED = "security.smtp.updated"


async def log_audit(
    action: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
):
    """
    Log an audit event.
    
    Args:
        action: Action type from AuditAction constants
        user_id: ID of user performing action
        user_email: Email of user performing action
        ip_address: Client IP address
        resource_type: Type of resource affected (blog, comment, file, etc.)
        resource_id: ID of affected resource
        details: Additional details about the action
        success: Whether the action succeeded
    """
    if db is None:
        logger.warning("Audit logger DB not initialized")
        return
    
    try:
        audit_entry = {
            "action": action,
            "user_id": user_id,
            "user_email": user_email,
            "ip_address": ip_address,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "success": success,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.audit_logs.insert_one(audit_entry)
        
        # Also log to application logger for immediate visibility
        log_msg = f"AUDIT: {action} | user={user_email} | resource={resource_type}:{resource_id} | success={success}"
        if success:
            logger.info(log_msg)
        else:
            logger.warning(log_msg)
            
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")


async def get_audit_logs(
    user_id: Optional[str] = None,
    action_prefix: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100
) -> list:
    """
    Query audit logs with filters.
    """
    if db is None:
        return []
    
    try:
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if action_prefix:
            query["action"] = {"$regex": f"^{action_prefix}"}
        
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date.isoformat()
            if end_date:
                query["timestamp"]["$lte"] = end_date.isoformat()
        
        logs = await db.audit_logs.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).to_list(limit)
        
        return logs
    except Exception as e:
        logger.error(f"Failed to query audit logs: {e}")
        return []
