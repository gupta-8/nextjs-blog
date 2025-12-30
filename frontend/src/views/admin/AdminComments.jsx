import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { formatDistanceToNow } from 'date-fns';
import ConfirmationModal, { ModalContentBox } from '../../components/ConfirmationModal';
export default function AdminComments() {
  const { token } = useAuth();
  const { siteName } = useSite();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(null);
  const [showHideModal, setShowHideModal] = useState(null);
  const [showUnhideModal, setShowUnhideModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const bulkDropdownRef = useRef(null);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    document.title = `Comments | ${siteName}`;
  }, [siteName]);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleApprove = async (id, approved) => {
    setShowApproveModal(null);
    setActionLoading(id);
    await fetch(`${API_URL}/api/admin/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_approved: approved })
    });
    await loadComments();
    setActionLoading(null);
  };

  const handleHide = async (id, hidden) => {
    setShowHideModal(null);
    setShowUnhideModal(null);
    setActionLoading(id);
    await fetch(`${API_URL}/api/admin/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_hidden: hidden })
    });
    await loadComments();
    setActionLoading(null);
  };

  const handleDelete = async (id) => {
    setShowDeleteModal(null);
    setActionLoading(id);
    await fetch(`${API_URL}/api/admin/comments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await loadComments();
    setActionLoading(null);
  };

  const handleEdit = (comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    setActionLoading(editingComment.id);
    await fetch(`${API_URL}/api/admin/comments/${editingComment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: editContent })
    });
    setEditingComment(null);
    setEditContent('');
    await loadComments();
    setActionLoading(null);
  };

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    if (!showBulkDropdown) return;
    
    function handleClickOutside(event) {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(event.target)) {
        setShowBulkDropdown(false);
      }
    }
    
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBulkDropdown]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredComments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredComments.map(c => c.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const confirmBulkAction = () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setShowBulkActionModal(true);
  };

  // Get bulk action config for modal
  const getBulkActionConfig = () => {
    const configs = {
      approve: {
        icon: (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        color: 'green',
        title: 'Approve Comments',
        description: `${selectedIds.length} comment(s) will be approved and visible to everyone.`,
        buttonText: 'approve all'
      },
      hide: {
        icon: (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ),
        color: 'yellow',
        title: 'Hide Comments',
        description: `${selectedIds.length} comment(s) will be hidden from public view.`,
        buttonText: 'hide all'
      },
      unhide: {
        icon: (
          <svg className="w-5 h-5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        buttonIcon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        color: 'purple',
        title: 'Unhide Comments',
        description: `${selectedIds.length} comment(s) will be visible again.`,
        buttonText: 'unhide all'
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
        title: 'Delete Comments',
        description: `${selectedIds.length} comment(s) will be permanently deleted.`,
        buttonText: 'delete all',
        warning: 'This action cannot be undone'
      }
    };
    return configs[bulkAction] || configs.delete;
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    
    setShowBulkActionModal(false);
    setProcessing(true);
    
    try {
      for (const id of selectedIds) {
        if (bulkAction === 'delete') {
          await fetch(`${API_URL}/api/admin/comments/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          const updates = {};
          if (bulkAction === 'approve') updates.is_approved = true;
          if (bulkAction === 'hide') updates.is_hidden = true;
          if (bulkAction === 'unhide') updates.is_hidden = false;
          
          await fetch(`${API_URL}/api/admin/comments/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(updates)
          });
        }
      }
      
      setSelectedIds([]);
      setBulkAction('');
      loadComments();
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('Some operations failed');
    } finally {
      setProcessing(false);
    }
  };

  const filteredComments = comments.filter(c => {
    if (filter === 'pending') return !c.is_approved;
    if (filter === 'approved') return c.is_approved && !c.is_hidden;
    if (filter === 'hidden') return c.is_hidden;
    return true;
  });

  const stats = {
    total: comments.length,
    pending: comments.filter(c => !c.is_approved).length,
    approved: comments.filter(c => c.is_approved && !c.is_hidden).length,
    hidden: comments.filter(c => c.is_hidden).length
  };

  return (
    <div className="font-mono">
      <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// comment_moderation.php</p>
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-6">
        comments<span className="text-[#a78bfa]">_moderate</span>
      </h1>

      {/* Stats - Mobile friendly grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { key: 'total', value: stats.total, color: 'text-white' },
          { key: 'pending', value: stats.pending, color: 'text-yellow-400' },
          { key: 'approved', value: stats.approved, color: 'text-green-400' },
          { key: 'hidden', value: stats.hidden, color: 'text-red-400' }
        ].map((stat) => (
          <div key={stat.key} className="bg-[#0a0a0a] border border-white/10 p-3 sm:p-4 text-center">
            <div className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-white/30">{stat.key}</div>
          </div>
        ))}
      </div>

      {/* Filters - Scrollable on mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2">
        {['all', 'pending', 'approved', 'hidden'].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelectedIds([]); }}
            className={`text-xs px-3 sm:px-4 py-2 border transition-colors whitespace-nowrap flex-shrink-0 ${
              filter === f
                ? 'border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/10'
                : 'border-white/10 text-white/50 hover:border-white/30'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Select All Header with Bulk Actions */}
      {filteredComments.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-4 px-3 py-3 border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredComments.length && filteredComments.length > 0}
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
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBulkDropdown(!showBulkDropdown);
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
                      { value: 'approve', label: 'approve' },
                      { value: 'hide', label: 'hide' },
                      { value: 'unhide', label: 'unhide' },
                      { value: 'delete', label: 'delete' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setBulkAction(option.value);
                          setShowBulkDropdown(false);
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
                onClick={() => { setSelectedIds([]); setBulkAction(''); }}
                className="flex-shrink-0 px-3 py-1.5 border border-white/10 text-white/50 text-xs hover:text-white hover:border-white/20 transition-colors"
              >
                clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Comments List - 2 column grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredComments.map((comment) => (
          <div 
            key={comment.id} 
            className={`border bg-[#0a0a0a] transition-colors ${
              selectedIds.includes(comment.id)
                ? 'border-[#a78bfa]/50 bg-[#a78bfa]/5'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(comment.id)}
                    onChange={() => toggleSelect(comment.id)}
                    className="custom-checkbox"
                  />
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] text-xs sm:text-sm font-medium flex-shrink-0">
                  {comment.author_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-white font-medium text-sm">{comment.author_name}</span>
                    <span className="text-white/20 text-[10px]">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2">
                    {comment.author_email && (
                      <p className="text-white/30 text-[10px] truncate">{comment.author_email}</p>
                    )}
                    {comment.author_ip && (
                      <p className="text-white/20 text-[10px]">IP: {comment.author_ip}</p>
                    )}
                  </div>
                </div>
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {comment.is_hidden ? (
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400">HIDDEN</span>
                  ) : !comment.is_approved ? (
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400">PENDING</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400">LIVE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {editingComment?.id === comment.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 h-24 resize-none mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={actionLoading === comment.id}
                      className="px-3 py-1.5 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
                    >
                      {actionLoading === comment.id ? 'saving...' : 'save'}
                    </button>
                    <button
                      onClick={() => { setEditingComment(null); setEditContent(''); }}
                      className="px-3 py-1.5 border border-white/10 text-white/50 text-xs hover:border-white/30 transition-colors"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/70 text-sm whitespace-pre-wrap">{comment.content}</p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30 flex-wrap">
                <span>❤️ {comment.likes || 0}</span>
                {comment.author_ip && (
                  <span className="font-mono">
                    {comment.author_ip}
                    {comment.author_country && (
                      <span className="text-[#a78bfa] ml-1">({comment.author_country})</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Actions - Full width buttons on mobile */}
            {editingComment?.id !== comment.id && (
              <div className="border-t border-white/10 p-2 sm:p-3 bg-white/[0.01]">
                <div className="flex flex-wrap gap-2">
                  {!comment.is_approved && (
                    <button
                      onClick={() => setShowApproveModal(comment)}
                      disabled={actionLoading === comment.id}
                      className="flex-1 sm:flex-none px-3 py-1.5 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/10 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === comment.id ? '...' : 'approve'}
                    </button>
                  )}
                  {comment.is_approved && !comment.is_hidden && (
                    <button
                      onClick={() => setShowHideModal(comment)}
                      disabled={actionLoading === comment.id}
                      className="flex-1 sm:flex-none px-3 py-1.5 border border-yellow-500/30 text-yellow-400 text-xs hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === comment.id ? '...' : 'hide'}
                    </button>
                  )}
                  {comment.is_hidden && (
                    <button
                      onClick={() => setShowUnhideModal(comment)}
                      disabled={actionLoading === comment.id}
                      className="flex-1 sm:flex-none px-3 py-1.5 border border-[#a78bfa]/30 text-[#a78bfa] text-xs hover:bg-[#a78bfa]/10 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === comment.id ? '...' : 'unhide'}
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(comment)}
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-white/10 text-white/50 text-xs hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(comment)}
                    disabled={actionLoading === comment.id}
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === comment.id ? '...' : 'delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredComments.length === 0 && (
        <div className="border border-white/10 p-8 text-center">
          <p className="text-white/30 text-sm">{'// comments = [];'}</p>
          <p className="text-white/50 text-xs mt-2">No comments to moderate.</p>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {showBulkActionModal && bulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBulkActionModal(false)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 border-b border-white/10 ${
              bulkAction === 'delete' ? 'bg-red-500/5' :
              bulkAction === 'approve' ? 'bg-green-500/5' :
              bulkAction === 'hide' ? 'bg-yellow-500/5' :
              'bg-[#a78bfa]/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center border ${
                  bulkAction === 'delete' ? 'bg-red-500/20 border-red-500/30' :
                  bulkAction === 'approve' ? 'bg-green-500/20 border-green-500/30' :
                  bulkAction === 'hide' ? 'bg-yellow-500/20 border-yellow-500/30' :
                  'bg-[#a78bfa]/20 border-[#a78bfa]/30'
                }`}>
                  {getBulkActionConfig().icon}
                </div>
                <div>
                  <p className={`text-[10px] tracking-[0.2em] ${
                    bulkAction === 'delete' ? 'text-red-400' :
                    bulkAction === 'approve' ? 'text-green-400' :
                    bulkAction === 'hide' ? 'text-yellow-400' :
                    'text-[#a78bfa]'
                  }`}>{`// bulk_${bulkAction}`}</p>
                  <h3 className="text-white font-medium text-lg">{getBulkActionConfig().title}</h3>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-white/60 text-sm mb-4">{getBulkActionConfig().description}</p>
              <div className="bg-white/5 border border-white/10 px-4 py-3 max-h-32 overflow-y-auto">
                {selectedIds.slice(0, 5).map((id, i) => {
                  const comment = comments.find(c => c.id === id);
                  return (
                    <p key={i} className="text-xs text-white/50 truncate">
                      {comment?.author_name}: {comment?.content?.substring(0, 50)}...
                    </p>
                  );
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
                onClick={handleBulkAction}
                className={`flex-1 px-4 py-2.5 text-sm transition-all font-medium flex items-center justify-center gap-2 ${
                  bulkAction === 'delete' 
                    ? 'bg-red-500 text-black hover:bg-red-600' 
                    : bulkAction === 'hide'
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : bulkAction === 'approve'
                    ? 'bg-green-500 text-black hover:bg-green-400'
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

      {/* Single Approve Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showApproveModal}
        onClose={() => setShowApproveModal(null)}
        onConfirm={() => handleApprove(showApproveModal?.id, true)}
        variant="success"
        label="approve_comment"
        title="Approve Comment"
        description="This comment will be visible to everyone:"
        confirmText="approve"
      >
        {showApproveModal && (
          <ModalContentBox>
            <p className="text-white/50 text-xs mb-1">{showApproveModal.author_name}:</p>
            <p className="text-white text-sm line-clamp-3">{showApproveModal.content}</p>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Single Hide Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showHideModal}
        onClose={() => setShowHideModal(null)}
        onConfirm={() => handleHide(showHideModal?.id, true)}
        variant="warning"
        label="hide_comment"
        title="Hide Comment"
        description="This comment will be hidden from public view:"
        confirmText="hide"
        warningText="You can unhide it anytime"
      >
        {showHideModal && (
          <ModalContentBox>
            <p className="text-white/50 text-xs mb-1">{showHideModal.author_name}:</p>
            <p className="text-white text-sm line-clamp-3">{showHideModal.content}</p>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Single Unhide Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showUnhideModal}
        onClose={() => setShowUnhideModal(null)}
        onConfirm={() => handleHide(showUnhideModal?.id, false)}
        variant="purple"
        label="unhide_comment"
        title="Unhide Comment"
        description="This comment will be visible again:"
        confirmText="unhide"
      >
        {showUnhideModal && (
          <ModalContentBox>
            <p className="text-white/50 text-xs mb-1">{showUnhideModal.author_name}:</p>
            <p className="text-white text-sm line-clamp-3">{showUnhideModal.content}</p>
          </ModalContentBox>
        )}
      </ConfirmationModal>

      {/* Single Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => handleDelete(showDeleteModal?.id)}
        variant="danger"
        label="delete_comment"
        title="Delete Comment"
        description="This comment will be permanently deleted:"
        warningText="This action cannot be undone"
      >
        {showDeleteModal && (
          <ModalContentBox>
            <p className="text-white/50 text-xs mb-1">{showDeleteModal.author_name}:</p>
            <p className="text-white text-sm line-clamp-3">{showDeleteModal.content}</p>
          </ModalContentBox>
        )}
      </ConfirmationModal>
    </div>
  );
}
