import { useState, useEffect, useCallback } from 'react'

export function useCategoryManager({ token, API_URL }) {
  const [categories, setCategories] = useState(['General'])
  const [category, setCategory] = useState('General')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Load categories from API
  const loadCategories = useCallback(async () => {
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
  }, [API_URL, token])

  // Load categories on mount
  useEffect(() => {
    if (token) {
      loadCategories()
    }
  }, [token, loadCategories])

  // Add new category
  const addCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim()
    if (!trimmedName) return
    if (categories.includes(trimmedName)) {
      alert('Category already exists')
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
        body: JSON.stringify({ name: trimmedName })
      })
      
      if (res.ok) {
        setCategories(prev => [...prev, trimmedName])
        setCategory(trimmedName)
        setNewCategoryName('')
        setShowNewCategory(false)
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Failed to create category')
    } finally {
      setCategoryLoading(false)
    }
  }, [newCategoryName, categories, API_URL, token])

  // Delete category
  const deleteCategory = useCallback(async () => {
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
  }, [API_URL, token, category, categories])

  return {
    categories,
    category,
    setCategory,
    newCategoryName,
    setNewCategoryName,
    showNewCategory,
    setShowNewCategory,
    showDeleteConfirm,
    setShowDeleteConfirm,
    categoryLoading,
    addCategory,
    deleteCategory,
  }
}
