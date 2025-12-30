'use client'
import React from 'react';

// Default icons for navigation items
const DEFAULT_ICONS = {
  'Home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'Blog': 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  'About': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'Projects': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
  'Contact': 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  'Dashboard': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'Profile': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'Skills': 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  'Messages': 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
};

/**
 * Desktop Navigation Item Button
 */
export function DesktopNavItem({ item, index, isHighlighted, onClick, itemRef }) {
  const iconPath = item.icon || DEFAULT_ICONS[item.label] || DEFAULT_ICONS['Home'];
  
  return (
    <button
      ref={itemRef}
      onClick={() => onClick?.(item.href)}
      className="relative flex flex-col items-center gap-0 px-4 py-2 rounded-full transition-all duration-200 z-10 min-w-[48px] min-h-[44px]"
      aria-label={`Navigate to ${item.label}`}
      aria-current={isHighlighted ? 'page' : undefined}
    >
      <span className={`transition-colors duration-150 ${
        isHighlighted ? 'text-[#a78bfa]' : 'text-white/70'
      }`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </span>
      <span className={`text-[10px] transition-colors duration-150 ${
        isHighlighted ? 'text-[#a78bfa]' : 'text-white/70'
      }`}>
        {item.label}
      </span>
    </button>
  );
}

/**
 * Mobile Navigation Item (non-button, touch controlled by parent)
 */
export function MobileNavItem({ item, index, isHighlighted, itemRef }) {
  const iconPath = item.icon || DEFAULT_ICONS[item.label] || DEFAULT_ICONS['Home'];
  
  return (
    <div
      ref={itemRef}
      className="flex flex-col items-center gap-0 px-4 py-2 rounded-full pointer-events-none transition-all duration-200 z-10 min-w-[48px] min-h-[44px]"
      role="button"
      aria-label={`Navigate to ${item.label}`}
      tabIndex={0}
    >
      <span className={`transition-colors duration-150 ${
        isHighlighted ? 'text-[#a78bfa]' : 'text-white/70'
      }`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </span>
      <span className={`text-[9px] transition-colors duration-150 ${
        isHighlighted ? 'text-[#a78bfa]' : 'text-white/70'
      }`}>
        {item.label}
      </span>
    </div>
  );
}
