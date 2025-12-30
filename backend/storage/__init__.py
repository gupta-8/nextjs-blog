"""Storage module for file uploads.

This module provides an abstraction layer for file storage.
It supports both local filesystem (development) and Vercel Blob (production).
"""
from .blob_storage import BlobStorage, get_storage

__all__ = ['BlobStorage', 'get_storage']
