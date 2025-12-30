'use client'

import { useCallback, useRef } from 'react'

/**
 * Hook for URL download functionality
 */
export function useUrlDownload({ apiUrl, token, setUploads, sessionsRef }) {
  // Download file from URL with cancel support
  const downloadFromUrl = useCallback(async (url) => {
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1].split('?')[0] || 'remote-file'
    const id = `url-${Date.now()}`
    
    // Create abort controller for cancellation
    const controller = new AbortController()
    
    // Store in sessions for cancel support
    sessionsRef.current.set(id, {
      controller,
      isUrlDownload: true,
      isPaused: false
    })

    setUploads(prev => [...prev, {
      id,
      filename: filename,
      status: 'downloading',
      percent: 0,
      loaded: 0,
      total: 0,
      timestamp: Date.now(),
      isUrlDownload: true,
      sourceUrl: url
    }])

    let progress = 0
    const progressInterval = setInterval(() => {
      // Check if cancelled
      const session = sessionsRef.current.get(id)
      if (!session || session.controller?.signal?.aborted) {
        clearInterval(progressInterval)
        return
      }
      progress += Math.random() * 15
      if (progress > 90) progress = 90
      setUploads(prev => prev.map(u => 
        u.id === id && u.status === 'downloading' ? { ...u, percent: Math.round(progress) } : u
      ))
    }, 500)

    try {
      const res = await fetch(`${apiUrl}/api/upload/from-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url }),
        signal: controller.signal
      })

      clearInterval(progressInterval)
      sessionsRef.current.delete(id)

      if (res.ok) {
        const data = await res.json()
        setUploads(prev => prev.map(u => 
          u.id === id ? { 
            ...u, 
            status: 'success', 
            percent: 100, 
            url: data.url, 
            filename: data.filename || filename,
            total: data.size || 0
          } : u
        ))
        return { success: true, data }
      } else {
        const data = await res.json()
        setUploads(prev => prev.map(u => 
          u.id === id ? { ...u, status: 'error', error: data.detail || 'Failed to download' } : u
        ))
        return { success: false, error: data.detail || 'Failed to download' }
      }
    } catch (err) {
      clearInterval(progressInterval)
      sessionsRef.current.delete(id)
      
      if (err.name === 'AbortError') {
        // Download was cancelled
        setUploads(prev => prev.map(u => 
          u.id === id ? { ...u, status: 'cancelled' } : u
        ))
        return { success: false, error: 'Cancelled' }
      }
      
      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, status: 'error', error: 'Network error' } : u
      ))
      return { success: false, error: 'Network error' }
    }
  }, [apiUrl, token, setUploads, sessionsRef])

  return { downloadFromUrl }
}
