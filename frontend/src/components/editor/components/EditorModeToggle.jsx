'use client'
import React from 'react'

export default function EditorModeToggle({ mode, onSwitchToVisual, onSwitchToCode }) {
  return (
    <div className="border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
      <span className="text-white/30 text-xs py-2 px-4">// content_editor</span>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onSwitchToVisual}
          className={`px-3 py-2 text-[11px] border-l border-white/10 transition-all ${
            mode === 'visual' 
              ? 'bg-[#a78bfa] text-black font-medium' 
              : 'bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={onSwitchToCode}
          className={`px-3 py-2 text-[11px] border-l border-white/10 transition-all ${
            mode === 'code' 
              ? 'bg-[#a78bfa] text-black font-medium' 
              : 'bg-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          Code
        </button>
      </div>
    </div>
  )
}
