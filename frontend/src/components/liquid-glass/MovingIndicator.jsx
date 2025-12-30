'use client'
import React, { useState, useEffect } from 'react';

/**
 * Moving Active Indicator - Smoothly follows cursor/finger during interaction
 * Shows which nav item is currently active or being hovered
 */
export default function MovingIndicator({ 
  targetIndex, 
  itemRefs, 
  containerRef, 
  isInteracting, 
  isMobile 
}) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  
  useEffect(() => {
    if (targetIndex < 0 || !itemRefs.current[targetIndex] || !containerRef.current) {
      return;
    }
    
    const itemEl = itemRefs.current[targetIndex];
    const containerEl = containerRef.current;
    
    if (!itemEl || !containerEl) return;
    
    const itemRect = itemEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    
    const left = itemRect.left - containerRect.left;
    const width = itemRect.width;
    
    setIndicatorStyle({
      left,
      width,
      opacity: 1,
    });
  }, [targetIndex, itemRefs, containerRef, isInteracting]);
  
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: `${indicatorStyle.left}px`,
        width: `${indicatorStyle.width}px`,
        opacity: indicatorStyle.opacity,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '9999px',
        transition: isInteracting 
          ? 'left 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), width 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s ease'
          : 'left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
        zIndex: 0,
      }}
    />
  );
}
