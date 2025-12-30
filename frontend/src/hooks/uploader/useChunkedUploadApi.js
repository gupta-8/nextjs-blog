'use client'

import { useCallback } from 'react'

const CHUNK_SIZE = 2 * 1024 * 1024 // 2MB chunks

/**
 * Hook for chunked upload API operations
 */
export function useChunkedUploadApi({ apiUrl, token }) {
  // Initialize chunked upload session
  const initChunkedUpload = useCallback(async (file) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    
    const response = await fetch(`${apiUrl}/api/upload/chunked/init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: file.name,
        total_size: file.size,
        total_chunks: totalChunks,
        content_type: file.type || 'application/octet-stream'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to initialize upload')
    }

    return response.json()
  }, [apiUrl, token])

  // Upload a single chunk
  const uploadChunk = useCallback(async (uploadId, chunkIndex, chunk, signal) => {
    const formData = new FormData()
    formData.append('file', chunk)

    const response = await fetch(`${apiUrl}/api/upload/chunked/${uploadId}/chunk/${chunkIndex}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      signal
    })

    if (!response.ok) {
      throw new Error(`Chunk ${chunkIndex} upload failed`)
    }

    return response.json()
  }, [apiUrl, token])

  // Complete chunked upload
  const completeChunkedUpload = useCallback(async (uploadId) => {
    const response = await fetch(`${apiUrl}/api/upload/chunked/${uploadId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to complete upload')
    }

    return response.json()
  }, [apiUrl, token])

  // Get upload status (which chunks are already uploaded)
  const getUploadStatus = useCallback(async (uploadId) => {
    const response = await fetch(`${apiUrl}/api/upload/chunked/${uploadId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  }, [apiUrl, token])

  // Cancel chunked upload on server
  const cancelChunkedUpload = useCallback(async (uploadId) => {
    try {
      await fetch(`${apiUrl}/api/upload/chunked/${uploadId}/cancel`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (e) {
      console.error('Failed to cancel upload on server:', e)
    }
  }, [apiUrl, token])

  return {
    initChunkedUpload,
    uploadChunk,
    completeChunkedUpload,
    getUploadStatus,
    cancelChunkedUpload,
    CHUNK_SIZE
  }
}
