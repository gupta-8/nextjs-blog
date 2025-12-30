"""Storage module for file uploads.

This module provides local filesystem storage for container-based deployments.
"""
from .local_storage import LocalStorage, get_storage

__all__ = ['LocalStorage', 'get_storage']