from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import time
import shutil
import httpx
import bleach

# Import security utilities
from utils import (
    set_rate_limiter_db, set_audit_db,
    check_rate_limit, record_attempt,
    log_audit, AuditAction,
    hash_ip_address
)

# Import storage module for file uploads
from storage import get_storage


ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = Path("/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGODB_URI']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Rate limiting constants (now using persistent MongoDB storage)
CONTACT_MAX_ATTEMPTS = 5
CONTACT_WINDOW_SECONDS = 3600  # 1 hour

# Public API rate limits (to prevent scraping/abuse)
PUBLIC_API_MAX_REQUESTS = 100  # requests per window
PUBLIC_API_WINDOW_SECONDS = 60  # 1 minute window

# In-memory cache for frequently accessed data
from functools import lru_cache
from datetime import datetime, timedelta
import gzip
from starlette.responses import Response
from typing import Dict, Any
import json
import hashlib

# Simple in-memory cache with TTL
class SimpleCache:
    def __init__(self):
        self._cache: Dict[str, tuple[Any, datetime]] = {}
    
    def get(self, key: str, ttl_seconds: int = 60):
        if key in self._cache:
            value, timestamp = self._cache[key]
            if datetime.now(timezone.utc) - timestamp < timedelta(seconds=ttl_seconds):
                return value
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self._cache[key] = (value, datetime.now(timezone.utc))
    
    def invalidate(self, pattern: str = None):
        if pattern:
            keys_to_delete = [k for k in self._cache if pattern in k]
            for k in keys_to_delete:
                del self._cache[k]
        else:
            self._cache.clear()

cache = SimpleCache()

# Security middleware for headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # HSTS - enforce HTTPS for 1 year, include subdomains
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        # CSP - adjust as needed for your frontend
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
        # Prevent MIME type sniffing
        response.headers["X-Download-Options"] = "noopen"
        # DNS prefetch control
        response.headers["X-DNS-Prefetch-Control"] = "off"
        
        # Set secure cookie defaults for any cookies set by the application
        # This ensures any cookies use SameSite=Strict and Secure flags
        if "set-cookie" in response.headers:
            cookies = response.headers.getlist("set-cookie")
            new_cookies = []
            for cookie in cookies:
                # Add SameSite=Strict if not already set
                if "SameSite" not in cookie:
                    cookie += "; SameSite=Strict"
                # Add Secure flag if not already set (for HTTPS)
                if "Secure" not in cookie:
                    cookie += "; Secure"
                # Add HttpOnly flag if not already set (for session cookies)
                if "HttpOnly" not in cookie:
                    cookie += "; HttpOnly"
                new_cookies.append(cookie)
            # Update headers with secured cookies
            del response.headers["set-cookie"]
            for cookie in new_cookies:
                response.headers.append("set-cookie", cookie)
        
        return response

# GZip compression middleware
class GZipMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Skip compression for small responses or non-compressible types
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return response
        
        # Only compress JSON and HTML responses
        content_type = response.headers.get("content-type", "")
        if not any(ct in content_type for ct in ["application/json", "text/html", "text/plain"]):
            return response
        
        return response

# Production mode - docs disabled for security
IS_PRODUCTION = True

# Create the main app - disable docs in production
app = FastAPI(
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json"
)

# Add compression middleware (use built-in)
from starlette.middleware.gzip import GZipMiddleware as StarletteGZip
app.add_middleware(StarletteGZip, minimum_size=500)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Mount static files for uploads at /api/uploads to work with ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Max file size for uploads (5GB)
MAX_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Profile Model
class SocialLinks(BaseModel):
    github: str = ""
    linkedin: str = ""
    twitter: str = ""
    dribbble: str = ""

class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    bio: str = ""
    location: str
    timezone: str
    philosophy: str
    motto: str
    email: str
    phone: str = ""
    social: SocialLinks

# About Model
class About(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bio: str
    highlights: List[str]
    experience: str
    projects_completed: str
    happy_clients: str

# Testimonial Model
class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: str
    content: str
    avatar: str

# Contact Message Model
class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    subject: Optional[str] = ""
    message: str
    budget: Optional[str] = ""
    timeline: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: str
    subject: Optional[str] = ""
    message: str
    budget: Optional[str] = ""
    timeline: Optional[str] = ""

# ============ API Routes ============

@api_router.get("/")
async def root():
    # Get name from profile
    profile = await db.profile.find_one({}, {"name": 1, "_id": 0})
    name = profile.get("name", "API") if profile else "API"
    
    return {
        "name": name,
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "profile": "/api/profile",
            "blogs": "/api/blogs"
        }
    }

# Health check endpoint
@api_router.get("/health")
async def health_check():
    try:
        # Check MongoDB connection
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        # Log full error internally but return generic message
        logging.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "error": "Database connection failed"}

