'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'

// Dynamically import Simple editor to avoid SSR issues
const SimpleEditor = dynamic(
  () => import('./SimpleEditor'),
  { ssr: false, loading: () => <div className="animate-pulse h-64 bg-white/5 rounded-lg" /> }
)

export default function BlogEditorPage({ blogId = null, isNew = true }) {
  const router = useRouter()
  const { token, user } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL
  
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(true) // Default to true on desktop
  const [showToolbar, setShowToolbar] = useState(false) // Hide editor toolbar by default
  const [content, setContent] = useState('')
  const [blogRealId, setBlogRealId] = useState(null) // Store actual blog ID for API calls
  const [isNewPost, setIsNewPost] = useState(isNew) // Track if this is a new post (can change after first save)
  const initialLoadDone = useRef(false)
  
  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('General')
  const [tags, setTags] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [authorName, setAuthorName] = useState('')
  const [authorRole, setAuthorRole] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUrlMode, setImageUrlMode] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  
  // New category state
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Drag and drop state for featured image
  const [isDragging, setIsDragging] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const categoryDropdownRef = useRef(null)

  // Categories - loaded from API
  const [categories, setCategories] = useState(['General'])

  // Add new category - API call
  const addCategory = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      setShowNewCategory(false)
      setNewCategoryName('')
      return
    }
    
    // Check if already exists locally
    if (categories.includes(trimmed)) {
      setCategory(trimmed)
      setShowNewCategory(false)
      setNewCategoryName('')
      return
    }
    
    setCategoryLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmed })
      })
      
      if (res.ok) {
        setCategories([...categories, trimmed])
        setCategory(trimmed)
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Failed to create category')
    } finally {
      setCategoryLoading(false)
      setShowNewCategory(false)
      setNewCategoryName('')
    }
  }

  // Delete category - API call
  const deleteCategory = async () => {
    if (category.toLowerCase() === 'general') {
      alert('Cannot delete the default General category')
      setShowDeleteConfirm(false)
      return
    }
    
    setCategoryLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const newCategories = categories.filter(c => c !== category)
        setCategories(newCategories)
        setCategory('General')
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
    } finally {
      setCategoryLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  // Load categories from API
  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const categoryNames = data.map(c => c.name)
        // Ensure General is always first
        if (!categoryNames.includes('General')) {
          categoryNames.unshift('General')
        }
        setCategories(categoryNames)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Load categories on mount
  useEffect(() => {
    if (token) {
      loadCategories()
    }
  }, [token])

  // Close category dropdown when clicking outside
  useEffect(() => {
    if (!showCategoryDropdown) return
    
    function handleClickOutside(event) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false)
      }
    }
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 10)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showCategoryDropdown])

  // Load blog if editing
  useEffect(() => {
    if (!isNew && blogId && token && !initialLoadDone.current) {
      loadBlog()
    }
  }, [isNew, blogId, token])

  const loadBlog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/blogs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const blogs = await res.json()
      // Find blog by slug (blogId is actually the slug)
      const blog = blogs.find(b => b.slug === blogId || b.id === blogId)
      
      if (blog) {
        setTitle(blog.title || '')
        setSlug(blog.slug || '')
        setSlugManuallyEdited(true) // Mark as manually edited to prevent auto-update
        setExcerpt(blog.excerpt || '')
        setCategory(blog.category || 'General')
        setTags(blog.tags?.join(', ') || '')
        setFeaturedImage(blog.image || '')
        setImagePreview(blog.image || '')
        setIsPublished(blog.is_published !== false)
        setIsFeatured(blog.is_featured || false)
        setCommentsEnabled(blog.comments_enabled !== false)
        setAuthorName(blog.author_name || '')
        setAuthorRole(blog.author_role || '')
        setContent(blog.content || '')
        // Store the actual blog ID for API calls
        setBlogRealId(blog.id)
        initialLoadDone.current = true
      }
    } catch (error) {
      console.error('Error loading blog:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate slug from title (always sync unless manually edited)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  
  useEffect(() => {
    if (title && !slugManuallyEdited) {
      setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }, [title, slugManuallyEdited])

  // Handle editor changes
  const handleEditorChange = useCallback((html) => {
    setContent(html)
  }, [])

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const imageUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`
      setFeaturedImage(imageUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
      setImagePreview('')
    } finally {
      setUploading(false)
    }
  }

  // Handle drag and drop for featured image
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const file = files[0]
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please drop an image (JPEG, PNG, GIF, or WebP)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload the file
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const imageUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`
      setFeaturedImage(imageUrl)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
      setImagePreview('')
    } finally {
      setUploading(false)
    }
  }, [API_URL, token])

  // Load images from library
  const loadLibraryImages = async () => {
    setLoadingLibrary(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Filter only images
        const images = data.filter(f => f.is_image)
        setLibraryImages(images)
      }
    } catch (error) {
      console.error('Failed to load library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Select image from library
  const selectLibraryImage = (imageUrl) => {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`
    setFeaturedImage(fullUrl)
    setImagePreview(fullUrl)
    setShowImageLibrary(false)
  }

  // Calculate reading time
  const calculateReadingTime = () => {
    const text = content.replace(/<[^>]*>/g, '')
    const words = text.split(/\s+/).filter(w => w).length
    return Math.max(1, Math.ceil(words / 200))
  }

  // Save blog
  const [saveState, setSaveState] = useState(null) // 'draft', 'published', 'saved'
  const [savedSlug, setSavedSlug] = useState('')
  const autoSaveTimerRef = useRef(null)

  // Check if editing a published post
  const isEditingPublished = !isNewPost && isPublished

  const saveBlog = async (publish = null, isAutoSave = false) => {
    if (!title.trim()) {
      if (!isAutoSave) alert('Title is required')
      return
    }

    setSaving(true)
    try {
      const blogData = {
        title: title.trim(),
        slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        content,
        excerpt: excerpt.trim(),
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        image: featuredImage,
        is_published: publish !== null ? publish : isPublished,
        is_featured: isFeatured,
        comments_enabled: commentsEnabled,
        author_name: authorName || user?.name || 'Admin',
        author_role: authorRole,
        reading_time: calculateReadingTime()
      }

      const url = isNewPost 
        ? `${API_URL}/api/admin/blogs`
        : `${API_URL}/api/admin/blogs/${blogRealId || blogId}`

      const res = await fetch(url, {
        method: isNewPost ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blogData)
      })

      if (res.ok) {
        const savedBlog = await res.json()
        const newSlug = savedBlog.slug || blogData.slug
        setSavedSlug(newSlug)
        
        // Determine save state based on action
        if (publish === true) {
          // Publishing - stay on page, show published banner
          setSaveState('published')
          setIsPublished(true)
        } else if (publish === false) {
          // Saving as draft
          setSaveState('draft')
          setIsPublished(false)
        } else if (isEditingPublished || isPublished) {
          // Saving changes to published post
          setSaveState('saved')
        } else {
          // Default to draft
          setSaveState('draft')
        }
        
        // If it was a new post, update state and URL
        if (isNewPost && savedBlog.slug) {
          setBlogRealId(savedBlog.id)
          setIsNewPost(false) // Mark as no longer new after first save
          window.history.replaceState({}, '', `/admin/blog/edit/${savedBlog.slug}`)
        }
        
        // Keep banner visible for 6 seconds
        setTimeout(() => {
          setSaveState(null)
        }, 6000)
      } else {
        const error = await res.json()
        if (!isAutoSave) alert(error.detail || 'Failed to save blog')
      }
    } catch (error) {
      console.error('Error saving blog:', error)
      if (!isAutoSave) alert('Error saving blog')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save every 60 seconds for drafts
  useEffect(() => {
    // Only auto-save if we have a title and it's not published
    if (!title.trim()) return
    
    const autoSave = () => {
      if (!isPublished && title.trim()) {
        saveBlog(null, true) // Auto-save mode - keeps current publish state
      }
    }
    
    // Set up interval
    autoSaveTimerRef.current = setInterval(autoSave, 60000) // 60 seconds
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, []) // Empty deps - only set up once
  
  // Also auto-save when content changes significantly (debounced)
  const contentChangeTimerRef = useRef(null)
  useEffect(() => {
    if (!title.trim() || isPublished) return
    
    // Debounce content changes - save after 5 seconds of no changes
    if (contentChangeTimerRef.current) {
      clearTimeout(contentChangeTimerRef.current)
    }
    
    contentChangeTimerRef.current = setTimeout(() => {
      if (title.trim() && !isPublished) {
        saveBlog(null, true) // Auto-save
      }
    }, 5000) // 5 seconds after last change
    
    return () => {
      if (contentChangeTimerRef.current) {
        clearTimeout(contentChangeTimerRef.current)
      }
    }
  }, [content, title, excerpt])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-white/50 text-sm">loading post...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/blog')}
              className="text-white/50 hover:text-white flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">back</span>
            </button>
            <span className="text-white/30 text-sm hidden sm:inline">
              // {isNew ? 'new_post' : 'edit_post'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded transition-colors ${showSettings ? 'bg-[#a78bfa]/20 text-[#a78bfa]' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              title="Post settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Save Draft button - only for unpublished posts */}
            {!isEditingPublished && (
              <button
                onClick={() => saveBlog(false)}
                disabled={saving}
                className={`px-4 py-2 border text-sm transition-colors disabled:opacity-50 ${
                  saveState === 'draft'
                    ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' 
                    : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                }`}
              >
                {saving ? 'saving...' : saveState === 'draft' ? 'saved ✓' : 'save_draft'}
              </button>
            )}
            
            {/* View Post button - only for editing published posts */}
            {isEditingPublished && slug && (
              <a
                href={`/blog/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-white/10 text-white/70 text-sm hover:border-white/20 hover:text-white transition-colors flex items-center gap-2"
              >
                view_post
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            
            {/* Save button - only for editing published posts */}
            {isEditingPublished && (
              <button
                onClick={() => saveBlog(null)}
                disabled={saving}
                className={`px-4 py-2 border text-sm transition-colors disabled:opacity-50 ${
                  saveState === 'saved'
                    ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' 
                    : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                }`}
              >
                {saving ? 'saving...' : saveState === 'saved' ? 'saved ✓' : 'save'}
              </button>
            )}
            
            {/* Publish button - only for unpublished posts */}
            {!isEditingPublished && (
              <button
                onClick={() => saveBlog(true)}
                disabled={saving}
                className={`px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  saveState === 'published'
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-[#a78bfa] text-black hover:bg-[#c4b5fd]'
                }`}
              >
                {saving ? 'publishing...' : saveState === 'published' ? 'published ✓' : 'publish'}
              </button>
            )}
          </div>
        </div>
        
        {/* Banner removed from header - now at bottom left */}
      </div>

      {/* Toast Banner - Bottom Left Corner */}
      {saveState && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 ${
            saveState === 'draft' 
              ? 'bg-[#1a1a1a] border border-yellow-500/30' 
              : saveState === 'published'
              ? 'bg-[#1a1a1a] border border-green-500/30'
              : 'bg-[#1a1a1a] border border-blue-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              saveState === 'draft' 
                ? 'bg-yellow-500' 
                : saveState === 'published'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}></div>
            <span className="text-white/70 text-sm">
              {saveState === 'draft' ? 'draft_saved' : saveState === 'published' ? 'published' : 'saved'}
            </span>
            {savedSlug && (
              <a 
                href={`/blog/${savedSlug}${saveState === 'draft' ? '?preview=true' : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm flex items-center gap-1 ml-2 border-l border-white/10 pl-3 ${
                  saveState === 'draft'
                    ? 'text-yellow-400 hover:text-yellow-300'
                    : saveState === 'published'
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                {saveState === 'draft' ? 'view_draft' : 'view_post'}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className={`grid gap-4 sm:gap-6 items-start ${showSettings ? 'lg:grid-cols-[1fr,360px]' : 'grid-cols-1'}`}>
          {/* Main Editor Area */}
          <div className="space-y-4 sm:space-y-6 min-w-0">
            {/* Title Input */}
            <div className="border border-white/10 bg-white/[0.02] p-3 sm:p-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title..."
                className="w-full bg-transparent text-white text-xl sm:text-2xl lg:text-3xl font-bold placeholder-white/20 focus:outline-none border-none"
              />
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-white/30 text-xs sm:text-sm">
                <span>slug:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true)
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }}
                  placeholder="post-url-slug"
                  className="flex-1 bg-transparent text-white/50 focus:outline-none focus:text-white/70"
                />
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <SimpleEditor
                content={content}
                onChange={handleEditorChange}
                placeholder="Start writing your post..."
                showToolbar={showToolbar}
              />
            </div>

            {/* Excerpt */}
            <div className="bg-white/[0.02] border border-white/10 p-3 sm:p-4">
              <label className="block text-white/50 text-xs mb-2">// excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief description of the post..."
                rows={3}
                className="w-full bg-transparent text-white/80 text-sm placeholder-white/20 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Settings Sidebar */}
          {showSettings && (
            <div className="lg:sticky lg:top-20 space-y-4">
              <div className="space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
              {/* Featured Image */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white/50 text-xs">// featured_image</label>
                  {!imagePreview && !featuredImage && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setImageUrlMode(false); setShowImageLibrary(true); loadLibraryImages(); }}
                        className="text-[10px] text-[#a78bfa] hover:text-[#c4b5fd]"
                      >
                        library
                      </button>
                      <span className="text-white/20">|</span>
                      <button
                        type="button"
                        onClick={() => { setImageUrlMode(!imageUrlMode); setShowImageLibrary(false); }}
                        className="text-[10px] text-[#a78bfa] hover:text-[#c4b5fd]"
                      >
                        {imageUrlMode ? 'upload' : 'URL'}
                      </button>
                    </div>
                  )}
                </div>
                {(imagePreview || featuredImage) ? (
                  <div className="relative">
                    <img 
                      src={imagePreview || featuredImage} 
                      alt="Preview" 
                      className="w-full h-auto"
                      onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em">Error</text></svg>' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(''); setFeaturedImage(''); setImageUrlInput(''); }}
                      className="absolute top-2 right-2 p-1 bg-black/70 text-white/70 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : imageUrlMode ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full bg-[#111] border border-white/10 px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageUrlInput.trim()) {
                          setFeaturedImage(imageUrlInput.trim())
                          setImagePreview(imageUrlInput.trim())
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#a78bfa] text-black text-xs hover:bg-[#c4b5fd] transition-colors"
                    >
                      Set Image
                    </button>
                  </div>
                ) : showImageLibrary ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">Select from library</span>
                      <button
                        type="button"
                        onClick={() => setShowImageLibrary(false)}
                        className="text-white/40 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {loadingLibrary ? (
                      <div className="h-32 flex items-center justify-center">
                        <span className="text-white/30 text-xs">loading...</span>
                      </div>
                    ) : libraryImages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {libraryImages.map((img) => (
                          <button
                            key={img.filename}
                            type="button"
                            onClick={() => selectLibraryImage(img.url)}
                            className="aspect-square bg-black/50 border border-white/10 hover:border-[#a78bfa]/50 overflow-hidden transition-colors"
                          >
                            <img
                              src={`${API_URL}${img.url}`}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-white/30 text-xs">
                        <span>No images in library</span>
                        <button
                          type="button"
                          onClick={() => setShowImageLibrary(false)}
                          className="mt-2 text-[#a78bfa] hover:text-[#c4b5fd]"
                        >
                          Upload new
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label 
                    className={`flex flex-col items-center justify-center h-32 border-2 border-dashed cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-[#a78bfa] bg-[#a78bfa]/10' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <svg className={`w-8 h-8 mb-2 ${isDragging ? 'text-[#a78bfa]' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`text-xs ${isDragging ? 'text-[#a78bfa]' : 'text-white/30'}`}>
                      {uploading ? 'uploading...' : isDragging ? 'drop image here' : 'drag & drop or click'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              {/* Category & Tags */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-white/50 text-xs mb-2">// category</label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                        placeholder="New category name..."
                        className="flex-1 bg-[#111] border border-white/10 px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        className="px-3 py-2 bg-[#a78bfa] text-black text-xs hover:bg-[#c4b5fd] transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategory(false)
                          setNewCategoryName('')
                        }}
                        className="px-3 py-2 border border-white/20 text-white/50 text-xs hover:border-white/40 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : showDeleteConfirm ? (
                    <div className="border border-red-500/30 bg-red-500/5 p-3 space-y-3">
                      <p className="text-xs text-white/70">
                        Delete &quot;<span className="text-red-400">{category}</span>&quot;?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={deleteCategory}
                          className="flex-1 px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-3 py-1.5 border border-white/20 text-white/50 text-xs hover:border-white/40 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Custom Category Dropdown */}
                      <div ref={categoryDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowCategoryDropdown(!showCategoryDropdown)
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 border transition-colors ${
                            showCategoryDropdown 
                              ? 'bg-white/10 border-white/20 text-white' 
                              : 'bg-[#1a1a1a] border-white/10 text-white/80 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span className="text-xs">{category}</span>
                          <svg 
                            className={`w-3.5 h-3.5 text-white/40 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {showCategoryDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 shadow-lg z-50 max-h-48 overflow-y-auto">
                            {categories.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setCategory(cat)
                                  setShowCategoryDropdown(false)
                                }}
                                className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                                  category === cat 
                                    ? 'bg-[#a78bfa]/20 text-[#a78bfa]' 
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                            {/* Divider */}
                            <div className="border-t border-white/10" />
                            {/* Create new category option */}
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewCategory(true)
                                setShowCategoryDropdown(false)
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs text-[#a78bfa] hover:bg-white/10 flex items-center gap-1.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create new category
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete current category button */}
                      {categories.length > 1 && category !== 'General' && (
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-red-400/60 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          delete &quot;{category}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-2">// tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="php, wordpress, tutorial"
                    className="w-full bg-[#111] border border-white/10 px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50"
                  />
                </div>
              </div>

              {/* More Settings */}
              <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
                <label className="block text-white/50 text-xs mb-3">// more_settings</label>
                <div className="space-y-3">
                  {/* Featured Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">featured</span>
                    <button
                      type="button"
                      onClick={() => setIsFeatured(!isFeatured)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isFeatured ? 'bg-[#a78bfa]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isFeatured ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {/* Comments Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">comments</span>
                    <button
                      type="button"
                      onClick={() => setCommentsEnabled(!commentsEnabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${commentsEnabled ? 'bg-[#a78bfa]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${commentsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {/* Toolbar Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">toolbar</span>
                    <button
                      type="button"
                      onClick={() => setShowToolbar(!showToolbar)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${showToolbar ? 'bg-[#a78bfa]' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${showToolbar ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
