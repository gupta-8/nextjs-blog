'use client';

import React from 'react';
import StatusIcon, { getStatusInfo } from './StatusIcon';

/**
 * Upload Progress List Component
 * Displays a list of ongoing and completed uploads with progress bars
 */
export default function UploadProgress({
  uploads,
  hasInterrupted,
  clearCompleted,
  pauseUpload,
  resumeUpload,
  cancelUpload,
  dismissUpload,
  copyUrl,
  retryUrlDownload,
  formatBytes
}) {
  if (uploads.length === 0) return null;

  return (
    <div className="border border-white/10 overflow-hidden mb-6">
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-white/30 text-[10px] tracking-[0.2em]">// upload_progress</p>
          <span className="px-2 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa] text-[10px]">
            {uploads.length} file{uploads.length > 1 ? 's' : ''}
          </span>
        </div>
        {hasInterrupted && (
          <button 
            onClick={clearCompleted} 
            className="text-white/40 text-xs hover:text-white/60 transition-colors"
          >
            clear all
          </button>
        )}
      </div>
      
      <div className="divide-y divide-white/5">
        {uploads.map((item) => {
          const statusInfo = getStatusInfo(item.status);
          
          return (
            <div key={item.id} className={`p-4 transition-all ${statusInfo.bg}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Square thumbnail preview */}
                  {item.previewUrl ? (
                    <div className="w-10 h-10 flex-shrink-0 bg-white/5 border border-white/10 overflow-hidden">
                      <img 
                        src={item.previewUrl} 
                        alt={item.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <StatusIcon status={item.status} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white/80 text-sm truncate">{item.filename}</p>
                    <p className="text-white/30 text-xs">
                      {item.isUrlDownload && item.status === 'downloading' 
                        ? 'Downloading...' 
                        : formatBytes(item.total)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <UploadActions
                    item={item}
                    pauseUpload={pauseUpload}
                    resumeUpload={resumeUpload}
                    cancelUpload={cancelUpload}
                    dismissUpload={dismissUpload}
                    copyUrl={copyUrl}
                    retryUrlDownload={retryUrlDownload}
                  />
                </div>
              </div>
              
              {/* Progress Bar */}
              {(item.status === 'uploading' || item.status === 'downloading' || item.status === 'paused' || item.status === 'success') && (
                <div>
                  <div className="h-1.5 bg-white/10 overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        item.status === 'success' ? 'bg-green-500' : 
                        item.status === 'paused' ? 'bg-yellow-500' : 
                        item.status === 'downloading' ? 'bg-blue-500' : 'bg-[#a78bfa]'
                      }`} 
                      style={{ width: `${item.percent}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-white/40">
                      {item.status === 'success' ? 'Completed' : 
                       item.status === 'paused' ? `Paused at ${formatBytes(item.loaded)}` : 
                       item.status === 'downloading' ? 'Downloading from URL...' : 
                       `${formatBytes(item.loaded)} of ${formatBytes(item.total)}`}
                    </span>
                    <span className={`font-medium ${
                      item.status === 'success' ? 'text-green-400' : 
                      item.status === 'paused' ? 'text-yellow-500' : 
                      item.status === 'downloading' ? 'text-blue-400' : 'text-[#a78bfa]'
                    }`}>
                      {item.percent}%
                    </span>
                  </div>
                </div>
              )}
              
              {/* Status Messages */}
              {item.status === 'interrupted' && (
                <p className="text-orange-400/70 text-xs">Upload was interrupted. Please re-upload this file.</p>
              )}
              {item.status === 'interrupted_url' && (
                <p className="text-orange-400/70 text-xs">Download was interrupted. Click retry to resume.</p>
              )}
              {(item.status === 'error' || item.status === 'cancelled') && (
                <p className="text-red-400/70 text-xs">
                  {item.status === 'cancelled' ? 'Upload cancelled' : item.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* View All Files Link */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.01]">
        <a 
          href="/admin/files" 
          className="text-[#a78bfa] text-xs hover:text-[#c4b5fd] flex items-center gap-2 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          View all files
        </a>
      </div>
    </div>
  );
}

/**
 * Upload action buttons based on item status
 */
function UploadActions({
  item,
  pauseUpload,
  resumeUpload,
  cancelUpload,
  dismissUpload,
  copyUrl,
  retryUrlDownload
}) {
  return (
    <>
      {item.status === 'uploading' && !item.isUrlDownload && (
        <>
          <button 
            onClick={() => pauseUpload(item.id)} 
            className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-white/10" 
            title="Pause"
          >
            <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          </button>
          <button 
            onClick={() => cancelUpload(item.id)} 
            className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50" 
            title="Cancel"
          >
            <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
      
      {(item.status === 'downloading' || (item.isUrlDownload && item.status !== 'success' && item.status !== 'error' && item.status !== 'cancelled')) && (
        <button 
          onClick={() => cancelUpload(item.id)} 
          className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50" 
          title="Cancel Download"
        >
          <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      {item.status === 'paused' && (
        <>
          <button 
            onClick={() => resumeUpload(item.id)} 
            className="w-7 h-7 border border-yellow-500/50 bg-yellow-500/10 flex items-center justify-center hover:bg-yellow-500/20" 
            title="Resume"
          >
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button 
            onClick={() => cancelUpload(item.id)} 
            className="w-7 h-7 border border-white/20 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50" 
            title="Cancel"
          >
            <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
      
      {item.status === 'success' && (
        <>
          {item.url && (
            <button 
              onClick={() => copyUrl(item.url)} 
              className="text-[#a78bfa] text-xs hover:text-[#c4b5fd] px-2 py-1 border border-[#a78bfa]/30"
            >
              copy url
            </button>
          )}
          <button 
            onClick={() => dismissUpload(item.id)} 
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white/60" 
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
      
      {item.status === 'interrupted_url' && item.sourceUrl && (
        <>
          <button 
            onClick={() => retryUrlDownload(item.id)} 
            className="text-orange-400 text-xs hover:text-orange-300 px-2 py-1 border border-orange-500/30"
          >
            retry
          </button>
          <button 
            onClick={() => dismissUpload(item.id)} 
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white/60" 
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
      
      {(item.status === 'interrupted' || item.status === 'error' || item.status === 'cancelled') && (
        <button 
          onClick={() => dismissUpload(item.id)} 
          className="w-6 h-6 flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white/60" 
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  );
}