# Visit tracking endpoints
@api_router.get("/visits")
async def get_visits():
    stats = await db.site_stats.find_one({"type": "visits"}, {"_id": 0})
    if not stats:
        return {"total": 0}
    return {"total": stats.get("total", 0)}

@api_router.post("/visits/track")
async def track_visit(request: Request):
    # Get visitor info
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Sanitize user agent to prevent log injection
    sanitized_user_agent = bleach.clean(user_agent[:500], tags=[], strip=True)
    
    # Update total visits
    await db.site_stats.update_one(
        {"type": "visits"},
        {"$inc": {"total": 1}},
        upsert=True
    )
    
    # Log individual visit with hashed IP for privacy (GDPR compliance)
    visit_log = {
        "id": str(uuid.uuid4()),
        "ip_hash": hash_ip_address(client_ip),  # Privacy-preserving hash
        "user_agent": sanitized_user_agent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "path": request.headers.get("referer", "/")
    }
    await db.visit_logs.insert_one(visit_log)
    
    return {"success": True}

# Status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Upload endpoint - requires authentication
from routes.auth_routes import get_admin_user

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin = Depends(get_admin_user)):
    """Upload a file and return the URL (admin only)"""
    # Read file contents
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks
    contents = b""
    
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        file_size += len(chunk)
        contents += chunk
        if file_size > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024*1024)}GB")
    
    # Upload using storage module
    storage = get_storage()
    try:
        result = await storage.upload(
            content=contents,
            filename=file.filename or "unnamed",
            content_type=file.content_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


# Chunked upload models
class ChunkUploadInit(BaseModel):
    filename: str
    total_size: int
    total_chunks: int
    content_type: Optional[str] = "application/octet-stream"

class ChunkUploadComplete(BaseModel):
    upload_id: str

# In-memory storage for chunked uploads (in production, use Redis or DB)
chunked_uploads = {}

@api_router.post("/upload/chunked/init")
async def init_chunked_upload(data: ChunkUploadInit, admin = Depends(get_admin_user)):
    """Initialize a chunked upload session"""
    import re
    
    # Generate unique upload ID
    upload_id = str(uuid.uuid4())
    
    # Sanitize filename
    original_filename = data.filename or "unnamed"
    file_ext = original_filename.split(".")[-1].lower() if "." in original_filename else ""
    base_name = ".".join(original_filename.split(".")[:-1]) if "." in original_filename else original_filename
    base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)
    if not base_name:
        base_name = "file"
    
    # Create temp directory for chunks
    temp_dir = UPLOAD_DIR / "temp" / upload_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    # Store upload session info
    chunked_uploads[upload_id] = {
        "filename": f"{base_name}.{file_ext}",
        "base_name": base_name,
        "file_ext": file_ext,
        "total_size": data.total_size,
        "total_chunks": data.total_chunks,
        "content_type": data.content_type,
        "received_chunks": set(),
        "temp_dir": str(temp_dir),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    return {
        "upload_id": upload_id,
        "message": "Upload session initialized"
    }

@api_router.get("/upload/chunked/{upload_id}/status")
async def get_chunked_upload_status(upload_id: str, admin = Depends(get_admin_user)):
    """Get status of a chunked upload - which chunks have been received"""
    if upload_id not in chunked_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    session = chunked_uploads[upload_id]
    return {
        "upload_id": upload_id,
        "filename": session["filename"],
        "total_chunks": session["total_chunks"],
        "received_chunks": sorted(list(session["received_chunks"])),
        "missing_chunks": [i for i in range(session["total_chunks"]) if i not in session["received_chunks"]]
    }

@api_router.post("/upload/chunked/{upload_id}/complete")
async def complete_chunked_upload(upload_id: str, admin = Depends(get_admin_user)):
    """Complete chunked upload - merge all chunks into final file"""
    if upload_id not in chunked_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    session = chunked_uploads[upload_id]
    
    # Check all chunks received
    missing = [i for i in range(session["total_chunks"]) if i not in session["received_chunks"]]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing chunks: {missing}")
    
    temp_dir = Path(session["temp_dir"])
    
    # Generate final filename
    final_filename = session["filename"]
    file_path = UPLOAD_DIR / final_filename
    
    # Handle duplicates
    counter = 1
    base_name = session["base_name"]
    file_ext = session["file_ext"]
    while file_path.exists():
        final_filename = f"{base_name}_{counter}.{file_ext}"
        file_path = UPLOAD_DIR / final_filename
        counter += 1
    
    # Merge chunks
    try:
        with open(file_path, "wb") as final_file:
            for i in range(session["total_chunks"]):
                chunk_path = temp_dir / f"chunk_{i}"
                with open(chunk_path, "rb") as chunk_file:
                    final_file.write(chunk_file.read())
        
        # Clean up temp files
        shutil.rmtree(temp_dir)
        del chunked_uploads[upload_id]
        
        # Determine if image
        image_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        is_image = session["content_type"] in image_types
        
        return {
            "url": f"/api/uploads/{final_filename}",
            "filename": final_filename,
            "is_image": is_image,
            "size": os.path.getsize(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to merge chunks: {str(e)}")

@api_router.delete("/upload/chunked/{upload_id}/cancel")
async def cancel_chunked_upload(upload_id: str, admin = Depends(get_admin_user)):
    """Cancel and clean up a chunked upload"""
    if upload_id not in chunked_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    session = chunked_uploads[upload_id]
    temp_dir = Path(session["temp_dir"])
    
    # Clean up temp files
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    del chunked_uploads[upload_id]
    
    return {"message": "Upload cancelled"}

# Upload chunk endpoint - must be LAST due to path pattern matching
@api_router.post("/upload/chunked/{upload_id}/chunk/{chunk_index}")
async def upload_chunk(
    upload_id: str, 
    chunk_index: int, 
    file: UploadFile = File(...), 
    admin = Depends(get_admin_user)
):
    """Upload a single chunk"""
    if upload_id not in chunked_uploads:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    session = chunked_uploads[upload_id]
    
    if chunk_index < 0 or chunk_index >= session["total_chunks"]:
        raise HTTPException(status_code=400, detail="Invalid chunk index")
    
    # Save chunk to temp file
    temp_dir = Path(session["temp_dir"])
    chunk_path = temp_dir / f"chunk_{chunk_index}"
    
    contents = await file.read()
    with open(chunk_path, "wb") as f:
        f.write(contents)
    
    # Mark chunk as received
    session["received_chunks"].add(chunk_index)
    
    return {
        "chunk_index": chunk_index,
        "received": len(session["received_chunks"]),
        "total": session["total_chunks"]
    }


# Download file from remote URL (admin only)
class RemoteUrlRequest(BaseModel):
    url: str

@api_router.post("/upload/from-url")
async def upload_from_url(request: RemoteUrlRequest, admin = Depends(get_admin_user)):
    """Download a file from a remote URL and save it (admin only)"""
    import re
    import ipaddress
    import socket
    from urllib.parse import urlparse, unquote
    
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    # Validate URL format
    parsed = urlparse(url)
    if parsed.scheme not in ['http', 'https']:
        raise HTTPException(status_code=400, detail="Invalid URL scheme. Only HTTP and HTTPS are allowed.")
    
    # SSRF Protection: Block internal/private network addresses
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid URL: no hostname")
    
    # Block localhost and common internal hostnames
    blocked_hostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal', '169.254.169.254']
    if hostname.lower() in blocked_hostnames or hostname.lower().endswith('.local') or hostname.lower().endswith('.internal'):
        raise HTTPException(status_code=400, detail="Access to internal addresses is not allowed")
    
    try:
        # Resolve hostname and check if IP is private/internal
        resolved_ips = socket.getaddrinfo(hostname, None)
        for family, type, proto, canonname, sockaddr in resolved_ips:
            ip = sockaddr[0]
            try:
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local:
                    raise HTTPException(status_code=400, detail="Access to internal addresses is not allowed")
            except ValueError:
                pass  # Not a valid IP, skip check
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve hostname")
    
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Check content length
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024*1024)}GB")
            
            content = response.content
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024*1024)}GB")
            
            # Determine filename from URL or content-disposition
            filename = None
            content_disposition = response.headers.get('content-disposition')
            if content_disposition and 'filename=' in content_disposition:
                # Extract filename from content-disposition header
                match = re.search(r'filename="?([^";\n]+)"?', content_disposition)
                if match:
                    filename = match.group(1)
            
            if not filename:
                # Get filename from URL path
                path = unquote(parsed.path)
                filename = path.split('/')[-1] if '/' in path else 'downloaded_file'
            
            # Get extension from filename or content-type
            content_type = response.headers.get('content-type', '').split(';')[0].strip()
            
            if '.' in filename:
                base_name = '.'.join(filename.split('.')[:-1])
                file_ext = filename.split('.')[-1].lower()
            else:
                base_name = filename
                # Guess extension from content type
                ext_map = {
                    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
                    'application/pdf': 'pdf', 'application/zip': 'zip', 'text/plain': 'txt',
                    'text/html': 'html', 'text/css': 'css', 'application/javascript': 'js',
                    'application/json': 'json', 'image/svg+xml': 'svg'
                }
                file_ext = ext_map.get(content_type, 'bin')
            
            # Use storage module to upload the downloaded file
            storage = get_storage()
            full_filename = f"{filename}.{file_ext}" if file_ext and '.' not in filename else filename
            result = await storage.upload(
                content=content,
                filename=full_filename,
                content_type=content_type
            )
            
            return result
            
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to download: HTTP {e.response.status_code}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Download timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

