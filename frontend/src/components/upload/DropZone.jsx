'use client';

import React from 'react';

/**
 * Drag and Drop Zone Component
 * Provides the main file upload interface with drag-and-drop support
 */
export default function DropZone({
  dropZoneRef,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  fileInputRef,
  onFileSelect,
  hasActiveUploads
}) {
  return (
    <div className="border border-white/10 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10">
        <p className="text-white/30 text-[10px] tracking-[0.2em]">// file_upload</p>
      </div>
      
      {/* Drop Zone - Redesigned hover state */}
      <div
        ref={dropZoneRef}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative p-6 sm:p-10 transition-all duration-300 ${
          isDragging 
            ? 'bg-[#a78bfa]/5' 
            : 'bg-transparent hover:bg-white/[0.01]'
        }`}
      >
        {/* Modern animated border effect when dragging */}
        {isDragging && (
          <>
            <div className="absolute inset-0 border-2 border-[#a78bfa] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#a78bfa]/10 to-transparent pointer-events-none" />
            {/* Animated corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#a78bfa] animate-pulse" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#a78bfa] animate-pulse" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#a78bfa] animate-pulse" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#a78bfa] animate-pulse" />
          </>
        )}
        
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Icon Container */}
          <div className={`relative mb-6 transition-all duration-300 ${isDragging ? 'scale-110' : ''}`}>
            <div className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center transition-all duration-300 ${
              isDragging 
                ? 'bg-[#a78bfa] border-2 border-[#a78bfa]' 
                : 'bg-white/5 border border-white/10'
            }`}>
              <svg 
                className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-500 ${
                  isDragging ? 'text-black -translate-y-2 scale-110' : 'text-white/30'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isDragging ? 2 : 1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {/* Decorative corner accents - only show when not dragging */}
            {!isDragging && (
              <>
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-white/20" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-white/20" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-white/20" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-white/20" />
              </>
            )}
          </div>
          
          {/* Text Content */}
          {isDragging ? (
            <div className="space-y-3">
              <p className="text-[#a78bfa] text-xl sm:text-2xl font-medium">Drop to upload</p>
              <p className="text-[#a78bfa]/60 text-sm">Release your files to start uploading</p>
              <div className="flex items-center justify-center gap-2 text-xs text-[#a78bfa]/40">
                <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Files will be uploaded immediately</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-white/70 text-base sm:text-lg font-medium mb-1">
                  Drag & drop files here
                </p>
                <p className="text-white/30 text-xs sm:text-sm">
                  or click the button below to browse
                </p>
              </div>
              
              {/* File types hint */}
              <div className="flex flex-wrap justify-center gap-2 text-[10px] text-white/20">
                <span className="px-2 py-0.5 bg-white/5 border border-white/10">images</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10">videos</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10">documents</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Browse Button Section */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-white/10 bg-white/[0.01]">
        <div className={`flex flex-col sm:flex-row items-center gap-4 ${hasActiveUploads ? 'opacity-50' : ''}`}>
          <input 
            ref={fileInputRef}
            id="mobile-file-input"
            type="file" 
            multiple 
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={hasActiveUploads}
            className="group relative w-full sm:w-auto px-8 py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {hasActiveUploads ? 'Uploading...' : 'Browse files'}
            </span>
            {/* Hover effect */}
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          
          <div className="hidden sm:block h-8 w-px bg-white/10" />
          
          <p className="text-white/30 text-xs text-center sm:text-left">
            <span className="text-white/50">Max 50 files</span>
            <span className="mx-2">•</span>
            <span>5GB per file</span>
          </p>
        </div>
      </div>
    </div>
  );
}
