'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import AdminLayout from '@/components/AdminLayout'

// Loading skeleton that matches the admin layout
function AdminLoadingSkeleton({ siteName, loading }) {
  // Only show name if it's loaded from cache/API, otherwise show loading indicator
  const hasName = siteName && siteName !== 'Admin';
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono">
      {/* Mobile Header Skeleton */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 h-14">
          {hasName ? (
            <span className="text-[#a78bfa] text-lg font-bold">{siteName}.</span>
          ) : (
            <span className="text-[#a78bfa] text-lg font-bold animate-pulse">...</span>
          )}
          <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
        </div>
      </header>

      {/* Desktop Sidebar Skeleton */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-screen w-64 bg-[#0a0a0a] border-r border-white/10 z-40">
        <div className="p-4 pt-6 flex-1">
          <div className="mb-8">
            {hasName ? (
              <>
                <span className="text-[#a78bfa] text-xl font-bold">{siteName}.</span>
                <span className="text-white/30 text-[10px] block">// admin</span>
              </>
            ) : (
              <>
                <span className="text-[#a78bfa] text-xl font-bold animate-pulse">...</span>
                <span className="text-white/30 text-[10px] block">// loading</span>
              </>
            )}
          </div>
          <nav className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Loading - Centered */}
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-1">
            <span className="w-2 h-2 bg-[#a78bfa] animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-[#a78bfa] animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-[#a78bfa] animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-white/40 text-xs">loading...</p>
        </div>
      </main>
    </div>
  )
}

export default function AdminLayoutClient({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const { siteName } = useSite()
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  // Only set ready when loading is complete
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Handle redirect to login
  useEffect(() => {
    if (isReady && !isAuthenticated && pathname !== '/admin/login') {
      router.replace('/admin/login')
    }
  }, [isReady, isAuthenticated, pathname, router])

  // Show loading skeleton while auth is being checked
  if (!isReady) {
    return <AdminLoadingSkeleton siteName={siteName} />
  }

  // Login page doesn't need AdminLayout
  if (pathname === '/admin/login') {
    return children
  }

  // Protected admin pages need authentication
  if (!isAuthenticated) {
    return <AdminLoadingSkeleton siteName={siteName} />
  }

  return <AdminLayout>{children}</AdminLayout>
}