# List all uploaded files (admin only)
@api_router.get("/admin/files")
async def list_files(images_only: bool = False, admin = Depends(get_admin_user)):
    """List all uploaded files with metadata. Set images_only=true to filter images."""
    storage = get_storage()
    try:
        files = await storage.list_files(images_only=images_only)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

# Delete uploaded file (admin only)
@api_router.delete("/admin/files/{filename}")
async def delete_file(filename: str, admin = Depends(get_admin_user)):
    """Delete an uploaded file."""
    storage = get_storage()
    try:
        # Try to delete - filename can be the filename or full blob URL
        success = await storage.delete(filename)
        if success:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

# Profile endpoint
@api_router.get("/profile")
async def get_profile():
    profile = await db.profile.find_one({}, {"_id": 0, "phone": 0, "timezone": 0})
    if not profile:
        # Return default profile data
        return {
            "id": "1",
            "name": "Name",
            "role": "Role",
            "bio": "Bio",
            "location": "",
            "philosophy": "",
            "motto": "",
            "email": "",
            "social": {
                "github": "",
                "linkedin": "",
                "twitter": "",
                "dribbble": ""
            }
        }
    # Remove phone and timezone if they exist in the fetched profile
    profile.pop("phone", None)
    profile.pop("timezone", None)
    return profile

