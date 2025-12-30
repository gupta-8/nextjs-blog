'use client'
import { useCallback, useRef } from 'react'

const MAX_HISTORY = 100

/**
 * Custom hook for managing undo/redo history in the editor
 */
export function useEditorHistory(initialContent = '') {
  const historyRef = useRef([initialContent])
  const historyIndexRef = useRef(0)
  const isUndoRedoRef = useRef(false)

  // Add to history stack
  const addToHistory = useCallback((newContent) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false
      return
    }
    
    const currentHistory = historyRef.current
    const currentIndex = historyIndexRef.current
    
    // Don't add if same as current
    if (currentHistory[currentIndex] === newContent) return
    
    // Remove any forward history when making new changes
    const newHistory = currentHistory.slice(0, currentIndex + 1)
    newHistory.push(newContent)
    
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    } else {
      historyIndexRef.current = newHistory.length - 1
    }
    
    historyRef.current = newHistory
  }, [])

  // Get previous content (for code mode undo)
  const getPreviousContent = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true
      historyIndexRef.current -= 1
      return historyRef.current[historyIndexRef.current]
    }
    return null
  }, [])

  // Get next content (for code mode redo)
  const getNextContent = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true
      historyIndexRef.current += 1
      return historyRef.current[historyIndexRef.current]
    }
    return null
  }, [])

  return {
    addToHistory,
    getPreviousContent,
    getNextContent,
    isUndoRedoRef
  }
}
