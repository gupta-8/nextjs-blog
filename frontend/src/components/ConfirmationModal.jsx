'use client';

import React from 'react';

/**
 * Reusable Confirmation Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Function to call when closing the modal
 * @param {function} props.onConfirm - Function to call when confirming the action
 * @param {string} props.variant - Color variant: 'danger' | 'warning' | 'info' | 'purple' | 'success'
 * @param {string} props.label - The // label text (lowercase)
 * @param {string} props.title - Modal title
 * @param {string} props.description - Description text
 * @param {React.ReactNode} props.children - Additional content to display
 * @param {string} props.confirmText - Text for confirm button (default: 'confirm')
 * @param {string} props.cancelText - Text for cancel button (default: 'cancel')
 * @param {React.ReactNode} props.confirmIcon - Icon for confirm button (optional)
 * @param {boolean} props.loading - Whether action is in progress
 * @param {string} props.warningText - Warning text shown at bottom (optional)
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  variant = 'danger',
  label,
  title,
  description,
  children,
  confirmText = 'confirm',
  cancelText = 'cancel',
  confirmIcon,
  loading = false,
  warningText
}) {
  if (!isOpen) return null;

  // Variant color schemes
  const variants = {
    danger: {
      headerBg: 'bg-red-500/5',
      iconBg: 'bg-red-500/20',
      iconBorder: 'border-red-500/30',
      iconColor: 'text-red-400',
      labelColor: 'text-red-400',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      buttonText: 'text-black'
    },
    warning: {
      headerBg: 'bg-yellow-500/5',
      iconBg: 'bg-yellow-500/20',
      iconBorder: 'border-yellow-500/30',
      iconColor: 'text-yellow-400',
      labelColor: 'text-yellow-400',
      buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
      buttonText: 'text-black'
    },
    info: {
      headerBg: 'bg-blue-500/5',
      iconBg: 'bg-blue-500/20',
      iconBorder: 'border-blue-500/30',
      iconColor: 'text-blue-400',
      labelColor: 'text-blue-400',
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
      buttonText: 'text-black'
    },
    purple: {
      headerBg: 'bg-[#a78bfa]/5',
      iconBg: 'bg-[#a78bfa]/20',
      iconBorder: 'border-[#a78bfa]/30',
      iconColor: 'text-[#a78bfa]',
      labelColor: 'text-[#a78bfa]',
      buttonBg: 'bg-[#a78bfa] hover:bg-[#c4b5fd]',
      buttonText: 'text-black'
    },
    success: {
      headerBg: 'bg-green-500/5',
      iconBg: 'bg-green-500/20',
      iconBorder: 'border-green-500/30',
      iconColor: 'text-green-400',
      labelColor: 'text-green-400',
      buttonBg: 'bg-green-500 hover:bg-green-600',
      buttonText: 'text-black'
    }
  };

  const colors = variants[variant] || variants.danger;

  // Default icons for each variant
  const defaultIcons = {
    danger: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    warning: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    purple: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    success: (
      <svg className={`w-5 h-5 ${colors.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div className="relative bg-[#0a0a0a] border border-white/10 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 border-b border-white/10 ${colors.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${colors.iconBg} border ${colors.iconBorder} flex items-center justify-center`}>
              {defaultIcons[variant]}
            </div>
            <div>
              <p className={`${colors.labelColor} text-[10px] tracking-[0.2em]`}>// {label}</p>
              <h3 className="text-white font-medium text-lg">{title}</h3>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-5">
          {description && (
            <p className="text-white/60 text-sm mb-3">{description}</p>
          )}
          
          {children}
          
          {warningText && (
            <p className="text-white/40 text-xs mt-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {warningText}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-white/10 text-white/70 text-sm hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 ${colors.buttonBg} ${colors.buttonText} text-sm transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50`}
          >
            {confirmIcon}
            {loading ? 'processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Content box component for displaying item details inside the modal
 */
export function ModalContentBox({ children, className = '' }) {
  return (
    <div className={`bg-white/5 border border-white/10 px-4 py-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Status badge component for showing status transitions
 */
export function StatusBadge({ status, variant = 'default' }) {
  const variants = {
    published: 'bg-green-500/20 text-green-400',
    draft: 'bg-yellow-500/20 text-yellow-400',
    hidden: 'bg-orange-500/20 text-orange-400',
    visible: 'bg-green-500/20 text-green-400',
    approved: 'bg-green-500/20 text-green-400',
    default: 'bg-white/10 text-white/60'
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] ${variants[variant] || variants.default}`}>
      {status}
    </span>
  );
}
