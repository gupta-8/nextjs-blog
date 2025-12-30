"""Local filesystem storage for file uploads.

This module provides file storage functionality using the local filesystem.
Suitable for container-based deployments like Railway with persistent volumes.
"""
import os
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import re


class LocalStorage:
    """Storage class for local filesystem uploads."""
    
    def __init__(self):
        self.local_dir = Path('/uploads')
        # Ensure directory exists
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
            filename_or_url: The filename or URL path
            
        Returns:
            True if deleted successfully
        """
        # Extract filename if it's a URL path
        filename = filename_or_url
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
                        "uploaded_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                        "is_image": is_image
                    })
        
        # Sort by upload date, newest first
        files.sort(key=lambda x: x["uploaded_at"], reverse=True)
        return files


# Singleton instance
_storage_instance: Optional[LocalStorage] = None


def get_storage() -> LocalStorage:
    """Get the storage instance (singleton)."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorage()
    return _storage_instance