'use client'
import React, { useState, useEffect } from 'react'

// Check if image URL is likely broken based on known patterns
function isKnownBrokenUrl(src) {
  if (!src) return false;
  return (
    src.includes('blog-editor-pro') ||
    src.includes('blog-editor-1') ||
    src.includes('blog-editor-2') ||
    (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:'))
  );
}

// Placeholder component for when image is missing or broken
function Placeholder({ type = 'no-image', className = '' }) {
  const isBroken = type === 'broken';
  
  return (
    <div className={`flex flex-col items-center justify-center bg-[#111] border border-white/10 min-h-[120px] ${className}`}>
      {/* Icon */}
      <div className="text-white/20 mb-2">
        {isBroken ? (
          // Broken image icon
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1} />
          </svg>
        ) : (
          // No image icon
          <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1} />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 15l-5-5L5 21" />
          </svg>
        )}
      </div>
      {/* Text */}
      <span className="text-white/30 text-[10px] md:text-xs font-mono tracking-wider">
        {isBroken ? 'Broken image' : 'No image'}
      </span>
    </div>
  );
}

// Main adaptive image component with placeholder fallback
export default function ImageWithPlaceholder({ 
  src, 
  alt = '', 
  className = '',
  containerClassName = '',
  objectFit = 'cover',
  showPlaceholder = true,
  adaptive = false
}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error' | 'no-src'
  
  useEffect(() => {
    if (!src) {
      setStatus('no-src');
      return;
    }
    
    if (isKnownBrokenUrl(src)) {
      setStatus('error');
      return;
    }
    
    setStatus('loading');
    
    // Test if image loads
    const img = new Image();
    img.onload = () => setStatus('loaded');
    img.onerror = () => setStatus('error');
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);
  
  // Show placeholder for no-src or error
  if (status === 'no-src') {
    return showPlaceholder ? (
      <Placeholder type="no-image" className={`w-full h-full ${containerClassName}`} />
    ) : null;
  }
  
  if (status === 'error') {
    return showPlaceholder ? (
      <Placeholder type="broken" className={`w-full h-full ${containerClassName}`} />
    ) : null;
  }
  
  // Show loading state or loaded image
  return (
    <div className={`relative w-full h-full ${containerClassName}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 bg-[#111] animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full ${adaptive ? 'h-auto' : 'h-full'} ${className}`}
        style={{ objectFit: adaptive ? 'contain' : objectFit }}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

// Export placeholder for direct use
export { Placeholder, isKnownBrokenUrl };
