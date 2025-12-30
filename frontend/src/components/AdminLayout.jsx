'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, Outlet, Link, useLocation, useNavigate } from '@/lib/router-compat';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';

const sidebarNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { label: 'Profile', href: '/admin/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Files', href: '/admin/files', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Blog', href: '/admin/blog', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { label: 'Comments', href: '/admin/comments', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { label: 'Security', href: '/admin/security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
];

// Update favicon dynamically
function updateFavicon(logoUrl) {
  if (typeof document === 'undefined') return;
  
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll('link[rel*="icon"]');
  existingLinks.forEach(link => link.remove());
  
  // Add new favicon
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = logoUrl;
  document.head.appendChild(link);
  
  // Also update apple-touch-icon
  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.href = logoUrl;
  document.head.appendChild(appleLink);
}

// Render logo based on profile
// For mobile: always show text name with dot
// For desktop: show logo image if available, otherwise text
function renderLogo(profile, siteName, size = 'normal', collapsed = false, isMobile = false) {
  const displayName = profile?.name || siteName || 'Site';
  
  // Mobile always shows text only (no logo image)
  if (isMobile) {
    return (
      <span className="text-[#a78bfa] text-lg font-bold">{displayName}.</span>
    );
  }
  
  // Desktop: show logo image if available
  if (profile?.logo) {
    return (
      <img 
        src={profile.logo} 
        alt="Logo" 
        className={collapsed ? 'w-8 h-8 object-contain' : size === 'small' ? 'w-6 h-6 object-contain' : 'w-8 h-8 object-contain'}
      />
    );
  }
  // Fallback to text logo - use dynamic site name
  return collapsed ? (
    <span className="text-[#a78bfa] text-xl font-bold">{displayName.charAt(0)}.</span>
  ) : (
    <span className="text-[#a78bfa] text-xl font-bold">{displayName}.</span>
  );
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { siteName } = useSite();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Fetch profile to get logo
  useEffect(() => {
    fetch(`${API_URL}/api/profile`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setProfile(data);
        }
      })
      .catch(console.error);
  }, [API_URL]);

  // Update favicon when profile logo changes
  useEffect(() => {
    if (profile?.logo) {
      updateFavicon(profile.logo);
    }
  }, [profile?.logo]);

  // Close mobile menu on navigation - use callback in Link clicks instead
  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    navigate(href);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            {renderLogo(profile, siteName, 'small', false, true)}
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white/70 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`lg:hidden fixed top-14 right-0 bottom-0 z-50 w-64 bg-[#0a0a0a] border-l border-white/10 transform transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4">
          {/* User Info */}
          <div className="pb-4 mb-4 border-b border-white/10">
            <p className="text-white text-sm font-medium">Admin Panel</p>
            <p className="text-white/40 text-xs">{user?.email}</p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#a78bfa]/10 text-[#a78bfa]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>View Site</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400/70 hover:text-red-400 text-sm transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-[#0a0a0a] border-r border-white/10 transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-[#0a0a0a] border border-white/20 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-colors z-50"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className={`w-3 h-3 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="p-4 pt-6 flex-1 overflow-y-auto">
          {/* Logo - Expanded */}
          <div className={`mb-8 transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              {renderLogo(profile, siteName)}
              {!profile?.logo && <span className="text-white/30 text-[10px] block">// admin</span>}
            </Link>
          </div>

          {/* Logo - Collapsed */}
          <div className={`mb-8 flex justify-center transition-all duration-300 ${sidebarCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <Link href="/admin/dashboard">
              {renderLogo(profile, siteName, 'normal', true)}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 py-2.5 transition-all duration-200 ${
                    sidebarCollapsed ? 'px-0 justify-center' : 'px-4'
                  } ${
                    isActive
                      ? `border-l-2 border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/5 ${sidebarCollapsed ? 'border-l-0 bg-[#a78bfa]/10 rounded' : ''}`
                      : `border-l-2 border-transparent text-white/50 hover:text-white hover:border-white/20 ${sidebarCollapsed ? 'border-l-0 hover:bg-white/5 rounded' : ''}`
                  }`}
                >
                  <svg className={`flex-shrink-0 ${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <span className={`transition-all duration-300 whitespace-nowrap text-sm ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-white/10 space-y-1 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={sidebarCollapsed ? 'View Site' : undefined}
            className={`flex items-center gap-3 py-2.5 text-white/50 hover:text-white transition-colors text-sm ${
              sidebarCollapsed ? 'px-0 justify-center' : 'px-4'
            }`}
          >
            <svg className={`flex-shrink-0 ${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
              View Site
            </span>
          </a>
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 py-2.5 text-red-400/50 hover:text-red-400 transition-colors text-sm ${
              sidebarCollapsed ? 'px-0 justify-center' : 'px-4'
            }`}
          >
            <svg className={`flex-shrink-0 ${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className={`transition-all duration-300 whitespace-nowrap ${sidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`pt-20 sm:pt-18 lg:pt-8 pb-8 px-4 sm:px-6 lg:px-8 xl:px-12 min-h-screen transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        {children}
      </main>
    </div>
  );
}
