'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import Link from 'next/link'
import ImageWithPlaceholder from '../../components/ImagePlaceholder'
import ConfirmationModal, { ModalContentBox } from '../../components/ConfirmationModal'

export default function AdminBlog() {
  const { token } = useAuth()
  const { siteName } = useSite()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [showBulkDropdown, setShowBulkDropdown] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [showDraftModal, setShowDraftModal] = useState(null)
  const bulkDropdownRef = useRef(null)
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

  useEffect(() => {
    document.title = `Blog Manager | ${siteName}`
  }, [siteName])

  const loadBlogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/blogs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setBlogs(data)
    } catch (error) {
      console.error('Error loading blogs:', error)
    } finally {
      setLoading(false)
    }
  }, [API_URL, token])

  useEffect(() => {
    loadBlogs()
  }, [loadBlogs])

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    if (!showBulkDropdown) return
    
    function handleClickOutside(event) {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target)) {
        setShowBulkDropdown(false)
      }
    }
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 10)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showBulkDropdown])

  const handleDelete = async (id) => {
    setShowDeleteModal(null)
    await fetch(`${API_URL}/api/admin/blogs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    loadBlogs()
  }

  const confirmToggleStatus = (blog) => {
    if (blog.is_published) {
      // Moving to draft - show confirmation
      setShowDraftModal(blog)
    } else {
      // Publishing - show confirmation too
      setShowPublishModal(blog)
    }
  }

  const [showPublishModal, setShowPublishModal] = useState(null)
  const [showBulkActionModal, setShowBulkActionModal] = useState(false)

  const doTogglePublishStatus = async (blog) => {
    setShowDraftModal(null)
    setShowPublishModal(null)
    const newStatus = !blog.is_published
    
    try {
      const res = await fetch(`${API_URL}/api/admin/blogs/${blog.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...blog,
          is_published: newStatus
        })
      })
      
      if (res.ok) {
        loadBlogs()
      } else {
        alert('Failed to update post status')
      }
    } catch (error) {
      console.error('Error updating post:', error)
      alert('Failed to update post status')
    }
  }

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === blogs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(blogs.map(b => b.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const confirmBulkAction = () => {
    if (!bulkAction || selectedIds.length === 0) return
    setShowBulkActionModal(true)
  }

  const executeBulkAction = async () => {
    setShowBulkActionModal(false)
    setProcessing(true)
    
    try {
      for (const id of selectedIds) {
        const blog = blogs.find(b => b.id === id)
        if (!blog) continue
        
        if (bulkAction === 'delete') {
          await fetch(`${API_URL}/api/admin/blogs/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
        } else {
          const updates = {}
          if (bulkAction === 'publish') updates.is_published = true
          if (bulkAction === 'draft') updates.is_published = false
          if (bulkAction === 'comments_on') updates.comments_enabled = true
          if (bulkAction === 'comments_off') updates.comments_enabled = false
          
          await fetch(`${API_URL}/api/admin/blogs/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ ...blog, ...updates })
          })
        }
      }
      
      setSelectedIds([])
      setBulkAction('')
      loadBlogs()
    } catch (error) {
      console.error('Bulk action error:', error)
      alert('Some operations failed')
    } finally {
      setProcessing(false)
    }
  }

  // Get bulk action config for modal
  const getBulkActionConfig = () => {
    const configs = {
      publish: {
        icon: (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'green',
        title: 'Publish Posts',
        description: `${selectedIds.length} post(s) will be published and visible to everyone.`,
        buttonText: 'publish all'
      },
      draft: {
        icon: (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: 'yellow',
        title: 'Move to Draft',
        description: `${selectedIds.length} post(s) will be unpublished and hidden from public.`,
        buttonText: 'draft all'
      },
      delete: {
        icon: (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
        color: 'red',
        title: 'Delete Posts',
        description: `${selectedIds.length} post(s) will be permanently deleted along with their comments.`,
        buttonText: 'delete all',
        warning: 'This action cannot be undone'
      },
      comments_on: {
        icon: (
          <svg className="w-5 h-5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        color: 'purple',
        title: 'Enable Comments',
        description: `Comments will be enabled on ${selectedIds.length} post(s).`,
        buttonText: 'enable all'
      },
      comments_off: {
        icon: (
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
        color: 'orange',
        title: 'Disable Comments',
        description: `Comments will be disabled on ${selectedIds.length} post(s).`,
        buttonText: 'disable all'
      }
    }
    return configs[bulkAction] || configs.delete
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="font-mono">
      <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// blog_manager.php</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
        blog<span className="text-[#a78bfa]">_manage</span>
      </h1>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors"
        >
          + new_post
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <p className="text-white/30 text-xs mb-1">// total_posts</p>
          <p className="text-2xl font-bold text-white">{blogs.length}</p>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <p className="text-white/30 text-xs mb-1">// published</p>
          <p className="text-2xl font-bold text-green-400">{blogs.filter(b => b.is_published).length}</p>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <p className="text-white/30 text-xs mb-1">// drafts</p>
          <p className="text-2xl font-bold text-yellow-400">{blogs.filter(b => !b.is_published).length}</p>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <p className="text-white/30 text-xs mb-1">// total_views</p>
          <p className="text-2xl font-bold text-[#a78bfa]">{blogs.reduce((sum, b) => sum + (b.views || 0), 0)}</p>
        </div>
      </div>

      {/* Select All Header with Bulk Actions */}
      {blogs.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 border border-white/10 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.length === blogs.length && blogs.length > 0}
              onChange={toggleSelectAll}
              className="custom-checkbox"
            />
            <span className="text-white/50 text-xs">
              select_all
            </span>
            {selectedIds.length > 0 && (
              <span className="text-white/50 text-xs sm:hidden">({selectedIds.length})</span>
            )}
          </div>
          
          {/* Bulk Actions - Right Side */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-xs hidden sm:inline">{selectedIds.length} selected</span>
              
              {/* Custom Bulk Actions Dropdown */}
              <div ref={bulkDropdownRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowBulkDropdown(!showBulkDropdown)
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-1.5 border transition-colors text-xs min-w-[100px] sm:min-w-[120px] ${
                    showBulkDropdown 
                      ? 'bg-white/10 border-white/20 text-white' 
                      : 'bg-[#1a1a1a] border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span>{bulkAction || 'action'}</span>
                  <svg 
                    className={`w-3 h-3 text-white/40 transition-transform ${showBulkDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showBulkDropdown && (
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 bg-[#1a1a1a] border border-white/10 shadow-lg z-[100] min-w-[120px]">
                    {[
                      { value: 'publish', label: 'publish' },
                      { value: 'draft', label: 'draft' },
                      { value: 'comments_on', label: 'comments_on' },
                      { value: 'comments_off', label: 'comments_off' },
                      { value: 'delete', label: 'delete' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setBulkAction(option.value)
                          setShowBulkDropdown(false)
                        }}
                        className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                          bulkAction === option.value 
                            ? 'bg-[#a78bfa]/20 text-[#a78bfa]' 
                            : option.value === 'delete'
                            ? 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={confirmBulkAction}
                disabled={!bulkAction || processing}
                className="flex-shrink-0 px-3 py-1.5 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? '...' : 'apply'}
              </button>
              <button
                onClick={() => { setSelectedIds([]); setBulkAction('') }}
                className="flex-shrink-0 px-3 py-1.5 border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/20 transition-colors"
              >
                clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Blog List */}
      <div className="space-y-4">
        {blogs.map((blog, index) => {
          // Calculate post number: oldest = 01, newest = highest
          const postNumber = blogs.length - index;
          const postLabel = `post_${String(postNumber).padStart(2, '0')}`;
          return (
          <div 
            key={blog.id} 
            className={`group border bg-[#0a0a0a] overflow-hidden transition-colors ${
              selectedIds.includes(blog.id) 
                ? 'border-[#a78bfa]/50 bg-[#a78bfa]/5' 
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {/* Mobile Layout: Stacked */}
            <div className="md:hidden">
              {/* Image with checkbox overlay */}
              <div className="relative aspect-[2.5/1] overflow-hidden border-b border-white/10 bg-[#0a0a0a]">
                <ImageWithPlaceholder
                  src={blog.image}
                  alt={blog.title}
                  className="opacity-80"
                  objectFit="contain"
                />
                {/* Checkbox overlay - always visible on mobile */}
                <div className="absolute top-2 left-2 z-10">
                  <label className="flex items-center justify-center w-6 h-6 bg-black/60 border border-white/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(blog.id)}
                      onChange={() => toggleSelect(blog.id)}
                      className="custom-checkbox"
                    />
                  </label>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] text-white/30">{postLabel}</span>
                  {blog.is_featured && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa]">FEATURED</span>
                  )}
                  {!blog.is_published && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400">DRAFT</span>
                  )}
                </div>
                <h3 className="text-white text-sm font-medium mb-1 truncate">{blog.title}</h3>
                <p className="text-white/40 text-[11px] mb-2 line-clamp-1">{blog.excerpt}</p>
                <div className="flex items-center gap-2 text-[10px] flex-wrap">
                  <span className="px-1.5 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20">{blog.category}</span>
                  <span className="text-white/50">{formatDate(blog.created_at)}</span>
                  <span className="text-[#a78bfa]/70">{blog.views || 0} views</span>
                </div>
              </div>
              
              {/* Buttons - Mobile with icons */}
              <div className="flex border-t border-white/10">
                <a
                  href={blog.is_published ? `/blog/${blog.slug}` : `/blog/${blog.slug}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 text-[#a78bfa] text-xs hover:bg-[#a78bfa]/10 transition-colors text-center border-r border-white/10 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>view</span>
                </a>
                <Link
                  href={`/admin/blog/edit/${blog.slug}`}
                  className="flex-1 py-2.5 text-white/60 text-xs hover:bg-white/5 hover:text-white transition-colors text-center border-r border-white/10 flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>edit</span>
                </Link>
                <button
                  onClick={() => confirmToggleStatus(blog)}
                  className={`flex-1 py-2.5 text-xs transition-colors text-center border-r border-white/10 flex items-center justify-center gap-1.5 ${
                    blog.is_published 
                      ? 'text-yellow-400/70 hover:bg-yellow-500/10' 
                      : 'text-green-400/70 hover:bg-green-500/10'
                  }`}
                >
                  {blog.is_published ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>draft</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>publish</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(blog)}
                  className="flex-1 py-2.5 text-red-400/70 text-xs hover:bg-red-500/10 transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>delete</span>
                </button>
              </div>
            </div>
            
            {/* Desktop Layout: Row with hover checkbox */}
            <div className="hidden md:flex md:flex-row">
              {/* Image with checkbox overlay on hover */}
              <div className="relative w-44 aspect-video flex-shrink-0 border-r border-white/10 overflow-hidden bg-[#0a0a0a]">
                <ImageWithPlaceholder
                  src={blog.image}
                  alt={blog.title}
                  className="opacity-80"
                  objectFit="contain"
                />
                {/* Checkbox overlay - visible on hover */}
                <div className={`absolute top-2 left-2 z-10 transition-opacity ${selectedIds.includes(blog.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <label className="flex items-center justify-center w-6 h-6 bg-black/60 border border-white/20 cursor-pointer hover:bg-black/80">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(blog.id)}
                      onChange={() => toggleSelect(blog.id)}
                      className="custom-checkbox"
                    />
                  </label>
                </div>
              </div>
              
              <div className="flex-1 min-w-0 p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-white/30">{postLabel}</span>
                  {blog.is_featured && (
                    <span className="text-[10px] px-2 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa]">FEATURED</span>
                  )}
                  {!blog.is_published && (
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400">DRAFT</span>
                  )}
                  {!blog.comments_enabled && (
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400">comments_disabled</span>
                  )}
                </div>
                <h3 className="text-white text-base font-medium mb-1 truncate">{blog.title}</h3>
                <p className="text-white/40 text-xs mb-2 line-clamp-1">{blog.excerpt}</p>
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  <span className="px-2 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20">{blog.category}</span>
                  <span className="text-white/50">{formatDate(blog.created_at)}</span>
                  <span className="text-white/50">{blog.reading_time} min read</span>
                  <span className="text-[#a78bfa]/70">{blog.views || 0} views</span>
                </div>
              </div>
              <div className="flex flex-col border-l border-white/10">
                <a
                  href={blog.is_published ? `/blog/${blog.slug}` : `/blog/${blog.slug}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 text-[#a78bfa] text-xs hover:bg-[#a78bfa]/10 transition-colors text-center border-b border-white/10 flex items-center justify-center gap-1.5"
                  title="View post"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>view</span>
                </a>
                <Link
                  href={`/admin/blog/edit/${blog.slug}`}
                  className="px-4 py-2.5 text-white/60 text-xs hover:bg-white/5 hover:text-white transition-colors text-center border-b border-white/10 flex items-center justify-center gap-1.5"
                  title="Edit post"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>edit</span>
                </Link>
                <button
                  onClick={() => confirmToggleStatus(blog)}
                  className={`px-4 py-2.5 text-xs transition-colors text-center border-b border-white/10 flex items-center justify-center gap-1.5 ${
                    blog.is_published 
                      ? 'text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-400' 
                      : 'text-green-400/70 hover:bg-green-500/10 hover:text-green-400'
                  }`}
                  title={blog.is_published ? 'Move to draft' : 'Publish'}
                >
                  {blog.is_published ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>draft</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>publish</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(blog)}
                  className="px-4 py-2.5 text-red-400/70 text-xs hover:bg-red-500/10 hover:text-red-400 transition-colors text-center flex items-center justify-center gap-1.5"
                  title="Delete post"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>delete</span>
                </button>
              </div>
            </div>
          </div>
        )})}
      </div>

      {blogs.length === 0 && (
        <div className="border border-white/10 p-8 text-center">
          <p className="text-white/30 text-sm">// posts = null;</p>
          <p className="text-white/50 text-xs mt-2">No blog posts yet. Create your first one!</p>
          <Link 
            href="/admin/blog/new"
            className="inline-block mt-4 px-4 py-2 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors"
          >
            + new_post
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => handleDelete(showDeleteModal?.id)}
        variant="danger"
        label="delete_post"
        title="Confirm Deletion"
        description="This post will be permanently removed:"
        warningText="All comments will also be deleted"
      >
        {showDeleteModal && (
          <ModalContentBox>
            <p className="text-white text-sm font-medium line-clamp-2">{showDeleteModal.title}</p>
            <p className="text-white/40 text-xs mt-1">/{showDeleteModal.slug}</p>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Draft Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDraftModal}
        onClose={() => setShowDraftModal(null)}
        onConfirm={() => doTogglePublishStatus(showDraftModal)}
        variant="warning"
        label="unpublish"
        title="Move to Draft"
        description="This post will be removed from public view:"
        confirmText="move to draft"
        warningText="You can republish anytime"
      >
        {showDraftModal && (
          <ModalContentBox>
            <p className="text-white text-sm font-medium line-clamp-2">{showDraftModal.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px]">PUBLISHED</span>
              <span className="text-white/30 text-xs">→</span>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px]">DRAFT</span>
            </div>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Publish Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showPublishModal}
        onClose={() => setShowPublishModal(null)}
        onConfirm={() => doTogglePublishStatus(showPublishModal)}
        variant="success"
        label="publish"
        title="Publish Post"
        description="This post will be visible to everyone:"
        confirmText="publish"
        warningText="Post will be live immediately"
      >
        {showPublishModal && (
          <ModalContentBox>
            <p className="text-white text-sm font-medium line-clamp-2">{showPublishModal.title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px]">DRAFT</span>
              <span className="text-white/30 text-xs">→</span>
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px]">PUBLISHED</span>
            </div>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Bulk Action Confirmation Modal */}
      {showBulkActionModal && bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBulkActionModal(false)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-white/10 bg-${getBulkActionConfig().color}-500/5`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${getBulkActionConfig().color}-500/20 border border-${getBulkActionConfig().color}-500/30 flex items-center justify-center`}>
                  {getBulkActionConfig().icon}
                </div>
                <div>
                  <p className={`text-${getBulkActionConfig().color}-400 text-[10px] tracking-[0.2em]`}>{`// bulk_${bulkAction}`}</p>
                  <h3 className="text-white font-medium text-lg">{getBulkActionConfig().title}</h3>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-white/60 text-sm mb-4">{getBulkActionConfig().description}</p>
              <div className="bg-white/5 border border-white/10 px-4 py-3 max-h-32 overflow-y-auto">
                {selectedIds.slice(0, 5).map((id, i) => {
                  const blog = blogs.find(b => b.id === id)
                  return (
                    <p key={i} className="text-xs text-white/50 truncate">{blog?.title || id}</p>
                  )
                })}
                {selectedIds.length > 5 && (
                  <p className="text-white/30 text-xs mt-2">...and {selectedIds.length - 5} more</p>
                )}
              </div>
              {getBulkActionConfig().warning && (
                <p className="text-white/40 text-xs mt-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getBulkActionConfig().warning}
                </p>
              )}
            </div>
            
            {/* Actions */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkActionModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-white/70 text-sm hover:bg-white/5 hover:text-white transition-all"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={executeBulkAction}
                className={`flex-1 px-4 py-2.5 text-sm transition-all font-medium flex items-center justify-center gap-2 ${
                  bulkAction === 'delete' 
                    ? 'bg-red-500 text-black hover:bg-red-600' 
                    : bulkAction === 'draft'
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : bulkAction === 'publish'
                    ? 'bg-green-500 text-black hover:bg-green-400'
                    : bulkAction === 'comments_off'
                    ? 'bg-orange-500 text-black hover:bg-orange-400'
                    : 'bg-[#a78bfa] text-black hover:bg-[#c4b5fd]'
                }`}
              >
                {getBulkActionConfig().buttonIcon}
                {getBulkActionConfig().buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
