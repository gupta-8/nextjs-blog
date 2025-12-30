"""Vercel Blob Storage integration for file uploads.

This module provides file storage functionality using Vercel Blob.
When BLOB_READ_WRITE_TOKEN is not set, it falls back to local filesystem storage.
"""
import os
import httpx
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import mimetypes
import re

# Vercel Blob API endpoints
VERCEL_BLOB_API = "https://blob.vercel-storage.com"


class BlobStorage:
    """Storage class that supports both Vercel Blob and local filesystem."""
    
    def __init__(self):
        self.token = os.environ.get('BLOB_READ_WRITE_TOKEN')
        self.use_blob = bool(self.token)
        self.local_dir = Path('/uploads')
        
        # Ensure local directory exists for fallback
        if not self.use_blob:
            self.local_dir.mkdir(exist_ok=True)
    
    async def upload(self, content: bytes, filename: str, content_type: str = None) -> Dict[str, Any]:
        """Upload a file and return the URL and metadata.
        
        Args:
            content: File content as bytes
            filename: Original filename
            content_type: MIME type of the file
            
        Returns:
            Dict with 'url', 'filename', 'is_image', 'size'
        """
        # Sanitize filename
        file_ext = filename.split(".")[-1].lower() if "." in filename else ""
        base_name = ".".join(filename.split(".")[:-1]) if "." in filename else filename
        base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)
        if not base_name:
            base_name = "file"
        
        # Determine if it's an image
        image_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        is_image = content_type in image_types if content_type else False
        
        if self.use_blob:
            return await self._upload_to_blob(content, base_name, file_ext, content_type, is_image)
        else:
            return await self._upload_to_local(content, base_name, file_ext, content_type, is_image)
    
    async def _upload_to_blob(self, content: bytes, base_name: str, file_ext: str, 
                               content_type: str, is_image: bool) -> Dict[str, Any]:
        """Upload to Vercel Blob storage."""
        # Generate unique filename
        unique_id = str(uuid.uuid4())[:8]
        final_filename = f"{base_name}_{unique_id}.{file_ext}" if file_ext else f"{base_name}_{unique_id}"
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": content_type or "application/octet-stream",
                "x-content-type": content_type or "application/octet-stream",
            }
            
            # Upload to Vercel Blob
            response = await client.put(
                f"{VERCEL_BLOB_API}/{final_filename}",
                content=content,
                headers=headers,
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise Exception(f"Blob upload failed: {response.status_code} - {response.text}")
            
            blob_data = response.json()
            
            return {
                "url": blob_data.get("url"),
                "filename": final_filename,
                "is_image": is_image,
                "size": len(content),
                "blob_url": blob_data.get("url"),  # Full Vercel Blob URL
                "pathname": blob_data.get("pathname")
            }
    
    async def _upload_to_local(self, content: bytes, base_name: str, file_ext: str,
                                content_type: str, is_image: bool) -> Dict[str, Any]:
        """Upload to local filesystem (fallback for development)."""
        # Generate filename with collision handling
        final_filename = f"{base_name}.{file_ext}" if file_ext else base_name
        file_path = self.local_dir / final_filename
        
        counter = 1
        while file_path.exists():
            final_filename = f"{base_name}_{counter}.{file_ext}" if file_ext else f"{base_name}_{counter}"
            file_path = self.local_dir / final_filename
            counter += 1
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "url": f"/api/uploads/{final_filename}",
            "filename": final_filename,
            "is_image": is_image,
            "size": len(content)
        }
    
    async def delete(self, filename_or_url: str) -> bool:
        """Delete a file from storage.
        
        Args:
            filename_or_url: Either the filename or full blob URL
            
        Returns:
            True if deleted successfully
        """
        if self.use_blob:
            return await self._delete_from_blob(filename_or_url)
        else:
            return await self._delete_from_local(filename_or_url)
    
    async def _delete_from_blob(self, filename_or_url: str) -> bool:
        """Delete from Vercel Blob storage."""
        # If it's a full URL, use it directly; otherwise construct the URL
        if filename_or_url.startswith("http"):
            url_to_delete = filename_or_url
        else:
            # This is a filename, we need to get the full URL from our records
            # For now, we'll try to construct it
            url_to_delete = filename_or_url
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VERCEL_BLOB_API}/delete",
                json={"urls": [url_to_delete]},
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30.0
            )
            
            return response.status_code == 200
    
    async def _delete_from_local(self, filename: str) -> bool:
        """Delete from local filesystem."""
        # Extract filename if it's a URL path
        if filename.startswith("/api/uploads/"):
            filename = filename.replace("/api/uploads/", "")
        
        # Sanitize to prevent directory traversal
        safe_filename = filename.replace("/", "").replace("\\", "").replace("..", "")
        file_path = self.local_dir / safe_filename
        
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return True
        return False
    
    async def list_files(self, images_only: bool = False) -> List[Dict[str, Any]]:
        """List all uploaded files.
        
        Args:
            images_only: If True, only return image files
            
        Returns:
            List of file metadata dicts
        """
        if self.use_blob:
            return await self._list_blob_files(images_only)
        else:
            return await self._list_local_files(images_only)
    
    async def _list_blob_files(self, images_only: bool = False) -> List[Dict[str, Any]]:
        """List files from Vercel Blob storage."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{VERCEL_BLOB_API}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            blobs = data.get("blobs", [])
            
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
            files = []
            
            for blob in blobs:
                pathname = blob.get("pathname", "")
                ext = f".{pathname.split('.')[-1].lower()}" if '.' in pathname else ""
                is_image = ext in image_extensions
                
                if images_only and not is_image:
                    continue
                
                files.append({
                    "filename": pathname.split("/")[-1],
                    "url": blob.get("url"),
                    "size": blob.get("size", 0),
                    "uploaded_at": blob.get("uploadedAt"),
                    "is_image": is_image,
                    "blob_url": blob.get("url")  # Full URL for deletion
                })
            
            # Sort by upload date, newest first
            files.sort(key=lambda x: x.get("uploaded_at", ""), reverse=True)
            return files
    
    async def _list_local_files(self, images_only: bool = False) -> List[Dict[str, Any]]:
        """List files from local filesystem."""
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        files = []
        
        if self.local_dir.exists():
            for file_path in self.local_dir.iterdir():
                if file_path.is_file():
                    ext = file_path.suffix.lower()
                    is_image = ext in image_extensions
                    
                    if images_only and not is_image:
                        continue
                    
                    stat = file_path.stat()
                    files.append({
                        "filename": file_path.name,
                        "url": f"/api/uploads/{file_path.name}",
                        "size": stat.st_size,
                        "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "is_image": is_image
                    })
        
        # Sort by upload date, newest first
        files.sort(key=lambda x: x["uploaded_at"], reverse=True)
        return files


# Singleton instance
_storage_instance: Optional[BlobStorage] = None


def get_storage() -> BlobStorage:
    """Get the storage instance (singleton)."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = BlobStorage()
    return _storage_instance
