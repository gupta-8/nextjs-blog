'use client';

import React from 'react';

/**
 * URL Downloader Component
 * Allows downloading files from remote URLs
 */
export default function UrlDownloader({
  remoteUrl,
  setRemoteUrl,
  downloading,
  onDownload
}) {
  return (
    <div className="border border-white/10 overflow-hidden mb-6">
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10">
        <p className="text-white/30 text-[10px] tracking-[0.2em]">// url_download</p>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="url"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://example.com/file.zip"
              className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 focus:bg-white/[0.02] placeholder:text-white/20 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
          <button
            onClick={onDownload}
            disabled={downloading || !remoteUrl.trim()}
            className="px-6 py-3 border border-white/20 text-white/60 text-sm hover:text-white hover:border-white/40 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {downloading ? 'downloading...' : 'download'}
          </button>
        </div>
      </div>
    </div>
  );
}
