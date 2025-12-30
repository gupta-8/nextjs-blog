import AdminLayoutClient from '@/components/AdminLayoutClient'

export const metadata = {
  robots: { index: false, follow: false },
}

// Server-rendered admin shell for instant LCP
// This renders the sidebar and navigation skeleton immediately
const sidebarNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { label: 'Profile', href: '/admin/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { label: 'Files', href: '/admin/files', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Blog', href: '/admin/blog', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { label: 'Comments', href: '/admin/comments', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { label: 'Security', href: '/admin/security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
]

function ServerAdminShell({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          <a href="/admin/dashboard" className="text-[#a78bfa] text-lg font-bold">A.</a>
          <div className="p-2 text-white/70">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-64 bg-[#0a0a0a] border-r border-white/10 z-40">
        <div className="p-4 pt-6 flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="mb-8">
            <a href="/admin/dashboard" className="block">
              <span className="text-[#a78bfa] text-xl font-bold">Admin.</span>
              <span className="text-white/30 text-[10px] block">// loading</span>
            </a>
          </div>

          {/* Navigation Skeleton */}
          <nav className="space-y-1">
            {sidebarNavItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 border-l-2 border-transparent text-white/50 hover:text-white hover:border-white/20"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span className="text-sm">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-1">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-white/50 hover:text-white text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>View Site</span>
          </a>
          <div className="flex items-center gap-3 px-4 py-2.5 text-red-400/50 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pt-8 pb-8 px-4 lg:px-8 min-h-screen lg:ml-64">
        {children}
      </main>
    </div>
  )
}

export default function AdminLayout({ children }) {
  return (
    <>
      {/* Server-rendered shell for noscript/SEO */}
      <noscript>
        <ServerAdminShell>{children}</ServerAdminShell>
      </noscript>
      {/* Client component with full interactivity and auth */}
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </>
  )
}
