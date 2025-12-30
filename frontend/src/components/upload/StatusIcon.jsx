'use client';

import React from 'react';

// Get status label and colors for upload item
export const getStatusInfo = (status) => {
  switch (status) {
    case 'uploading':
      return { label: 'Uploading', border: 'border-white/10', bg: 'bg-white/[0.02]', icon: 'spinner', iconBg: 'bg-[#a78bfa]/20', iconColor: 'border-[#a78bfa]' };
    case 'downloading':
      return { label: 'Downloading from URL', border: 'border-blue-500/30', bg: 'bg-blue-500/5', icon: 'spinner', iconBg: 'bg-blue-500/20', iconColor: 'border-blue-500' };
    case 'paused':
      return { label: 'Paused', border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', icon: 'pause', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-500' };
    case 'success':
      return { label: 'Completed', border: 'border-white/10', bg: 'bg-white/[0.02]', icon: 'check', iconBg: 'bg-green-500/20', iconColor: 'text-green-400' };
    case 'interrupted':
      return { label: 'Interrupted', border: 'border-orange-500/30', bg: 'bg-orange-500/5', icon: 'warning', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400' };
    case 'interrupted_url':
      return { label: 'Download Interrupted', border: 'border-orange-500/30', bg: 'bg-orange-500/5', icon: 'warning', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400' };
    case 'error':
      return { label: 'Failed', border: 'border-red-500/30', bg: 'bg-red-500/5', icon: 'x', iconBg: 'bg-red-500/20', iconColor: 'text-red-400' };
    case 'cancelled':
      return { label: 'Cancelled', border: 'border-red-500/30', bg: 'bg-red-500/5', icon: 'x', iconBg: 'bg-red-500/20', iconColor: 'text-red-400' };
    default:
      return { label: status, border: 'border-white/10', bg: 'bg-white/[0.02]', icon: 'spinner', iconBg: 'bg-white/10', iconColor: 'border-white/50' };
  }
};

// Animated upload spinner icon
export default function StatusIcon({ status }) {
  const info = getStatusInfo(status);
  
  return (
    <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${info.iconBg}`}>
      {info.icon === 'spinner' && (
        <div className="relative w-5 h-5 flex items-center justify-center">
          {/* Animated upload cloud icon */}
          <svg className="w-5 h-5 text-[#a78bfa]" fill="none" viewBox="0 0 24 24">
            {/* Cloud shape */}
            <path 
              className="opacity-40"
              fill="currentColor" 
              d="M4.5 16.5c-1.93 0-3.5-1.57-3.5-3.5 0-1.58 1.06-2.9 2.5-3.34C3.93 6.8 6.48 4.5 9.5 4.5c2.43 0 4.54 1.4 5.58 3.42.3-.06.61-.09.92-.09 2.48 0 4.5 2.02 4.5 4.5 0 2.48-2.02 4.5-4.5 4.5H4.5z"
            />
            {/* Animated arrow */}
            <path 
              className="animate-bounce"
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              d="M12 19V10m0 0l-3 3m3-3l3 3"
            />
          </svg>
        </div>
      )}
      {info.icon === 'pause' && (
        <svg className={`w-4 h-4 ${info.iconColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
      )}
      {info.icon === 'check' && (
        <svg className={`w-4 h-4 ${info.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {info.icon === 'warning' && (
        <svg className={`w-4 h-4 ${info.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      {info.icon === 'x' && (
        <svg className={`w-4 h-4 ${info.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
    </div>
  );
}
