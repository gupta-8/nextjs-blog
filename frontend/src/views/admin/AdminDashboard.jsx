'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { Link } from '@/lib/router-compat';
import { formatDistanceToNow, format } from 'date-fns';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const { siteName } = useSite();
  const [stats, setStats] = useState(null);
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [allBlogs, setAllBlogs] = useState([]);
  const [recentComments, setRecentComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLogin] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    api: 'checking',
    database: 'checking',
    auth: 'checking'
  });
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    document.title = `Dashboard | ${siteName}`;
  }, [siteName]);

  // Get last login from localStorage
  const [lastLoginIp, setLastLoginIp] = useState(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLastLogin = localStorage.getItem('last_login');
      const storedLastLoginIp = localStorage.getItem('last_login_ip');
      if (storedLastLogin) {
        setLastLogin(storedLastLogin);
      }
      if (storedLastLoginIp) {
        setLastLoginIp(storedLastLoginIp);
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check API status
        const apiCheck = await fetch(`${API_URL}/api/profile`);
        setSystemStatus(prev => ({ ...prev, api: apiCheck.ok ? 'online' : 'offline' }));

        // Fetch all blogs for stats (use admin endpoint to get all including drafts)
        const allBlogsRes = await fetch(`${API_URL}/api/admin/blogs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (allBlogsRes.ok) {
          const allBlogsData = await allBlogsRes.json();
          setAllBlogs(allBlogsData);
          setRecentBlogs(allBlogsData.slice(0, 6));
        }
        setSystemStatus(prev => ({ ...prev, database: allBlogsRes.ok ? 'connected' : 'error' }));

        // Check auth status
        setSystemStatus(prev => ({ ...prev, auth: 'active' }));

        // Get all comments for stats
        const commentsRes = await fetch(`${API_URL}/api/admin/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setRecentComments(commentsData);
        }

        // Get files (use admin endpoint)
        const filesRes = await fetch(`${API_URL}/api/admin/files`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (filesRes.ok) {
          const filesData = await filesRes.json();
          setFiles(filesData);
        }
        
      } catch (err) {
        console.error('Failed to load data:', err);
        setSystemStatus({ api: 'offline', database: 'error', auth: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchData();
    }
  }, [API_URL, token]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate stats
  const blogStats = {
    total: allBlogs.length,
    published: allBlogs.filter(b => b.status === 'published' || b.is_published).length,
    drafts: allBlogs.filter(b => b.status === 'draft' || !b.is_published).length,
    featured: allBlogs.filter(b => b.is_featured).length,
    totalViews: allBlogs.reduce((sum, b) => sum + (b.views || 0), 0)
  };

  const commentStats = {
    total: recentComments.length,
    pending: recentComments.filter(c => !c.is_approved).length,
    hidden: recentComments.filter(c => c.is_hidden).length,
    approved: recentComments.filter(c => c.is_approved && !c.is_hidden).length
  };

  const fileStats = {
    total: files.length,
    images: files.filter(f => f.is_image).length,
    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0)
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    if (status === 'online' || status === 'connected' || status === 'active') return 'bg-green-500';
    if (status === 'checking') return 'bg-yellow-500 animate-pulse';
    return 'bg-red-500';
  };

  const getStatusTextColor = (status) => {
    if (status === 'online' || status === 'connected' || status === 'active') return 'text-green-400';
    if (status === 'checking') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="font-mono">
      {/* Welcome Section with System Status */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// dashboard</p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
              {getGreeting()}, <span className="text-[#a78bfa]">{siteName?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p className="text-white/40 text-xs sm:text-sm">{getCurrentDate()}</p>
          </div>
          
          {/* System Status Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'api', label: 'API' },
              { key: 'database', label: 'DB' },
              { key: 'auth', label: 'Auth' }
            ].map(item => (
              <div key={item.key} className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.02] border border-white/10">
                <span className={`w-1.5 h-1.5 ${getStatusColor(systemStatus[item.key])}`} />
                <span className="text-white/40 text-[10px]">{item.label}</span>
                <span className={`text-[10px] ${getStatusTextColor(systemStatus[item.key])}`}>
                  {systemStatus[item.key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stats Cards - No gradients */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Blog Stats Card */}
        <Link to="/admin/blog" className="group border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-[#a78bfa]/30 hover:bg-white/[0.04] transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <span className="text-[#a78bfa] text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{blogStats.total}</div>
          <p className="text-white/30 text-[10px] sm:text-xs">total_posts</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400">{blogStats.published} live</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400">{blogStats.drafts} draft</span>
          </div>
        </Link>

        {/* Comments Stats Card */}
        <Link to="/admin/comments" className="group border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-blue-500/30 hover:bg-white/[0.04] transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentStats.pending > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-black text-[9px] flex items-center justify-center font-bold">
                  {commentStats.pending}
                </span>
              )}
            </div>
            <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{commentStats.total}</div>
          <p className="text-white/30 text-[10px] sm:text-xs">total_comments</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {commentStats.pending > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 animate-pulse">{commentStats.pending} pending</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400">{commentStats.approved} approved</span>
          </div>
        </Link>

        {/* Files Stats Card */}
        <Link to="/admin/files" className="group border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-green-500/30 hover:bg-white/[0.04] transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <span className="text-green-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{fileStats.total}</div>
          <p className="text-white/30 text-[10px] sm:text-xs">total_files</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50">{fileStats.images} images</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50">{formatBytes(fileStats.totalSize)}</span>
          </div>
        </Link>

        {/* Views Stats Card */}
        <div className="border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{blogStats.totalViews.toLocaleString()}</div>
          <p className="text-white/30 text-[10px] sm:text-xs">total_views</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-1.5 py-0.5 bg-[#a78bfa]/10 text-[#a78bfa]">{blogStats.featured} featured</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="mb-6 sm:mb-8">
        <div className="border border-white/10 p-4 sm:p-5">
          <p className="text-white/30 text-[10px] tracking-[0.2em] mb-4">// quick_actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {[
              { href: '/admin/blog/new', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'new_post', color: 'text-[#a78bfa]' },
              { href: '/admin/files/upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', label: 'upload_files', color: 'text-green-400' },
              { href: '/admin/comments', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'comments', color: 'text-blue-400', badge: commentStats.pending },
              { href: '/admin/files', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'media', color: 'text-yellow-400' },
              { href: '/admin/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'profile', color: 'text-pink-400' },
              { href: '/admin/security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'security', color: 'text-red-400' },
            ].map((action) => (
              <Link 
                key={action.href}
                to={action.href} 
                className="group relative flex flex-col items-center gap-2 p-3 sm:p-4 border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all"
              >
                <svg className={`w-5 h-5 ${action.color} group-hover:scale-110 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={action.icon} />
                </svg>
                <span className="text-white/50 group-hover:text-white/70 text-[10px] transition-colors">{action.label}</span>
                {action.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-yellow-500 text-black text-[9px] flex items-center justify-center font-bold">
                    {action.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Recent Comments - Takes more space */}
        <div className="lg:col-span-3">
          <div className="border border-white/10 h-full">
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <p className="text-white/30 text-[10px] tracking-[0.2em]">// recent_comments</p>
              <Link to="/admin/comments" className="text-[#a78bfa] text-[10px] hover:text-[#c4b5fd] transition-colors">
                view all →
              </Link>
            </div>
            
            {recentComments.length > 0 ? (
              <div className="divide-y divide-white/5">
                {recentComments.slice(0, 5).map((comment) => (
                  <div 
                    key={comment.id}
                    className="p-3 sm:p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] text-xs sm:text-sm font-medium flex-shrink-0">
                        {comment.author_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white text-xs sm:text-sm font-medium">{comment.author_name}</span>
                          {comment.is_hidden ? (
                            <span className="text-[9px] px-1.5 py-0.5 bg-red-500/20 text-red-400">HIDDEN</span>
                          ) : !comment.is_approved ? (
                            <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 animate-pulse">PENDING</span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400">LIVE</span>
                          )}
                        </div>
                        <p className="text-white/50 text-xs line-clamp-2 mb-2">{comment.content}</p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-white/30 text-[10px]">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                            {comment.author_country && (
                              <span className="text-[#a78bfa]/60 text-[10px]">{comment.author_country}</span>
                            )}
                          </div>
                          {!comment.is_approved && (
                            <button
                              onClick={async () => {
                                await fetch(`${API_URL}/api/admin/comments/${comment.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ is_approved: true })
                                });
                                const res = await fetch(`${API_URL}/api/admin/comments`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                const data = await res.json();
                                setRecentComments(data);
                              }}
                              className="text-[10px] px-2 py-1 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                            >
                              approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-white/30 text-xs">No comments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Files */}
        <div className="lg:col-span-2">
          <div className="border border-white/10 h-full">
            <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <p className="text-white/30 text-[10px] tracking-[0.2em]">// recent_files</p>
              <Link to="/admin/files" className="text-[#a78bfa] text-[10px] hover:text-[#c4b5fd] transition-colors">
                view all →
              </Link>
            </div>
            
            {files.length > 0 ? (
              <div className="p-3 sm:p-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                {files.slice(0, 6).map((file) => (
                  <a 
                    key={file.id || file.filename}
                    href={`${API_URL}${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square bg-black border border-white/10 hover:border-[#a78bfa]/30 transition-all overflow-hidden relative flex items-center justify-center"
                  >
                    {file.is_image ? (
                      <img 
                        src={`${API_URL}${file.url}`}
                        alt={file.filename}
                        className="max-w-full max-h-full object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-[9px] truncate">{file.filename}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <svg className="w-8 h-8 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-white/30 text-xs mb-2">No files yet</p>
                <Link to="/admin/files/upload" className="text-[#a78bfa] text-[10px] hover:text-[#c4b5fd]">
                  + upload files
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Blog Posts */}
      <div className="mt-4 sm:mt-6">
        <div className="border border-white/10">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <p className="text-white/30 text-[10px] tracking-[0.2em]">// recent_posts</p>
            <Link to="/admin/blog" className="text-[#a78bfa] text-[10px] hover:text-[#c4b5fd] transition-colors">
              view all →
            </Link>
          </div>
          
          {recentBlogs.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
              {recentBlogs.map((blog) => (
                <Link 
                  key={blog.id}
                  to={`/admin/blog/edit/${blog.id}`}
                  className="group bg-[#0a0a0a] p-3 sm:p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex gap-3">
                    {blog.image ? (
                      <img 
                        src={blog.image} 
                        alt={blog.title}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover opacity-60 group-hover:opacity-100 flex-shrink-0 transition-opacity"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {(blog.status === 'draft' || !blog.is_published) ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400">DRAFT</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-400">LIVE</span>
                        )}
                        {blog.is_featured && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[#a78bfa]/20 text-[#a78bfa]">★</span>
                        )}
                      </div>
                      <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-[#a78bfa] transition-colors">
                        {blog.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {blog.views || 0}
                        </span>
                        <span>{formatDistanceToNow(new Date(blog.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="w-8 h-8 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <p className="text-white/30 text-xs mb-2">No posts yet</p>
              <Link to="/admin/blog/new" className="text-[#a78bfa] text-[10px] hover:text-[#c4b5fd]">
                + create your first post
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 sm:mt-8 py-4 border-t border-white/5">
        <div className="text-[10px] text-white/30 text-center sm:text-left">
          <div className="sm:flex sm:items-center sm:justify-between">
            <span className="block mb-1 sm:mb-0">{siteName}. Admin Panel</span>
            <div className="flex flex-col sm:flex-row sm:gap-4">
              <span>Last login: {lastLogin ? format(new Date(lastLogin), 'MMM d, h:mm a') : 'First session'}{lastLoginIp ? ` (${lastLoginIp})` : ''}</span>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
