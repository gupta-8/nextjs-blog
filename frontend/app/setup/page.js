'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || ''

  // Check if setup is required
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/setup-status`)
        const data = await res.json()
        
        if (data.setup_required) {
          setSetupRequired(true)
        } else {
          router.push('/admin/login')
        }
      } catch (err) {
        setError('Failed to check setup status')
      } finally {
        setLoading(false)
      }
    }
    
    checkSetupStatus()
  }, [API_URL, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.name.trim()) {
      setError('name is required')
      return
    }
    
    if (!formData.email.includes('@')) {
      setError('invalid email format')
      return
    }
    
    if (formData.password.length < 8) {
      setError('password must be at least 8 characters')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('passwords do not match')
      return
    }
    
    setSubmitting(true)
    
    try {
      const res = await fetch(`${API_URL}/api/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.detail || 'Setup failed')
      }
      
      setSuccess(true)
      setTimeout(() => router.push('/admin/login'), 2000)
      
    } catch (err) {
      setError(err.message || 'setup failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state - matches admin pages
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 text-sm font-mono">checking_status...</p>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-[#a78bfa] text-xs font-mono mb-2">// setup_complete.php</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">setup<span className="text-[#a78bfa]">_complete</span></h1>
          </div>
          
          <div className="border border-white/10 bg-white/[0.02] p-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 border border-green-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-white/80 text-sm mb-2">Admin account created successfully</p>
              <p className="text-white/40 text-xs font-mono">redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!setupRequired) return null

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#a78bfa] text-xs font-mono mb-2">// initial_setup.php</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">admin<span className="text-[#a78bfa]">_setup</span></h1>
          <p className="text-white/40 text-sm mt-2 font-mono">// Create your admin account</p>
        </div>

        {/* Form Card */}
        <div className="border border-white/10 bg-white/[0.02] p-6">
          {/* Form Header */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-white/30 text-xs font-mono">// setup_form</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#a78bfa]"></div>
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
              <div className="w-2 h-2 rounded-full bg-white/20"></div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono">
              error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label className="block text-white/50 text-xs mb-2 font-mono">name =</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors font-mono"
                placeholder="'John Doe'"
                disabled={submitting}
                autoFocus
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white/50 text-xs mb-2 font-mono">email =</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors font-mono"
                placeholder="'admin@example.com'"
                disabled={submitting}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white/50 text-xs mb-2 font-mono">password =</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors font-mono"
                  placeholder="'••••••••'"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-white/30 text-xs mt-1 font-mono">// min 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-white/50 text-xs mb-2 font-mono">confirm_password =</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors font-mono"
                placeholder="'••••••••'"
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50 font-mono"
            >
              {submitting ? 'creating_account...' : 'create_admin'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/30 text-xs font-mono text-center">
              // This page is only accessible when no admin exists
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <Link 
            href="/"
            className="text-white/30 text-xs hover:text-[#a78bfa] font-mono transition-colors"
          >
            ↗ back to site
          </Link>
        </div>
      </div>
    </div>
  )
}
