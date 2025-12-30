'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/login')
  }, [router])
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-white/50 font-mono">Redirecting...</p>
    </div>
  )
}
