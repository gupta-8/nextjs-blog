'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChunkedUploadApi, useUploadPersistence, useUrlDownload } from './uploader';

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

/**
 * Custom hook for handling file uploads with pause/resume/cancel functionality
 * Uses chunked uploads for true resume capability
 * 
 * Refactored to use smaller specialized hooks:
 * - useChunkedUploadApi: API operations for chunked uploads
 * - useUploadPersistence: localStorage persistence
 * - useUrlDownload: URL download functionality
 */
export function useUploader({ token, apiUrl }) {
  const [uploads, setUploads] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store upload sessions and abort controllers
  const sessionsRef = useRef(new Map());
  
  // Use specialized hooks
  const { 
    initChunkedUpload, 
    uploadChunk, 
    completeChunkedUpload, 
    getUploadStatus,
    cancelChunkedUpload 
  } = useChunkedUploadApi({ apiUrl, token });
  
  const { saveToStorage, loadFromStorage } = useUploadPersistence({ 
    uploads, 
    isInitialized, 
    setUploads 
  });
  
  const { downloadFromUrl } = useUrlDownload({ 
    apiUrl, 
    token, 
    setUploads, 
    sessionsRef 
  });
  
  // Format bytes helper
  const formatBytes = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Initialize - load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const restored = loadFromStorage();
    if (restored.length > 0) {
      setUploads(restored);
    }
    setIsInitialized(true);
  }, [loadFromStorage]);

  // Core chunked upload function
  const doChunkedUpload = useCallback(async (id, file, uploadId, startFromChunk = 0, isResume = false) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const controller = new AbortController();
    
    // Only create new session if not resuming
    if (!isResume) {
      sessionsRef.current.set(id, {
        controller,
        file,
        uploadId,
        isPaused: false,
        currentChunk: startFromChunk
      });
    } else {
      // Update controller for resumed upload
      const session = sessionsRef.current.get(id);
      if (session) {
        session.controller = controller;
        session.isPaused = false;
      }
    }

    console.log(`[useUploader] Starting upload from chunk ${startFromChunk}/${totalChunks}`);

    try {
      for (let i = startFromChunk; i < totalChunks; i++) {
        // Check if paused BEFORE uploading each chunk
        const session = sessionsRef.current.get(id);
        if (!session || session.isPaused) {
          console.log(`[useUploader] Upload paused at chunk ${i}`);
          return;
        }

        console.log(`[useUploader] Uploading chunk ${i}/${totalChunks}`);
        
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await uploadChunk(uploadId, i, chunk, controller.signal);

        // Update progress
        const loaded = end;
        const percent = Math.round((loaded / file.size) * 100);
        
        console.log(`[useUploader] Chunk ${i} complete, progress: ${percent}%`);
        
        setUploads(prev => prev.map(u => 
          u.id === id ? { 
            ...u, 
            loaded, 
            percent,
            uploadedChunks: i + 1,
            currentChunk: i + 1
          } : u
        ));

        // Update session's current chunk
        if (sessionsRef.current.has(id)) {
          sessionsRef.current.get(id).currentChunk = i + 1;
        }
      }

      // All chunks uploaded - complete the upload
      const result = await completeChunkedUpload(uploadId);
      
      sessionsRef.current.delete(id);
      
      setUploads(prev => prev.map(u => 
        u.id === id ? { 
          ...u, 
          status: 'success', 
          url: result.url, 
          percent: 100,
          loaded: file.size
        } : u
      ));

    } catch (err) {
      if (err.name === 'AbortError') {
        // Check if paused
        const session = sessionsRef.current.get(id);
        if (session?.isPaused) {
          console.log('[useUploader] Upload paused via abort');
          return;
        }
        // Otherwise it was cancelled
        setUploads(prev => prev.map(u => 
          u.id === id ? { ...u, status: 'cancelled' } : u
        ));
      } else {
        console.error('[useUploader] Upload error:', err);
        setUploads(prev => prev.map(u => 
          u.id === id ? { ...u, status: 'error', error: err.message } : u
        ));
      }
      sessionsRef.current.delete(id);
    }
  }, [uploadChunk, completeChunkedUpload]);

  // Start uploading a file
  const startUpload = useCallback(async (file) => {
    const id = `${file.name}-${Date.now()}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Generate preview URL for images
    let previewUrl = null;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    try {
      // Initialize chunked upload session
      const { upload_id: uploadId } = await initChunkedUpload(file);

      const newUpload = {
        id,
        filename: file.name,
        status: 'uploading',
        percent: 0,
        loaded: 0,
        total: file.size,
        timestamp: Date.now(),
        uploadId,
        totalChunks,
        uploadedChunks: 0,
        previewUrl
      };

      setUploads(prev => [...prev, newUpload]);

      // Store file reference for resume
      sessionsRef.current.set(id, {
        file,
        uploadId,
        isPaused: false,
        currentChunk: 0
      });

      // Start uploading
      await doChunkedUpload(id, file, uploadId, 0);

    } catch (err) {
      console.error('[useUploader] Failed to start upload:', err);
      setUploads(prev => [...prev, {
        id,
        filename: file.name,
        status: 'error',
        error: err.message,
        percent: 0,
        loaded: 0,
        total: file.size,
        timestamp: Date.now(),
        previewUrl
      }]);
    }
  }, [initChunkedUpload, doChunkedUpload]);

  // Pause an upload
  const pauseUpload = useCallback((id) => {
    const session = sessionsRef.current.get(id);
    if (session) {
      console.log('[useUploader] Pausing upload:', id, 'at chunk:', session.currentChunk);
      
      // Set paused flag FIRST
      session.isPaused = true;
      
      // Abort current request
      if (session.controller) {
        session.controller.abort();
      }
      
      // Update UI
      setUploads(prev => {
        const newUploads = prev.map(u => 
          u.id === id ? { ...u, status: 'paused' } : u
        );
        saveToStorage(newUploads);
        return newUploads;
      });
    }
  }, [saveToStorage]);

  // Resume a paused upload
  const resumeUpload = useCallback(async (id) => {
    const session = sessionsRef.current.get(id);
    const upload = uploads.find(u => u.id === id);
    
    console.log('=== RESUME UPLOAD START ===');
    console.log('[useUploader] ID:', id);
    console.log('[useUploader] Session exists:', !!session);
    console.log('[useUploader] Session file:', session?.file?.name);
    console.log('[useUploader] Session currentChunk:', session?.currentChunk);
    console.log('[useUploader] Upload uploadId:', upload?.uploadId);
    console.log('[useUploader] Upload percent:', upload?.percent);
    
    if (session?.file && upload?.uploadId) {
      // Query server for actual upload status
      let resumeFromChunk = session.currentChunk || 0;
      
      try {
        const status = await getUploadStatus(upload.uploadId);
        console.log('[useUploader] Server status response:', status);
        
        if (status && status.received_chunks) {
          // Find the first missing chunk
          const receivedSet = new Set(status.received_chunks);
          const totalChunks = Math.ceil(session.file.size / CHUNK_SIZE);
          
          console.log('[useUploader] Total chunks:', totalChunks);
          console.log('[useUploader] Received chunks from server:', status.received_chunks);
          
          // Start from the first missing chunk
          resumeFromChunk = totalChunks; // Default to end if all received
          for (let i = 0; i < totalChunks; i++) {
            if (!receivedSet.has(i)) {
              resumeFromChunk = i;
              break;
            }
          }
          
          console.log('[useUploader] Calculated resumeFromChunk:', resumeFromChunk);
        }
      } catch (e) {
        console.warn('[useUploader] Could not get server status, using local:', e);
      }
      
      // Update the progress to match the resumed position
      const loaded = resumeFromChunk * CHUNK_SIZE;
      const percent = Math.round((loaded / session.file.size) * 100);
      
      console.log('[useUploader] FINAL: Resuming from chunk:', resumeFromChunk, 'percent:', percent);
      console.log('=== RESUME UPLOAD END ===');
      
      // Update UI with correct progress
      setUploads(prev => prev.map(u => 
        u.id === id ? { ...u, status: 'uploading', loaded, percent } : u
      ));
      
      // Resume from where we left off - pass isResume=true
      doChunkedUpload(id, session.file, upload.uploadId, resumeFromChunk, true);
    } else {
      console.warn('[useUploader] Cannot resume - missing file or uploadId');
      console.log('=== RESUME UPLOAD FAILED ===');
    }
  }, [uploads, doChunkedUpload, getUploadStatus]);

  // Cancel an upload or URL download
  const cancelUpload = useCallback(async (id) => {
    const session = sessionsRef.current.get(id);
    const upload = uploads.find(u => u.id === id);
    
    if (session) {
      session.isPaused = false;
      if (session.controller) {
        session.controller.abort();
      }
    }
    
    // Cancel chunked upload on server (not needed for URL downloads)
    if (upload?.uploadId && !upload?.isUrlDownload) {
      await cancelChunkedUpload(upload.uploadId);
    }
    
    sessionsRef.current.delete(id);
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, status: 'cancelled' } : u
    ));
  }, [uploads, cancelChunkedUpload]);

  // Dismiss (remove) an upload from the list
  const dismissUpload = useCallback((id) => {
    sessionsRef.current.delete(id);
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  // Clear all completed/failed/cancelled uploads
  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => 
      u.status === 'uploading' || u.status === 'paused' || u.status === 'downloading'
    ));
  }, []);

  // Retry a URL download
  const retryUrlDownload = useCallback((id) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.sourceUrl) {
      setUploads(prev => prev.filter(u => u.id !== id));
      downloadFromUrl(upload.sourceUrl);
    }
  }, [uploads, downloadFromUrl]);

  // Check if there are active uploads
  const hasActiveUploads = uploads.some(u => u.status === 'uploading' || u.status === 'downloading');
  const hasInterrupted = uploads.some(u => 
    u.status === 'interrupted' || u.status === 'interrupted_url' || 
    u.status === 'error' || u.status === 'cancelled'
  );

  return {
    uploads,
    isInitialized,
    hasActiveUploads,
    hasInterrupted,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    dismissUpload,
    clearCompleted,
    downloadFromUrl,
    retryUrlDownload,
    formatBytes
  };
}
