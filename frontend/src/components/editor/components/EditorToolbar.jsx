'use client'
import React from 'react'

// Toolbar button component
const Btn = ({ onClick, title, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
      active 
        ? 'bg-[#a78bfa] text-black' 
        : 'text-white/50 hover:text-white hover:bg-white/10'
    }`}
  >
    {children}
  </button>
)

const Divider = () => <span className="w-px h-5 bg-white/10 mx-0.5" />

export default function EditorToolbar({ 
  execCmd, 
  insertHtml, 
  onUndo, 
  onRedo 
}) {
  return (
    <div className="border-b border-white/10 bg-white/[0.02] px-2 py-1.5 flex flex-wrap items-center gap-0.5">
      <Btn onClick={() => execCmd('bold')} title="Bold">B</Btn>
      <Btn onClick={() => execCmd('italic')} title="Italic">I</Btn>
      <Btn onClick={() => execCmd('underline')} title="Underline">U</Btn>
      <Btn onClick={() => execCmd('strikeThrough')} title="Strike">S̶</Btn>
      
      <Divider />
      
      <Btn onClick={() => execCmd('formatBlock', 'h1')} title="Heading 1">H1</Btn>
      <Btn onClick={() => execCmd('formatBlock', 'h2')} title="Heading 2">H2</Btn>
      <Btn onClick={() => execCmd('formatBlock', 'h3')} title="Heading 3">H3</Btn>
      <Btn onClick={() => execCmd('formatBlock', 'p')} title="Paragraph">¶</Btn>
      
      <Divider />
      
      <Btn onClick={() => execCmd('insertUnorderedList')} title="Bullet List">•―</Btn>
      <Btn onClick={() => execCmd('insertOrderedList')} title="Numbered List">1.</Btn>
      <Btn onClick={() => execCmd('formatBlock', 'blockquote')} title="Quote">❝</Btn>
      
      <Divider />
      
      <Btn onClick={() => execCmd('justifyLeft')} title="Left">⫷</Btn>
      <Btn onClick={() => execCmd('justifyCenter')} title="Center">☰</Btn>
      <Btn onClick={() => execCmd('justifyRight')} title="Right">⫸</Btn>
      
      <Divider />
      
      <Btn onClick={() => {
        const url = prompt('Enter link URL:')
        if (url) execCmd('createLink', url)
      }} title="Link">🔗</Btn>
      
      <Btn onClick={() => {
        const url = prompt('Enter image URL:')
        if (url) insertHtml(`<img src="${url}" alt="image" style="max-width:100%;" />`)
      }} title="Image">🖼</Btn>
      
      <Btn onClick={() => {
        const lang = prompt('Language (e.g., javascript, python, html):', 'code')
        const codeBlock = `<div class="editor-code-block" data-lang="${lang || 'code'}"><button type="button" class="code-block-delete-btn" contenteditable="false" aria-label="Delete code block">&times;</button><div class="code-block-content" contenteditable="true">// your code here</div></div>`
        insertHtml(codeBlock)
      }} title="Code Block">&lt;/&gt;</Btn>
      
      <Btn onClick={() => execCmd('insertHorizontalRule')} title="Horizontal Line">―</Btn>
      
      <Divider />
      
      <Btn onClick={() => {
        const rows = prompt('Rows:', '3')
        const cols = prompt('Columns:', '3')
        if (rows && cols) {
          let t = '<div class="table-wrapper" style="overflow-x:auto;max-width:100%;"><table style="min-width:100%;border-collapse:collapse;white-space:nowrap;"><thead><tr>'
          for (let c = 0; c < +cols; c++) t += '<th style="border:1px solid rgba(255,255,255,0.2);padding:8px;background:rgba(255,255,255,0.05);">Header</th>'
          t += '</tr></thead><tbody>'
          for (let r = 0; r < +rows - 1; r++) {
            t += '<tr>'
            for (let c = 0; c < +cols; c++) t += '<td style="border:1px solid rgba(255,255,255,0.1);padding:8px;">Cell</td>'
            t += '</tr>'
          }
          t += '</tbody></table></div>'
          insertHtml(t)
        }
      }} title="Table">⊞</Btn>
      
      <Divider />
      
      <Btn onClick={onUndo} title="Undo (Ctrl+Z)">↩</Btn>
      <Btn onClick={onRedo} title="Redo (Ctrl+Y)">↪</Btn>
      <Btn onClick={() => execCmd('removeFormat')} title="Clear">⌀</Btn>
    </div>
  )
}
