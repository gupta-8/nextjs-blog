'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import { EditorToolbar, EditorModeToggle } from './components'

// Configure marked for full Markdown support with syntax highlighting
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
  smartLists: true,
  smartypants: false,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {}
    }
    try {
      return hljs.highlightAuto(code).value
    } catch (e) {}
    return code
  }
})

// Check if content looks like Markdown
const isMarkdown = (text) => {
  if (!text || typeof text !== 'string') return false
  const mdPatterns = [
    /^#{1,6}\s/m,
    /\*\*[^*]+\*\*/,
    /\*[^*]+\*/,
    /^[-*+]\s/m,
    /^\d+\.\s/m,
    /\[.+\]\(.+\)/,
    /^```/m,
    /^>\s/m,
    /`[^`]+`/,
  ]
  return mdPatterns.some(pattern => pattern.test(text))
}

// Convert content to HTML (handles both Markdown and HTML)
const toHtml = (content) => {
  if (!content) return ''
  // If it looks like Markdown, convert it
  if (isMarkdown(content) && !content.trim().startsWith('<')) {
    try {
      return marked.parse(content)
    } catch (e) {
      return content
    }
  }
  return content
}

// Format HTML with indentation
const formatHtml = (html) => {
  if (!html) return ''
  let formatted = ''
  let indent = 0
  const tags = html.replace(/>\s*</g, '>\n<').split('\n')
  
  tags.forEach(tag => {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (trimmed.match(/^<\/\w/)) indent = Math.max(0, indent - 1)
    formatted += '  '.repeat(indent) + trimmed + '\n'
    if (trimmed.match(/^<\w[^>]*[^/]>$/) && !trimmed.match(/^<(br|hr|img|input|meta|link|area|base|col|embed|param|source|track|wbr)/i)) {
      indent++
    }
  })
  
  return formatted.trim()
}

export default function SimpleEditor({
  content = '',
  onChange,
  placeholder = 'Start writing your post...',
  showToolbar = true
}) {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState('visual')
  const [code, setCode] = useState(content || '')
  const textareaRef = useRef(null)
  const visualRef = useRef(null)
  const initialContentSetRef = useRef(false)
  const lastPropContentRef = useRef(content)
  const isInternalChangeRef = useRef(false)  // Track if change is from user editing
  
  // Undo/Redo history stack
  const historyRef = useRef([content || ''])
  const historyIndexRef = useRef(0)
  const isUndoRedoRef = useRef(false)
  const MAX_HISTORY = 100

  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize visual content on mount with initial content prop
  // This handles the case when editing an existing post
  useEffect(() => {
    if (mounted && mode === 'visual' && visualRef.current && content && !initialContentSetRef.current) {
      visualRef.current.innerHTML = toHtml(content)
      initialContentSetRef.current = true
    }
  }, [mounted, mode, content])

  // Sync content prop - handles EXTERNAL prop changes only (not from user edits)
  useEffect(() => {
    // Skip if this is a change triggered by user editing
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false
      return
    }
    
    // Only update if content actually changed from prop (external update)
    if (content !== undefined && content !== lastPropContentRef.current) {
      lastPropContentRef.current = content
      setCode(content)
      
      // If in visual mode, directly update the editor
      if (mode === 'visual' && content && initialContentSetRef.current) {
        setTimeout(() => {
          if (visualRef.current) {
            visualRef.current.innerHTML = toHtml(content)
          }
        }, 0)
      }
    }
  }, [content, mode])

  // Add to history stack (debounced)
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

  // Undo function - use native for visual mode
  const handleUndo = useCallback(() => {
    if (mode === 'visual') {
      // Use native browser undo for contentEditable - works better with cursor
      document.execCommand('undo', false, null)
      // Sync state after undo
      setTimeout(() => {
        if (visualRef.current) {
          const html = visualRef.current.innerHTML
          setCode(html)
          isInternalChangeRef.current = true
          lastPropContentRef.current = html
          if (onChange) onChange(html)
        }
      }, 10)
    } else if (historyIndexRef.current > 0) {
      // Custom history for code mode
      isUndoRedoRef.current = true
      historyIndexRef.current -= 1
      const previousContent = historyRef.current[historyIndexRef.current]
      setCode(previousContent)
      isInternalChangeRef.current = true
      lastPropContentRef.current = previousContent
      if (onChange) onChange(previousContent)
    }
  }, [mode, onChange])

  // Redo function - use native for visual mode
  const handleRedo = useCallback(() => {
    if (mode === 'visual') {
      // Use native browser redo for contentEditable
      document.execCommand('redo', false, null)
      // Sync state after redo
      setTimeout(() => {
        if (visualRef.current) {
          const html = visualRef.current.innerHTML
          setCode(html)
          isInternalChangeRef.current = true
          lastPropContentRef.current = html
          if (onChange) onChange(html)
        }
      }, 10)
    } else if (historyIndexRef.current < historyRef.current.length - 1) {
      // Custom history for code mode
      isUndoRedoRef.current = true
      historyIndexRef.current += 1
      const nextContent = historyRef.current[historyIndexRef.current]
      setCode(nextContent)
      isInternalChangeRef.current = true
      lastPropContentRef.current = nextContent
      if (onChange) onChange(nextContent)
    }
  }, [mode, onChange])

  // Handle code changes
  const handleCodeChange = useCallback((e) => {
    const newCode = e.target.value
    setCode(newCode)
    // Mark this as internal change to prevent the useEffect from overwriting
    isInternalChangeRef.current = true
    lastPropContentRef.current = newCode
    addToHistory(newCode)
    if (onChange) onChange(newCode)
  }, [onChange, addToHistory])

  // Handle visual editor input
  const handleVisualInput = useCallback(() => {
    if (visualRef.current) {
      const html = visualRef.current.innerHTML
      setCode(html)
      // Mark this as internal change to prevent the useEffect from overwriting
      isInternalChangeRef.current = true
      lastPropContentRef.current = html  // Update ref to match what we're sending
      addToHistory(html)
      if (onChange) onChange(html)
    }
  }, [onChange, addToHistory])

  // Switch modes
  const switchToCode = useCallback(() => {
    if (mode === 'code') return
    if (visualRef.current) {
      const html = visualRef.current.innerHTML
      setCode(formatHtml(html))
      if (onChange) onChange(html)
    }
    setMode('code')
  }, [mode, onChange])

  const switchToVisual = useCallback(() => {
    if (mode === 'visual') return
    setMode('visual')
    // Set content after mode switch
    setTimeout(() => {
      if (visualRef.current) {
        visualRef.current.innerHTML = toHtml(code)
      }
    }, 0)
  }, [mode, code])

  // Toolbar command
  const execCmd = useCallback((cmd, value = null) => {
    document.execCommand(cmd, false, value)
    handleVisualInput()
    visualRef.current?.focus()
  }, [handleVisualInput])

  // Insert HTML
  const insertHtml = useCallback((html) => {
    document.execCommand('insertHTML', false, html)
    handleVisualInput()
    visualRef.current?.focus()
  }, [handleVisualInput])

  if (!mounted) {
    return (
      <div className="border border-white/10 bg-[#0d0d0d] min-h-[400px] flex items-center justify-center">
        <span className="text-white/30 text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="simple-editor border border-white/10 bg-[#0d0d0d]">
      {/* Header with mode toggle */}
      <EditorModeToggle 
        mode={mode} 
        onSwitchToVisual={switchToVisual} 
        onSwitchToCode={switchToCode} 
      />

      {/* Visual Mode */}
      {mode === 'visual' && (
        <>
          {/* Toolbar */}
          {showToolbar && (
            <EditorToolbar
              execCmd={execCmd}
              insertHtml={insertHtml}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          )}

          {/* Visual Editor */}
          <div
            ref={visualRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleVisualInput}
            onBlur={handleVisualInput}
            onKeyDown={(e) => {
              // Let browser handle Ctrl+Z/Y natively for better cursor handling
              // Just sync state after the native undo/redo
              if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                // Let native undo happen, then sync
                setTimeout(() => {
                  if (visualRef.current) {
                    const html = visualRef.current.innerHTML
                    setCode(html)
                    isInternalChangeRef.current = true
                    lastPropContentRef.current = html
                    if (onChange) onChange(html)
                  }
                }, 10)
                return
              }
              // Handle Ctrl+Y or Ctrl+Shift+Z for redo
              if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                // Let native redo happen, then sync
                setTimeout(() => {
                  if (visualRef.current) {
                    const html = visualRef.current.innerHTML
                    setCode(html)
                    isInternalChangeRef.current = true
                    lastPropContentRef.current = html
                    if (onChange) onChange(html)
                  }
                }, 10)
                return
              }
              
              // Handle backspace/delete on code blocks
              if (e.key === 'Backspace' || e.key === 'Delete') {
                const selection = window.getSelection()
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0)
                  const container = range.commonAncestorContainer
                  const element = container.nodeType === 1 ? container : container.parentElement
                  
                  // Find code block - check for .editor-code-block, pre, or code elements
                  let codeBlock = element?.closest?.('.editor-code-block')
                  let preBlock = element?.closest?.('pre')
                  let codeElement = element?.closest?.('code')
                  
                  // Handle .editor-code-block
                  if (codeBlock) {
                    // Get text content from the code-block-content element or the block itself
                    const contentEl = codeBlock.querySelector('.code-block-content')
                    const textContent = (contentEl || codeBlock).textContent?.trim()
                    
                    const isDefaultText = textContent === '// your code here' || textContent === ''
                    const isAllSelected = selection.toString().trim() === textContent
                    
                    if (isDefaultText || isAllSelected || !textContent) {
                      e.preventDefault()
                      codeBlock.remove()
                      handleVisualInput()
                      return
                    }
                  }
                  
                  // Handle <pre> blocks (from pasted markdown code blocks)
                  if (preBlock) {
                    const text = preBlock.textContent?.trim()
                    if (!text || selection.toString().trim() === preBlock.textContent?.trim()) {
                      e.preventDefault()
                      preBlock.remove()
                      handleVisualInput()
                      return
                    }
                  }
                  
                  // Handle empty <code> elements
                  if (codeElement && !codeElement.closest('pre')) {
                    const text = codeElement.textContent?.trim()
                    if (!text) {
                      e.preventDefault()
                      codeElement.remove()
                      handleVisualInput()
                      return
                    }
                  }
                }
              }
            }}
            onPaste={(e) => {
              const html = e.clipboardData?.getData('text/html')
              const text = e.clipboardData?.getData('text/plain')
              if (html) {
                e.preventDefault()
                document.execCommand('insertHTML', false, html)
              } else if (text && isMarkdown(text)) {
                e.preventDefault()
                document.execCommand('insertHTML', false, toHtml(text))
              }
              handleVisualInput()
            }}
            onClick={(e) => {
              // Handle click on code block delete button using event delegation
              const target = e.target
              
              // Direct click on delete button element
              if (target?.classList?.contains('code-block-delete-btn')) {
                e.preventDefault()
                e.stopPropagation()
                const codeBlock = target.closest('.editor-code-block')
                if (codeBlock) {
                  codeBlock.remove()
                  handleVisualInput()
                }
                return
              }
              
              // Fallback: Check if click is in the top-right corner of a code block
              if (target?.classList?.contains('editor-code-block')) {
                const rect = target.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const clickY = e.clientY - rect.top
                // Delete button area: top-right corner, 30x30px
                if (clickX > rect.width - 35 && clickY < 35) {
                  e.preventDefault()
                  target.remove()
                  handleVisualInput()
                }
              }
            }}
            className="min-h-[400px] p-4 focus:outline-none prose prose-invert max-w-none"
            style={{
              backgroundColor: '#0d0d0d',
              color: 'rgba(255,255,255,0.9)',
            }}
            data-placeholder={placeholder}
          />
        </>
      )}

      {/* Code Mode */}
      {mode === 'code' && (
        <div className="relative overflow-x-auto">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            placeholder={placeholder}
            spellCheck={false}
            wrap="off"
            className="w-full min-h-[400px] bg-[#0d1117] text-white/80 font-mono text-sm p-4 focus:outline-none resize-y border-0 overflow-x-auto whitespace-pre"
            style={{ tabSize: 2 }}
          />
        </div>
      )}

      {/* Placeholder styles */}
      <style jsx global>{`
        .simple-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255,255,255,0.3);
          pointer-events: none;
        }
        .simple-editor .prose h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .simple-editor .prose h2 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .simple-editor .prose h3 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        .simple-editor .prose p { margin: 0.5em 0; }
        .simple-editor .prose ul, .simple-editor .prose ol { margin: 0.5em 0; padding-left: 1.5em; }
        .simple-editor .prose li { margin: 0.25em 0; }
        .simple-editor .prose blockquote { 
          border-left: 3px solid #a78bfa; 
          padding-left: 1em; 
          margin: 0.5em 0;
          color: rgba(255,255,255,0.7);
        }
        /* Blog-style code blocks */
        .simple-editor .blog-code-wrapper {
          margin: 1rem 0;
        }
        .simple-editor .blog-code-block {
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.7;
        }
        .simple-editor .blog-code-block code {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          background: transparent;
          padding: 0;
          color: #e6edf3;
        }
        /* Editor code block - simple div for easy deletion */
        .simple-editor .editor-code-block {
          display: block;
          box-sizing: border-box;
          width: 100%;
          margin: 1.5rem 0;
          padding: 0;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0;
          position: relative;
        }
        /* Code block content area */
        .simple-editor .editor-code-block .code-block-content {
          display: block;
          padding: 0.75rem 1rem;
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.7;
          color: #e6edf3;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
          outline: none;
        }
        /* Real delete button - always visible on hover */
        .simple-editor .editor-code-block .code-block-delete-btn {
          position: absolute;
          top: 0.25rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          font-size: 18px;
          font-family: system-ui, sans-serif;
          border-radius: 2px;
          border: none;
          transition: all 0.15s ease;
          z-index: 10;
          opacity: 0;
          pointer-events: none;
        }
        .simple-editor .editor-code-block:hover .code-block-delete-btn {
          opacity: 1;
          pointer-events: auto;
        }
        .simple-editor .editor-code-block .code-block-delete-btn:hover {
          background: rgba(239,68,68,0.4);
          color: #ef4444;
          transform: scale(1.1);
        }
        /* Language label for code blocks */
        .simple-editor .editor-code-block::before {
          content: attr(data-lang);
          display: block;
          padding: 0.25rem 1rem;
          background: #161b22;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          border-radius: 0;
          font-size: 0.625rem;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.05em;
          font-family: system-ui, sans-serif;
        }
        /* Pre blocks from pasted markdown */
        .simple-editor .prose pre {
          display: block;
          box-sizing: border-box;
          width: 100%;
          margin: 1.5rem 0;
          padding: 1rem;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0;
          overflow-x: auto;
          font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.875rem;
          line-height: 1.7;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .simple-editor .prose pre code {
          display: block;
          background: none;
          padding: 0;
          margin: 0;
          color: #e6edf3;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .simple-editor .prose code {
          background: rgba(255,255,255,0.1);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          color: #a78bfa;
        }
        .simple-editor .prose pre code,
        .simple-editor .blog-code-block code,
        .simple-editor .editor-code-block code,
        .simple-editor .editor-code-block .code-block-content {
          background: none;
          padding: 0;
          color: #e6edf3;
        }
        .simple-editor .prose a {
          color: #a78bfa;
          text-decoration: underline;
        }
        .simple-editor .prose img {
          max-width: 100%;
          height: auto;
        }
        /* Table wrapper for horizontal scroll */
        .simple-editor .table-wrapper {
          overflow-x: auto;
          max-width: 100%;
          margin: 1rem 0;
        }
        /* Table styling - proper alignment */
        .simple-editor .prose table,
        .simple-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .simple-editor .prose th, 
        .simple-editor .prose td,
        .simple-editor th,
        .simple-editor td {
          border: 1px solid rgba(255,255,255,0.2);
          padding: 8px 12px;
          text-align: left;
        }
        .simple-editor .prose th,
        .simple-editor th {
          background: rgba(255,255,255,0.05);
          font-weight: 600;
        }
        /* Editor container */
        .simple-editor [contenteditable] {
          overflow-x: auto;
        }
        .simple-editor .prose hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.2);
          margin: 1em 0;
        }
        /* Custom style tags - render them with high priority */
        .simple-editor style {
          display: none;
        }
        /* Syntax highlighting */
        .simple-editor .hljs-keyword,
        .simple-editor .hljs-selector-tag,
        .simple-editor .hljs-built_in,
        .simple-editor .hljs-type { color: #ff7b72; }
        .simple-editor .hljs-title,
        .simple-editor .hljs-title.function_,
        .simple-editor .hljs-title.class_ { color: #d2a8ff; }
        .simple-editor .hljs-string,
        .simple-editor .hljs-attr,
        .simple-editor .hljs-regexp { color: #a5d6ff; }
        .simple-editor .hljs-comment,
        .simple-editor .hljs-quote { color: #8b949e; font-style: italic; }
        .simple-editor .hljs-variable,
        .simple-editor .hljs-template-variable,
        .simple-editor .hljs-params { color: #ffa657; }
        .simple-editor .hljs-number,
        .simple-editor .hljs-literal { color: #79c0ff; }
        .simple-editor .hljs-name,
        .simple-editor .hljs-tag { color: #7ee787; }
        .simple-editor .hljs-attribute { color: #79c0ff; }
      `}</style>
    </div>
  )
}
