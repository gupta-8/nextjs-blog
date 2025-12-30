'use client'

import { useCallback, useEffect } from 'react'

const UPLOAD_STORAGE_KEY = 'pending_uploads'

/**
 * Hook for upload persistence using localStorage
 */
export function useUploadPersistence({ uploads, isInitialized, setUploads }) {
  // Save to localStorage
  const saveToStorage = useCallback((uploadsList) => {
    if (typeof window === 'undefined') return
    try {
      const data = uploadsList.map(u => ({
        id: u.id,
        filename: u.filename,
        status: u.status,
        percent: u.percent,
        loaded: u.loaded,
        total: u.total,
        error: u.error,
        url: u.url,
        timestamp: u.timestamp || Date.now(),
        isUrlDownload: u.isUrlDownload,
        sourceUrl: u.sourceUrl,
        // Chunked upload data for resume
        uploadId: u.uploadId,
        totalChunks: u.totalChunks,
        uploadedChunks: u.uploadedChunks
      }))
      window.localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save upload state:', e)
    }
  }, [])

  // Load from localStorage
  const loadFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem(UPLOAD_STORAGE_KEY)
      if (saved) {
        const uploads = JSON.parse(saved)
        return uploads.filter(u => 
          u.status === 'uploading' || u.status === 'paused' || 
          u.status === 'interrupted' || u.status === 'downloading'
        ).map(u => ({
          ...u,
          // File uploads become interrupted since we lost File reference
          // URL downloads can be re-downloaded if we have sourceUrl
          status: (u.status === 'uploading' || u.status === 'paused' || u.status === 'downloading') 
            ? (u.isUrlDownload && u.sourceUrl ? 'interrupted_url' : 'interrupted') 
            : u.status
        }))
      }
    } catch (e) {
      console.error('Failed to load upload state:', e)
    }
    return []
  }, [])

  // Sync state to localStorage whenever uploads change
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      if (uploads.length > 0) {
        saveToStorage(uploads)
      } else {
        window.localStorage.removeItem(UPLOAD_STORAGE_KEY)
      }
    }
  }, [uploads, isInitialized, saveToStorage])

  return {
    saveToStorage,
    loadFromStorage
  }
}
