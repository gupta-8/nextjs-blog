'use client'
import React from 'react';
import { useNavigate, useLocation, Outlet } from '@/lib/router-compat';
import { LiquidGlassHeader } from './FluidGlass';
import useDynamicFavicon from '@/hooks/useDynamicFavicon';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' }
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Apply dynamic favicon based on profile logo
  useDynamicFavicon();

  const handleNavClick = (href) => {
    navigate(href);
    // Use instant scroll for faster perceived navigation
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#0a0a0f]">
      {/* Skip to main content - accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#a78bfa] focus:text-black focus:px-4 focus:py-2"
      >
        Skip to main content
      </a>
      
      {/* Main Content with proper landmark */}
      <main id="main-content" role="main">
        {children}
      </main>

      {/* Fixed Bottom Navigation Pill */}
      <nav 
        className="fixed bottom-4 left-0 right-0 z-50 px-4"
        aria-label="Main navigation"
      >
        <div className="max-w-2xl mx-auto flex justify-center">
          <LiquidGlassHeader 
            items={navItems} 
            onNavClick={handleNavClick}
            logo="H."
            currentPath={location.pathname}
          />
        </div>
      </nav>
    </div>
  );
}
