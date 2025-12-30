'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AdminLayout from '@/components/AdminLayout'

export default function AdminLayoutWrapper({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  // Only set ready when loading is complete
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure auth state is fully propagated
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

  // Show loading while auth is being checked
  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/50 font-mono">Loading...</p>
      </div>
    )
  }

  // Login page doesn't need AdminLayout
  if (pathname === '/admin/login') {
    return children
  }

  // Protected admin pages need authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/50 font-mono">Redirecting...</p>
      </div>
    )
  }

  return <AdminLayout>{children}</AdminLayout>
}
