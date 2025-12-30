import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import Link from 'next/link';
import ConfirmationModal, { ModalContentBox } from '../../components/ConfirmationModal';
export default function AdminFiles() {
  const { token } = useAuth();
  const { siteName } = useSite();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    document.title = `Files | ${siteName}`;
  }, [siteName]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    setDeleting(filename);
    setShowDeleteModal(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/files/${filename}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFiles(files.filter(f => f.filename !== filename));
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    } finally {
      setDeleting(null);
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.filename));
    }
  };

  const toggleSelect = (filename) => {
    setSelectedFiles(prev =>
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    setShowBulkDeleteModal(false);
    setProcessing(true);
    
    try {
      for (const filename of selectedFiles) {
        await fetch(`${API_URL}/api/admin/files/${filename}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setSelectedFiles([]);
      loadFiles();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Some files failed to delete');
    } finally {
      setProcessing(false);
    }
  };

  const copyUrl = (url, filename) => {
    navigator.clipboard.writeText(`${API_URL}${url}`);
    setCopiedUrl(filename);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="font-mono">
      <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// files.php</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
        files<span className="text-[#a78bfa]">_manage</span>
      </h1>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin/files/upload"
          className="px-4 py-2 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors"
        >
          + upload
        </Link>
        
        <div className="flex border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-xs ${viewMode === 'grid' ? 'bg-white/10 text-[#a78bfa]' : 'text-white/50 hover:text-white/70'}`}
          >
            grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs ${viewMode === 'list' ? 'bg-white/10 text-[#a78bfa]' : 'text-white/50 hover:text-white/70'}`}
          >
            list
          </button>
        </div>

        <span className="text-white/30 text-xs ml-auto">
          // {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Select All */}
      {files.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 border border-white/10 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedFiles.length === files.length && files.length > 0}
              onChange={toggleSelectAll}
              className="custom-checkbox"
            />
            <span className="text-white/50 text-xs">
              select_all
            </span>
            {selectedFiles.length > 0 && (
              <span className="text-white/50 text-xs sm:hidden">({selectedFiles.length})</span>
            )}
          </div>
          
          {/* Bulk Actions - Right Side */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs hidden sm:inline">{selectedFiles.length} selected</span>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={processing}
                className="flex-shrink-0 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {processing ? '...' : 'delete'}
              </button>
              <button
                onClick={() => setSelectedFiles([])}
                className="flex-shrink-0 px-3 py-1.5 border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/20 transition-colors"
              >
                clear
              </button>
            </div>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <div className="border border-white/10 p-8 text-center">
          <p className="text-white/30 text-sm">// files = null;</p>
          <p className="text-white/50 text-xs mt-2">No files uploaded yet.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {files.map((file) => (
            <div 
              key={file.filename} 
              className={`group border bg-white/[0.02] overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.04] ${
                selectedFiles.includes(file.filename)
                  ? 'border-[#a78bfa]/50 bg-[#a78bfa]/5'
                  : 'border-white/10'
              }`}
            >
              {/* Mobile Layout: Stacked like admin/blog */}
              <div className="md:hidden">
                {/* Image with checkbox overlay */}
                <div className="relative aspect-square bg-black overflow-hidden flex items-center justify-center">
                  {/* Checkbox overlay - always visible on mobile */}
                  <div className="absolute top-2 left-2 z-10">
                    <label className="flex items-center justify-center w-6 h-6 bg-black/60 border border-white/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.filename)}
                        onChange={() => toggleSelect(file.filename)}
                        className="custom-checkbox"
                      />
                    </label>
                  </div>
                  {file.is_image ? (
                    <img
                      src={`${API_URL}${file.url}`}
                      alt={file.filename}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`${file.is_image ? 'hidden' : 'flex'} w-full h-full flex-col items-center justify-center text-white/30`}>
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[10px] mt-1 uppercase">{file.filename.split('.').pop()}</span>
                  </div>
                </div>
                
                {/* File info */}
                <div className="p-2 border-t border-white/10">
                  <p className="text-white/70 text-[10px] truncate" title={file.filename}>{file.filename}</p>
                  <p className="text-white/30 text-[9px]">{formatSize(file.size)}</p>
                </div>
                
                {/* Buttons at bottom - Mobile with icons only */}
                <div className="flex border-t border-white/10">
                  <button
                    onClick={() => copyUrl(file.url, file.filename)}
                    className={`flex-1 py-2.5 transition-colors text-center flex items-center justify-center ${
                      copiedUrl === file.filename 
                        ? 'text-green-400 bg-green-500/10' 
                        : 'text-[#a78bfa] hover:bg-[#a78bfa]/10'
                    }`}
                    title={copiedUrl === file.filename ? "Copied!" : "Copy URL"}
                  >
                    {copiedUrl === file.filename ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`${API_URL}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 text-white/60 hover:bg-white/5 hover:text-white transition-colors text-center border-x border-white/10 flex items-center justify-center"
                    title="Open"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setShowDeleteModal(file.filename)}
                    disabled={deleting === file.filename}
                    className="flex-1 py-2.5 text-red-400/70 hover:bg-red-500/10 transition-colors text-center flex items-center justify-center"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Desktop Layout: Square preview for all files */}
              <div className="hidden md:block">
                <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
                  {/* Checkbox - visible on hover */}
                  <div className={`absolute top-2 left-2 z-10 transition-opacity ${selectedFiles.includes(file.filename) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <label className="flex items-center justify-center w-6 h-6 bg-black/60 border border-white/20 cursor-pointer hover:bg-black/80">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.filename)}
                        onChange={() => toggleSelect(file.filename)}
                        className="custom-checkbox"
                      />
                    </label>
                  </div>
                  {file.is_image ? (
                    <img
                      src={`${API_URL}${file.url}`}
                      alt={file.filename}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className={`${file.is_image ? 'hidden' : 'flex'} w-full h-full flex-col items-center justify-center text-white/30`}>
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[10px] mt-1 uppercase">{file.filename.split('.').pop()}</span>
                  </div>
                  {/* Action buttons - hover only on desktop */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => copyUrl(file.url, file.filename)}
                      className={`p-2.5 rounded transition-colors ${
                        copiedUrl === file.filename 
                          ? 'bg-green-500/30 text-green-400' 
                          : 'bg-white/10 hover:bg-[#a78bfa]/30 text-white'
                      }`}
                      title={copiedUrl === file.filename ? "Copied!" : "Copy URL"}
                    >
                      {copiedUrl === file.filename ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                    <a
                      href={`${API_URL}${file.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-white/10 hover:bg-[#a78bfa]/30 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      onClick={() => setShowDeleteModal(file.filename)}
                      disabled={deleting === file.filename}
                      className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white/70 text-[10px] truncate" title={file.filename}>{file.filename}</p>
                  <p className="text-white/30 text-[9px]">{formatSize(file.size)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="border border-white/10 divide-y divide-white/10">
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-white/50 text-xs">
            <div className="col-span-1"></div>
            <div className="col-span-1">Preview</div>
            <div className="col-span-4">Filename</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {/* Mobile header */}
          <div className="grid sm:hidden grid-cols-[32px_48px_1fr_auto] gap-3 px-3 py-2 bg-white/5 text-white/50 text-xs">
            <div></div>
            <div></div>
            <div>File</div>
            <div>Actions</div>
          </div>
          {files.map((file) => (
            <React.Fragment key={file.filename}>
              {/* Desktop row */}
              <div className={`hidden sm:grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors ${
                selectedFiles.includes(file.filename) ? 'bg-[#a78bfa]/5' : 'hover:bg-white/[0.02]'
              }`}>
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.filename)}
                    onChange={() => toggleSelect(file.filename)}
                    className="custom-checkbox"
                  />
                </div>
                <div className="col-span-1">
                  {file.is_image ? (
                    <img
                      src={`${API_URL}${file.url}`}
                      alt={file.filename}
                      className="w-10 h-10 object-contain rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded text-white/30">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="col-span-4">
                  <p className="text-white/70 text-xs truncate" title={file.filename}>{file.filename}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/50 text-xs">{formatSize(file.size)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/50 text-xs">{formatDate(file.uploaded_at)}</p>
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  <button
                    onClick={() => copyUrl(file.url, file.filename)}
                    className={`p-1.5 transition-colors ${
                      copiedUrl === file.filename 
                        ? 'text-green-400' 
                        : 'text-[#a78bfa] hover:text-[#c4b5fd]'
                    }`}
                    title={copiedUrl === file.filename ? "Copied!" : "Copy URL"}
                  >
                    {copiedUrl === file.filename ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`${API_URL}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-white/50 hover:text-[#a78bfa] transition-colors"
                    title="Open"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setShowDeleteModal(file.filename)}
                    disabled={deleting === file.filename}
                    className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Mobile row */}
              <div className={`grid sm:hidden grid-cols-[32px_48px_1fr_auto] gap-3 px-3 py-3 items-center transition-colors ${
                selectedFiles.includes(file.filename) ? 'bg-[#a78bfa]/5' : 'hover:bg-white/[0.02]'
              }`}>
                <div>
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.filename)}
                    onChange={() => toggleSelect(file.filename)}
                    className="custom-checkbox"
                  />
                </div>
                <div>
                  {file.is_image ? (
                    <img
                      src={`${API_URL}${file.url}`}
                      alt={file.filename}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded text-white/30">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white/70 text-xs truncate" title={file.filename}>{file.filename}</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{formatSize(file.size)} • {formatDate(file.uploaded_at).split(',')[0]}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyUrl(file.url, file.filename)}
                    className={`p-2 transition-colors ${
                      copiedUrl === file.filename 
                        ? 'text-green-400' 
                        : 'text-[#a78bfa] hover:text-[#c4b5fd]'
                    }`}
                    title={copiedUrl === file.filename ? "Copied!" : "Copy URL"}
                  >
                    {copiedUrl === file.filename ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <a
                    href={`${API_URL}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-white/50 hover:text-[#a78bfa] transition-colors"
                    title="Open"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button
                    onClick={() => setShowDeleteModal(file.filename)}
                    disabled={deleting === file.filename}
                    className="p-2 text-red-400/70 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal - Single File */}
      <ConfirmationModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => handleDelete(showDeleteModal)}
        variant="danger"
        label="delete_file"
        title="Confirm Deletion"
        description="This file will be permanently removed:"
        warningText="This action cannot be undone"
      >
        {showDeleteModal && (
          <ModalContentBox className="font-mono text-sm text-white truncate">
            {showDeleteModal}
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        variant="danger"
        label="bulk_delete"
        title={`Delete ${selectedFiles.length} Files`}
        description={<>You are about to permanently delete <span className="text-white font-medium">{selectedFiles.length}</span> selected file(s).</>}
        confirmText="delete all"
        warningText="This action cannot be undone"
      >
        <ModalContentBox className="max-h-32 overflow-y-auto">
          {selectedFiles.slice(0, 5).map((f, i) => (
            <p key={i} className="font-mono text-xs text-white/50 truncate">{f}</p>
          ))}
          {selectedFiles.length > 5 && (
            <p className="text-white/30 text-xs mt-2">...and {selectedFiles.length - 5} more</p>
          )}
        </ModalContentBox>
      </ConfirmationModal>
    </div>
  );
}
