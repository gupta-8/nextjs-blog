import { useState, useRef, useEffect, useCallback } from 'react'

export function useBlogSave({
  isNew,
  blogId,
  blogRealId,
  token,
  API_URL,
  isPublished,
  setIsPublished,
  setBlogRealId,
  title,
  slug,
  content,
  excerpt,
  category,
  tags,
  featuredImage,
  isFeatured,
  commentsEnabled,
  authorName,
  authorRole,
  user,
  calculateReadingTime,
}) {
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState(null) // 'draft', 'published', 'saved'
  const [savedSlug, setSavedSlug] = useState('')
  const autoSaveTimerRef = useRef(null)

  // Check if editing a published post
  const isEditingPublished = !isNew && isPublished

  const saveBlog = useCallback(async (publish = null, isAutoSave = false) => {
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

      const url = isNew 
        ? `${API_URL}/api/admin/blogs`
        : `${API_URL}/api/admin/blogs/${blogRealId || blogId}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
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
          setSaveState('published')
          setIsPublished(true)
        } else if (publish === false) {
          setSaveState('draft')
        } else if (isEditingPublished || isPublished) {
          setSaveState('saved')
        } else {
          setSaveState('draft')
        }
        
        // If it was a new post, update URL without redirect
        if (isNew && savedBlog.slug) {
          setBlogRealId(savedBlog.id)
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
  }, [
    title, slug, content, excerpt, category, tags, featuredImage,
    isPublished, isFeatured, commentsEnabled, authorName, authorRole,
    user, calculateReadingTime, isNew, blogRealId, blogId, token, API_URL,
    setIsPublished, setBlogRealId, isEditingPublished
  ])

  // Auto-save every 60 seconds for drafts
  useEffect(() => {
    if (!isPublished && title.trim()) {
      autoSaveTimerRef.current = setInterval(() => {
        saveBlog(false, true)
      }, 60000)
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [isPublished, title, saveBlog])

  return {
    saving,
    saveState,
    savedSlug,
    isEditingPublished,
    saveBlog,
  }
}