# Update Profile endpoint (Admin)
@api_router.put("/admin/profile")
async def update_profile(profile_data: dict, admin = Depends(get_admin_user)):
    # Update or insert profile (only keep one profile document)
    await db.profile.update_one(
        {},  # Match any document (there should only be one profile)
        {"$set": profile_data},
        upsert=True
    )
    
    return {"message": "Profile updated successfully"}

# About endpoint
@api_router.get("/about")
async def get_about():
    about = await db.about.find_one({}, {"_id": 0})
    if not about:
        return {
            "id": "1",
            "bio": "I'm a passionate PHP & WordPress specialist based in Raipur, India. With years of experience in crafting elegant web solutions, I transform complex problems into simple, beautiful, and intuitive designs.",
            "highlights": [
                "PHP Expert with 5+ years experience",
                "WordPress Theme & Plugin Development",
                "Full-Stack Web Development",
                "Performance Optimization Specialist"
            ],
            "experience": "5+",
            "projects_completed": "100+",
            "happy_clients": "50+"
        }
    return about

# Testimonials endpoint
@api_router.get("/testimonials", response_model=List[dict])
async def get_testimonials():
    testimonials = await db.testimonials.find({}, {"_id": 0}).to_list(100)
    if not testimonials:
        return [
            {"id": "1", "name": "Sarah Johnson", "role": "CEO, TechStart Inc.", "content": "The developer delivered exceptional work on our e-commerce platform. His attention to detail and commitment to performance optimization exceeded our expectations.", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"},
            {"id": "2", "name": "Michael Chen", "role": "Product Manager, DigitalWave", "content": "Working with the developer was a pleasure. He understood our requirements perfectly and delivered a scalable WordPress solution that handles millions of visitors.", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"},
            {"id": "3", "name": "Emily Rodriguez", "role": "Founder, LearnHub", "content": "The LMS built for us transformed our business. His expertise in WordPress and custom PHP development is truly impressive.", "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"}
        ]
    return testimonials

# Contact message endpoint with rate limiting
@api_router.post("/contact", response_model=ContactMessage)
async def submit_contact(contact: ContactMessageCreate, request: Request):
    """Submit a contact message with persistent rate limiting"""
    # Get real client IP (handle proxies)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Rate limiting by IP (using persistent MongoDB storage)
    is_allowed, remaining = await check_rate_limit(
        identifier=client_ip,
        limit_type="contact",
        max_attempts=CONTACT_MAX_ATTEMPTS,
        window_seconds=CONTACT_WINDOW_SECONDS
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please try again later."
        )
    
    # Also rate limit by email to prevent spam to same address from different IPs
    sanitized_email = bleach.clean(contact.email, tags=[], strip=True)[:254]
    email_allowed, _ = await check_rate_limit(
        identifier=f"email:{sanitized_email}",
        limit_type="contact_email",
        max_attempts=3,  # Max 3 messages per email per hour
        window_seconds=CONTACT_WINDOW_SECONDS
    )
    
    if not email_allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many messages to this email. Please try again later."
        )
    
    # Record the attempt
    await record_attempt(client_ip, "contact")
    await record_attempt(f"email:{sanitized_email}", "contact_email")
    
    # Sanitize inputs
    sanitized_name = bleach.clean(contact.name, tags=[], strip=True)[:100]
    sanitized_subject = bleach.clean(contact.subject, tags=[], strip=True)[:200]
    sanitized_message = bleach.clean(contact.message, tags=[], strip=True)[:5000]
    
    contact_obj = ContactMessage(
        name=sanitized_name,
        email=sanitized_email,  # Now sanitized
        subject=sanitized_subject,
        message=sanitized_message,
        budget=contact.budget[:50] if contact.budget else "",
        timeline=contact.timeline[:50] if contact.timeline else ""
    )
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contact_messages.insert_one(doc)
    return contact_obj

@api_router.get("/contact/messages", response_model=List[dict])
async def get_contact_messages():
    messages = await db.contact_messages.find({}, {"_id": 0}).to_list(100)
    return messages


# ============ Public Page Content ============
@api_router.get("/content/{page}")
async def get_public_page_content(page: str):
    """Get public page content"""
    content = await db.page_content.find_one({"page": page}, {"_id": 0})
    if not content:
        return {"page": page, "content": {}}
    return content


# ============ Public Blog Routes ============
@api_router.get("/blogs")
async def get_blogs(featured: bool = None, limit: int = 10, request: Request = None):
    """Get published blog posts with caching and rate limiting"""
    # Rate limit public API access
    client_ip = request.headers.get("X-Forwarded-For", request.client.host) if request else "unknown"
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    is_allowed, remaining = await check_rate_limit(
        identifier=client_ip,
        limit_type="public_api",
        max_attempts=PUBLIC_API_MAX_REQUESTS,
        window_seconds=PUBLIC_API_WINDOW_SECONDS
    )
    if not is_allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    
    # Create cache key
    cache_key = f"blogs:featured={featured}:limit={limit}"
    
    # Check cache (60 second TTL)
    cached = cache.get(cache_key, ttl_seconds=60)
    if cached:
        return cached
    
    query = {"is_published": True}
    if featured is not None:
        query["is_featured"] = featured
    
    blogs = await db.blogs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # Cache result
    cache.set(cache_key, blogs)
    return blogs


@api_router.get("/blogs/{slug}")
async def get_blog_by_slug(slug: str, preview: bool = False, request: Request = None):
    """Get a single blog post by slug with caching and rate limiting. Use preview=true for draft posts (admin only)."""
    # Rate limit public API access (skip for preview/admin)
    if not preview and request:
        client_ip = request.headers.get("X-Forwarded-For", request.client.host)
        if client_ip and "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        is_allowed, remaining = await check_rate_limit(
            identifier=client_ip,
            limit_type="public_api",
            max_attempts=PUBLIC_API_MAX_REQUESTS,
            window_seconds=PUBLIC_API_WINDOW_SECONDS
        )
        if not is_allowed:
            raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    
    if preview:
        # For preview mode, allow fetching unpublished posts if user is authenticated admin
        from auth import decode_token
        auth_header = request.headers.get("Authorization") if request else None
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Authentication required for preview")
        
        token = auth_header.replace("Bearer ", "")
        try:
            token_data = decode_token(token)
            if not token_data:
                raise HTTPException(status_code=401, detail="Invalid token")
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Fetch the blog regardless of published status
        blog = await db.blogs.find_one({"slug": slug}, {"_id": 0})
        if not blog:
            raise HTTPException(status_code=404, detail="Blog not found")
        return blog
    
    # Check cache for public blog (5 minute TTL)
    cache_key = f"blog:{slug}"
    cached = cache.get(cache_key, ttl_seconds=300)
    if cached:
        # Still increment view count asynchronously
        await db.blogs.update_one({"slug": slug}, {"$inc": {"views": 1}})
        return cached
    
    # Normal public access - only published posts
    blog = await db.blogs.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Increment view count
    await db.blogs.update_one({"slug": slug}, {"$inc": {"views": 1}})
    
    # Cache result
    cache.set(cache_key, blog)
    
    return blog


