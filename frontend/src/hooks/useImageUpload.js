import { useState, useCallback } from 'react'

export function useImageUpload({ token, API_URL }) {
  const [featuredImage, setFeaturedImage] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [imageUrlMode, setImageUrlMode] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)

  // Handle image upload
  const handleImageUpload = useCallback(async (e) => {
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
  }, [API_URL, token])

  // Load images from library
  const loadLibraryImages = useCallback(async () => {
    setLoadingLibrary(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const images = data.filter(f => f.is_image)
        setLibraryImages(images)
      }
    } catch (error) {
      console.error('Failed to load library:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }, [API_URL, token])

  // Select image from library
  const selectLibraryImage = useCallback((imageUrl) => {
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`
    setFeaturedImage(fullUrl)
    setImagePreview(fullUrl)
    setShowImageLibrary(false)
  }, [API_URL])

  // Set image from URL
  const setImageFromUrl = useCallback(() => {
    if (imageUrlInput.trim()) {
      setFeaturedImage(imageUrlInput.trim())
      setImagePreview(imageUrlInput.trim())
    }
  }, [imageUrlInput])

  // Clear image
  const clearImage = useCallback(() => {
    setImagePreview('')
    setFeaturedImage('')
    setImageUrlInput('')
  }, [])

  return {
    featuredImage,
    setFeaturedImage,
    imagePreview,
    setImagePreview,
    uploading,
    imageUrlMode,
    setImageUrlMode,
    imageUrlInput,
    setImageUrlInput,
    showImageLibrary,
    setShowImageLibrary,
    libraryImages,
    loadingLibrary,
    handleImageUpload,
    loadLibraryImages,
    selectLibraryImage,
    setImageFromUrl,
    clearImage,
  }
}
