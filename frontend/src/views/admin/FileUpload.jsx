'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useRouter } from 'next/navigation';
import { useUploader } from '../../hooks/useUploader';
import { UploadProgress, DropZone, UrlDownloader } from '../../components/upload';

export default function FileUpload() {
  const { token } = useAuth();
  const { siteName } = useSite();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [downloadingUrl, setDownloadingUrl] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const dragCounterRef = useRef(0);
  const pasteCounterRef = useRef(1);
  
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Use the custom uploader hook
  const {
    uploads,
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
  } = useUploader({ token, apiUrl: API_URL });

  // Set page title
  useEffect(() => {
    document.title = `Upload Files | ${siteName}`;
  }, [siteName]);

  // Warn before leaving with active uploads
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasActiveUploads) {
        e.preventDefault();
        e.returnValue = 'Uploads in progress will be lost.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasActiveUploads]);

  // Handle paste for images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split('/')[1] || 'png';
            const num = String(pasteCounterRef.current++).padStart(2, '0');
            const namedFile = new File([file], `image-${num}.${ext}`, { type: file.type });
            startUpload(namedFile);
          }
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [token, startUpload]);

  // Drag and drop handlers
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
      if (dropZoneRef.current && !dropZoneRef.current.contains(e.target)) {
        e.dataTransfer.dropEffect = 'none';
        setIsDragging(false);
        dragCounterRef.current = 0;
      }
    };
    const handleWindowDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounterRef.current = 0;
    };
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      Array.from(files).forEach(f => startUpload(f));
    }
  }, [startUpload]);

  const handleFileSelect = (e) => {
    const files = e.target?.files;
    
    if (!files || files.length === 0) {
      return;
    }
    
    // Validation constants
    const MAX_FILES = 50;
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    
    // Check max files limit
    if (files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed at once`);
      e.target.value = '';
      return;
    }
    
    // Validate and process each file
    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 5GB limit`);
        continue;
      }
      validFiles.push(file);
    }
    
    // Upload valid files
    for (const file of validFiles) {
      startUpload(file);
    }
    
    // Reset input value to allow re-selecting same file
    e.target.value = '';
  };

  const handleRemoteDownload = async () => {
    if (!remoteUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError('');
    setSuccess('');
    setDownloadingUrl(true);

    const result = await downloadFromUrl(remoteUrl);
    
    if (result.success) {
      setSuccess(`File downloaded: ${result.data.filename}`);
      setRemoteUrl('');
    } else {
      setError(result.error);
    }
    
    setDownloadingUrl(false);
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(`${API_URL}${url}`);
    setSuccess('URL copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="font-mono max-w-3xl mx-auto">
      <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// upload.php</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6">
        upload<span className="text-[#a78bfa]">_files</span>
      </h1>

      {/* Back link */}
      <button
        onClick={() => router.push('/admin/files')}
        className="text-white/50 text-xs hover:text-[#a78bfa] transition-colors mb-6 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        back to files
      </button>

      {/* Messages */}
      {success && (
        <div className="mb-4 p-3 border border-green-500/30 bg-green-500/10 text-green-400 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Upload Progress */}
      <UploadProgress
        uploads={uploads}
        hasInterrupted={hasInterrupted}
        clearCompleted={clearCompleted}
        pauseUpload={pauseUpload}
        resumeUpload={resumeUpload}
        cancelUpload={cancelUpload}
        dismissUpload={dismissUpload}
        copyUrl={copyUrl}
        retryUrlDownload={retryUrlDownload}
        formatBytes={formatBytes}
      />

      {/* File Upload Section */}
      <DropZone
        dropZoneRef={dropZoneRef}
        isDragging={isDragging}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        hasActiveUploads={hasActiveUploads}
      />

      {/* URL Download */}
      <UrlDownloader
        remoteUrl={remoteUrl}
        setRemoteUrl={setRemoteUrl}
        downloading={downloadingUrl}
        onDownload={handleRemoteDownload}
      />
    </div>
  );
}