@api_router.get("/blogs/{slug}/adjacent")
async def get_adjacent_blogs(slug: str):
    """Get previous and next blog posts"""
    current = await db.blogs.find_one({"slug": slug, "is_published": True}, {"created_at": 1})
    if not current:
        return {"previous": None, "next": None}
    
    # Get previous (older)
    prev_blog = await db.blogs.find_one(
        {"is_published": True, "created_at": {"$lt": current["created_at"]}},
        {"_id": 0, "title": 1, "slug": 1, "category": 1}
    )
    
    # Get next (newer)
    next_blog = await db.blogs.find_one(
        {"is_published": True, "created_at": {"$gt": current["created_at"]}},
        {"_id": 0, "title": 1, "slug": 1, "category": 1}
    )
    
    return {"previous": prev_blog, "next": next_blog}


@api_router.get("/blogs/{slug}/related")
async def get_related_blogs(slug: str, limit: int = 3):
    """Get related blog posts based on category and tags"""
    current = await db.blogs.find_one({"slug": slug}, {"category": 1, "tags": 1})
    if not current:
        return []
    
    # Find blogs with same category or overlapping tags
    related = await db.blogs.find(
        {
            "is_published": True,
            "slug": {"$ne": slug},
            "$or": [
                {"category": current.get("category")},
                {"tags": {"$in": current.get("tags", [])}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return related


@api_router.get("/blogs/categories/list")
async def get_blog_categories():
    """Get all blog categories"""
    blogs = await db.blogs.find({"is_published": True}, {"category": 1, "_id": 0}).to_list(1000)
    categories = list(set(b.get("category", "General") for b in blogs if b.get("category")))
    return categories


@api_router.get("/blogs/tags/list")
async def get_blog_tags():
    """Get all blog tags"""
    blogs = await db.blogs.find({"is_published": True}, {"tags": 1, "_id": 0}).to_list(1000)
    tags = []
    for b in blogs:
        tags.extend(b.get("tags", []))
    return list(set(tags))


@api_router.get("/blogs/category/{category}")
async def get_blogs_by_category(category: str, limit: int = 50):
    """Get published blog posts filtered by category"""
    blogs = await db.blogs.find(
        {"is_published": True, "category": category},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return blogs


@api_router.get("/blogs/tag/{tag}")
async def get_blogs_by_tag(tag: str, limit: int = 50):
    """Get published blog posts filtered by tag"""
    blogs = await db.blogs.find(
        {"is_published": True, "tags": tag},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return blogs


# ============ Public Comments Routes ============
from pydantic import BaseModel as PydanticBaseModel

class CommentCreate(PydanticBaseModel):
    blog_id: str
    author_name: str
    author_email: Optional[str] = None
    content: str
    parent_id: Optional[str] = None

@api_router.get("/comments/{blog_id}")
async def get_blog_comments(blog_id: str, request: Request = None):
    """Get all approved comments for a blog post with rate limiting"""
    # Rate limit public API access
    if request:
        client_ip = request.headers.get("X-Forwarded-For", request.client.host)
        if client_ip and "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        is_allowed, _ = await check_rate_limit(
            identifier=client_ip,
            limit_type="public_api",
            max_attempts=PUBLIC_API_MAX_REQUESTS,
            window_seconds=PUBLIC_API_WINDOW_SECONDS
        )
        if not is_allowed:
            raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    
    comments = await db.comments.find(
        {"blog_id": blog_id, "is_approved": True, "is_hidden": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return comments


@api_router.post("/comments")
async def create_comment(comment: CommentCreate, request: Request):
    """Create a new comment"""
    # Check if blog exists and has comments enabled
    blog = await db.blogs.find_one({"id": comment.blog_id})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    
    if not blog.get("comments_enabled", True):
        raise HTTPException(status_code=403, detail="Comments are disabled for this post")
    
    # Get client IP
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()
    
    # Rate limit comments per IP
    is_allowed, _ = await check_rate_limit(
        identifier=client_ip,
        limit_type="comment",
        max_attempts=10,  # Max 10 comments per 10 minutes per IP
        window_seconds=600
    )
    if not is_allowed:
        raise HTTPException(status_code=429, detail="Too many comments. Please wait before posting again.")
    
    await record_attempt(client_ip, "comment")
    
    # Sanitize user input to prevent XSS - WITH LENGTH LIMITS
    sanitized_content = bleach.clean(comment.content, tags=[], strip=True)[:5000]  # Max 5000 chars
    sanitized_author = bleach.clean(comment.author_name, tags=[], strip=True)[:100]  # Max 100 chars
    sanitized_email = bleach.clean(comment.author_email or "", tags=[], strip=True)[:254] if comment.author_email else None
    
    comment_doc = {
        "id": str(uuid.uuid4()),
        "blog_id": comment.blog_id,
        "author_name": sanitized_author,
        "author_email": sanitized_email,
        "content": sanitized_content,
        "parent_id": comment.parent_id,
        "likes": 0,
        "is_approved": False,  # Requires admin approval
        "is_hidden": False,
        "author_ip": client_ip,  # Store raw IP for admin moderation
        "author_ip_hash": hash_ip_address(client_ip),  # Privacy-preserving hash
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Return without _id, author_ip, and author_ip_hash (don't expose to frontend)
    if "_id" in comment_doc:
        del comment_doc["_id"]
    del comment_doc["author_ip_hash"]
    del comment_doc["author_ip"]
    return comment_doc


@api_router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str):
    """Like a comment"""
    result = await db.comments.update_one(
        {"id": comment_id},
        {"$inc": {"likes": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment liked"}


@api_router.post("/comments/{comment_id}/unlike")
async def unlike_comment(comment_id: str):
    """Unlike a comment"""
    # First get current likes to prevent going below 0
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    current_likes = comment.get("likes", 0)
    if current_likes > 0:
        await db.comments.update_one(
            {"id": comment_id},
            {"$inc": {"likes": -1}}
        )
    
    return {"message": "Comment unliked"}


@api_router.get("/comments/{blog_id}/count")
async def get_comment_count(blog_id: str):
    """Get comment count for a blog"""
    count = await db.comments.count_documents(
        {"blog_id": blog_id, "is_approved": True, "is_hidden": {"$ne": True}}
    )
    return {"count": count}


# Removed /my-ip endpoint - exposes client IP unnecessarily

# Removed public comment delete - only admins can delete comments now
# Public users cannot delete their own comments (prevents IP spoofing attacks)
# Admin deletion is handled in admin_routes.py


# Import and configure auth/admin/security routes
from routes import auth_routes, admin_routes, security_routes

# Set database for route modules
auth_routes.set_db(db)
admin_routes.set_db(db)
admin_routes.set_cache(cache)
security_routes.set_db(db)

# Initialize security utilities with database
set_rate_limiter_db(db)
set_audit_db(db)

# OG Meta Tags endpoint for social media crawlers
# Include all routers in the main app
app.include_router(api_router)
app.include_router(auth_routes.router, prefix="/api")
app.include_router(admin_routes.router, prefix="/api")
app.include_router(security_routes.router, prefix="/api")

# CORS configuration - use specific origins in production
# Set CORS_ORIGINS env var to comma-separated list of allowed origins
# Example: CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
cors_origins = os.environ.get('CORS_ORIGINS', '')
if cors_origins and cors_origins != '*':
    allowed_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
else:
    # SECURITY: CORS_ORIGINS must be set
    logging.error("CRITICAL: CORS_ORIGINS must be set!")
    allowed_origins = []  # Deny all if not configured

# Add CORS middleware BEFORE security headers (middleware order is reversed)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-Content-Type-Options", "X-Frame-Options", "X-XSS-Protection"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()