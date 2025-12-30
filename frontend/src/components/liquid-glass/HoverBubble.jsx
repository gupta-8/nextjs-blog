'use client'
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Floating Hover Bubble - Rendered via Portal to capture page background
 * Creates a liquid glass effect bubble that follows the cursor
 */
export default function HoverBubble({ isHovering, mouseX, headerRect, filterId }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!headerRect || !mounted) return null;
  
  // Calculate absolute position based on header position
  const bubbleLeft = headerRect.left + Math.max(25, Math.min(mouseX, headerRect.width - 25));
  const bubbleTop = headerRect.top + headerRect.height / 2;
  
  return createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: `${bubbleLeft}px`,
        top: `${bubbleTop}px`,
        transform: `translate(-50%, -50%) scale(${isHovering ? 1.4 : 0.8})`,
        opacity: isHovering ? 1 : 0,
        width: '90px',
        height: '50px',
        borderRadius: '9999px',
        background: 'rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: `
          inset 0 1px 2px rgba(255, 255, 255, 0.15),
          inset 1px 0 2px rgba(255, 255, 255, 0.08),
          inset 0 -1px 2px rgba(0, 0, 0, 0.3),
          inset -1px 0 2px rgba(0, 0, 0, 0.15),
          0 0 30px rgba(0, 0, 0, 0.4),
          0 8px 32px rgba(0, 0, 0, 0.4)
        `,
        backdropFilter: `url(#${filterId}_filter_hover) blur(0.1px) saturate(1.1) brightness(1.01)`,
        WebkitBackdropFilter: `url(#${filterId}_filter_hover) blur(0.1px) saturate(1.1) brightness(1.01)`,
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 51,
      }}
    />,
    document.body
  );
}
