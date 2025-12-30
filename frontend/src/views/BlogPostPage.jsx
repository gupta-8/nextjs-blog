'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useSearchParams } from '@/lib/router-compat';
import { useSite } from '@/contexts/SiteContext';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';
import { formatDistanceToNow, format } from 'date-fns';
import Cookies from 'js-cookie';
import Footer from '../components/Footer';
import BlogNotFound from '../components/BlogNotFound';
import ImageWithPlaceholder from '../components/ImagePlaceholder';
import 'highlight.js/styles/github-dark.css';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const LIKED_COMMENTS_COOKIE = 'liked_comments';

// Configure DOMPurify to allow safe HTML elements
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'em', 'strong', 'del', 'ins', 'sub', 'sup',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'div', 'span', 'section', 'article',
    'details', 'summary',
    'style'  // Allow custom CSS
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id',
    'target', 'rel', 'width', 'height', 'style',
    'data-language', 'data-*'
  ],
  ALLOW_DATA_ATTR: true,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'iframe', 'form', 'input', 'textarea', 'button', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur']
};

// Sanitize HTML content
// Sanitize content - Strip dangerous tags including <script>
// Works consistently on both server and client to avoid hydration mismatch
function sanitizeContent(content) {
  if (!content) return content;
  
  // Strip script tags and other dangerous elements (but keep style tags for custom CSS)
  // This runs on both server and client for consistent output
  let sanitized = content
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, 'javascript-disabled:')
    // Remove data: URLs in src/href
    .replace(/(src|href)\s*=\s*["']data:/gi, '$1="data-disabled:')
    // Keep style tags for custom CSS support
    // Remove DOCTYPE, html, head, body wrapper tags (keep content)
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '');
  
  // Additional client-side sanitization with DOMPurify
  if (typeof window !== 'undefined') {
    sanitized = DOMPurify.sanitize(sanitized, DOMPURIFY_CONFIG);
  }
  
  return sanitized;
}

// Extract custom styles from content and scope them for higher specificity
function extractCustomStyles(content) {
  if (!content) return { styles: '', contentWithoutStyles: content };
  
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const styles = [];
  let match;
  
  while ((match = styleRegex.exec(content)) !== null) {
    styles.push(match[1]);
  }
  
  // Remove style tags from content for markdown processing
  const contentWithoutStyles = content.replace(styleRegex, '');
  
  // Scope styles to .custom-content-styles and add !important for priority
  let scopedStyles = styles.join('\n');
  if (scopedStyles) {
    // Add .custom-content-styles prefix to all selectors for higher specificity
    // and add !important to property values
    scopedStyles = scopedStyles
      // Match CSS rules and scope them
      .replace(/([^{}]+)\{([^{}]+)\}/g, (match, selector, properties) => {
        // Scope each selector
        const scopedSelector = selector
          .split(',')
          .map(s => `.custom-content-styles ${s.trim()}`)
          .join(', ');
        
        // Add !important to each property that doesn't already have it
        const importantProperties = properties
          .split(';')
          .map(prop => {
            prop = prop.trim();
            if (!prop) return '';
            if (prop.includes('!important')) return prop;
            // Add !important before any trailing whitespace
            return prop + ' !important';
          })
          .filter(Boolean)
          .join('; ');
        
        return `${scopedSelector} { ${importantProperties} }`;
      });
  }
  
  return {
    styles: scopedStyles,
    contentWithoutStyles
  };
}

// Code Block with Copy Button
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const preRef = React.useRef(null);

  const copyCode = () => {
    const code = preRef.current?.textContent || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langMatch = className?.match(/language-(\w+)/);
  const language = langMatch ? langMatch[1] : 'code';

  return (
    <div className="relative group my-6 not-prose border border-white/10 overflow-hidden blog-code-wrapper">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-0.5 border-b border-white/10 bg-[#161b22]">
        <span className="text-[10px] text-white/40 tracking-wider">{language}</span>
        <button onClick={copyCode} className="code-copy-btn flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors" type="button">
          {copied ? (
            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>Copied!</span></>
          ) : (
            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span>Copy</span></>
          )}
        </button>
      </div>
      {/* Code */}
      <pre ref={preRef} className="blog-code-block overflow-x-auto m-0 px-4 py-3 bg-[#0d1117]">{children}</pre>
    </div>
  );
}

function PreWrapper({ children }) {
  let language = 'code';
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.props?.className) {
      const langMatch = child.props.className.match(/language-(\w+)/);
      if (langMatch) language = langMatch[1];
    }
  });
  return <CodeBlock className={`language-${language}`}>{children}</CodeBlock>;
}

function InlineCode({ inline, className, children, ...props }) {
  if (inline) return <code className="text-[#a78bfa] bg-white/5 px-1.5 py-0.5 text-xs font-normal" {...props}>{children}</code>;
  return <code className={className} {...props}>{children}</code>;
}

// Check if image URL is likely broken based on known patterns
function isImageBroken(src) {
  if (!src) return true;
  return (
    src.includes('blog-editor-pro') ||
    src.includes('blog-editor-1') ||
    src.includes('blog-editor-2') ||
    (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:'))
  );
}

// Featured Image - only renders if image is valid
function FeaturedImage({ image, title }) {
  const [hasError, setHasError] = React.useState(false);
  
  // Don't render if no image or known broken URL
  if (!image || isImageBroken(image) || hasError) {
    return null;
  }
  
  return (
    <figure className="border border-white/10 bg-[#0d0d0d]">
      <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        <span className="text-white/30 text-xs">// image.php</span>
      </div>
      <div className="bg-[#0a0a0a]">
        <img 
          src={image} 
          alt={title}
          className="opacity-90 w-full h-auto"
          onError={() => setHasError(true)}
        />
      </div>
    </figure>
  );
}

// Comment Component
function Comment({ comment, onLike, onUnlike, onDelete, likedComments = [], deletableComments = [] }) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isLiked = likedComments.includes(comment.id);
  const canDelete = deletableComments.includes(comment.id);

  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try { if (isLiked) await onUnlike(comment.id); else await onLike(comment.id); } finally { setIsLiking(false); }
  };

  const handleDelete = async () => {
    if (isDeleting || !window.confirm('Delete this comment?')) return;
    setIsDeleting(true);
    try { await onDelete(comment.id); } finally { setIsDeleting(false); }
  };

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-[#a78bfa]/20 flex items-center justify-center text-[#a78bfa] text-xs font-medium flex-shrink-0">
          {comment.author_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-xs font-medium">{comment.author_name}</span>
            <span className="text-white/30 text-[10px]">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
          </div>
          <p className="text-white/60 text-xs leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={handleLikeToggle} disabled={isLiking} className={`flex items-center gap-1 text-[10px] transition-colors ${isLiking ? 'opacity-50' : ''} ${isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'}`}>
              <svg className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              {comment.likes || 0}
            </button>
            {canDelete && <button onClick={handleDelete} disabled={isDeleting} className="text-[10px] text-white/40 hover:text-red-400">{isDeleting ? 'deleting...' : 'delete'}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Comments Section
function CommentsSection({ blogId, commentsEnabled }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ name: '', email: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [likedComments, setLikedComments] = useState([]);
  const [deletableComments, setDeletableComments] = useState([]);

  useEffect(() => {
    const stored = Cookies.get(LIKED_COMMENTS_COOKIE);
    if (stored) try { setLikedComments(JSON.parse(stored)); } catch { setLikedComments([]); }
  }, []);

  const saveLikedComments = (newLiked) => {
    Cookies.set(LIKED_COMMENTS_COOKIE, JSON.stringify(newLiked), { expires: 365 });
    setLikedComments(newLiked);
  };

  const loadComments = useCallback(async () => {
    try {
      const [commentsRes, countRes] = await Promise.all([fetch(`${API_URL}/api/comments/${blogId}`), fetch(`${API_URL}/api/comments/${blogId}/count`)]);
      const [commentsData, countData] = await Promise.all([commentsRes.json(), countRes.json()]);
      setComments(commentsData);
      setCommentCount(countData.count);
      const deletable = [];
      for (const comment of commentsData) {
        try {
          const res = await fetch(`${API_URL}/api/comments/${comment.id}/can-delete`);
          const data = await res.json();
          if (data.can_delete) deletable.push(comment.id);
        } catch {}
      }
      setDeletableComments(deletable);
    } catch (error) { console.error('Error loading comments:', error); }
    finally { setLoading(false); }
  }, [blogId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.name.trim() || !newComment.content.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_id: blogId, author_name: newComment.name, author_email: newComment.email || null, content: newComment.content, parent_id: null })
      });
      setNewComment({ name: '', email: '', content: '' });
      loadComments();
    } catch (error) { console.error('Error posting comment:', error); }
    finally { setSubmitting(false); }
  };

  const handleLike = async (id) => { try { await fetch(`${API_URL}/api/comments/${id}/like`, { method: 'POST' }); saveLikedComments([...likedComments, id]); loadComments(); } catch {} };
  const handleUnlike = async (id) => { try { await fetch(`${API_URL}/api/comments/${id}/unlike`, { method: 'POST' }); saveLikedComments(likedComments.filter(i => i !== id)); loadComments(); } catch {} };
  const handleDelete = async (id) => { try { await fetch(`${API_URL}/api/comments/${id}`, { method: 'DELETE' }); loadComments(); } catch {} };

  if (!commentsEnabled) {
    return (
      <div className="border border-white/10 bg-[#0d0d0d]">
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]"><span className="text-white/30 text-xs">// comments.php</span></div>
        <div className="p-6 text-center">
          <p className="text-white/30 text-xs">{'// comments_enabled = false;'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-[#0d0d0d]">
      <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          <span className="text-white/30 text-xs">// comments.php</span>
        </div>
        <span className="text-xs text-white/30">count = <span className="text-[#a78bfa]">{commentCount}</span>;</span>
      </div>

      {/* Comment Form */}
      <div className="p-4 border-b border-white/10">
        <p className="text-[10px] text-white/30 mb-3">// add comment</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="text" value={newComment.name} onChange={(e) => setNewComment({ ...newComment, name: e.target.value })} placeholder="name = 'Your Name'" className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50" required />
            <input type="email" value={newComment.email} onChange={(e) => setNewComment({ ...newComment, email: e.target.value })} placeholder="email = 'optional'" className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50" />
          </div>
          <textarea value={newComment.content} onChange={(e) => setNewComment({ ...newComment, content: e.target.value })} placeholder="// Your comment..." rows={3} className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 resize-none" required />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50">
            {submitting ? 'posting...' : 'submit'}
          </button>
        </form>
      </div>

      {/* Comments List */}
      <div className="divide-y divide-white/5">
        {loading ? (
          <div className="p-6 text-center"><span className="text-[#a78bfa]">loading</span><span className="animate-pulse">|</span></div>
        ) : comments.length > 0 ? (
          comments.map((comment) => <div key={comment.id} className="px-4"><Comment comment={comment} onLike={handleLike} onUnlike={handleUnlike} onDelete={handleDelete} likedComments={likedComments} deletableComments={deletableComments} /></div>)
        ) : (
          <div className="p-6 text-center">
            <p className="text-white/30 text-xs">{'// comments = [];'}</p>
            <p className="text-white/50 text-[10px] mt-1">Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ latestPosts, allTags, profile }) {
  const hasSocial = profile?.social?.github || profile?.social?.linkedin || profile?.social?.twitter || 
    profile?.social?.instagram || profile?.social?.youtube || profile?.social?.dribbble || 
    profile?.social?.behance || profile?.social?.codepen || profile?.social?.website;

  const socialLinks = [
    { key: 'github', label: 'GitHub', icon: <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /> },
    { key: 'linkedin', label: 'LinkedIn', icon: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/> },
    { key: 'twitter', label: 'Twitter / X', icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/> },
    { key: 'instagram', label: 'Instagram', icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/> },
    { key: 'youtube', label: 'YouTube', icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/> },
    { key: 'dribbble', label: 'Dribbble', icon: <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" clipRule="evenodd" /> },
    { key: 'behance', label: 'Behance', icon: <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-14.967h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zm-3.466-8.988h3.584c2.508 0 2.906-3-.312-3h-3.272v3zm3.391 3h-3.391v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/> },
    { key: 'codepen', label: 'CodePen', icon: <path d="M18.144 13.067v-2.134l-1.602 1.067 1.602 1.067zM12 18.054l-4.622-3.082-1.617 1.079 6.239 4.163 6.239-4.163-1.617-1.079L12 18.054zM5.856 13.067l1.602-1.067-1.602-1.067v2.134zM12 5.946l4.622 3.082 1.617-1.079L12 3.786l-6.239 4.163 1.617 1.079L12 5.946zM12 12l4.107-2.738L12 6.524 7.893 9.262 12 12zm0-12C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/> },
    { key: 'website', label: 'Website', isStroke: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Latest Posts */}
      <div className="border border-white/10 bg-[#0d0d0d]">
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          <span className="text-white/30 text-xs">// latest_posts.php</span>
        </div>
        <div className="p-4">
          {latestPosts.length > 0 ? (
            <div className="space-y-3">
              {latestPosts.map((post, index) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-start gap-2">
                    <span className="text-[#a78bfa] text-[10px] mt-0.5">{String(index + 1).padStart(2, '0')}.</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-xs line-clamp-2 group-hover:text-[#a78bfa] transition-colors">{post.title}</h4>
                      <p className="text-white/30 text-[10px] mt-0.5">{post.category}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-xs">{'// posts = [];'}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="border border-white/10 bg-[#0d0d0d]">
          <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span className="text-white/30 text-xs">// tags.php</span>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5">
              {allTags.slice(0, 12).map((tag) => (
                <Link key={tag} to={`/blog/tag/${encodeURIComponent(tag)}`} className="text-[10px] px-2 py-1 border border-white/10 text-white/50 hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors">#{tag}</Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      {hasSocial && (
        <div className="border border-white/10 bg-[#0d0d0d]">
          <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]"></span>
            <span className="text-white/30 text-xs">// connect.php</span>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {socialLinks.map(({ key, label, icon, isStroke }) => profile?.social?.[key] && (
                <a key={key} href={profile.social[key]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-[#a78bfa] transition-colors">
                  <svg className="w-3.5 h-3.5" fill={isStroke ? 'none' : 'currentColor'} stroke={isStroke ? 'currentColor' : 'none'} viewBox="0 0 24 24">{icon}</svg>
                  <span className="text-xs">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Blog Post Page - SSR Optimized
export default function BlogPostPage({ slug: propSlug, initialData }) {
  // Support both prop-based (Next.js) and hook-based (react-router) slug
  const paramsSlug = useParams()?.slug;
  const slug = propSlug || paramsSlug;
  const [searchParams] = useSearchParams();
  const isPreview = searchParams?.get('preview') === 'true';
  
  // Get dynamic site name
  const { siteName } = useSite();
  
  // Use SSR data if available, otherwise use client-side state
  const hasSSRData = initialData && initialData.blog && !initialData.error;
  
  const [blog, setBlog] = useState(hasSSRData ? initialData.blog : null);
  const [adjacent, setAdjacent] = useState(hasSSRData ? initialData.adjacent : { previous: null, next: null });
  const [related, setRelated] = useState(hasSSRData ? initialData.related : []);
  const [profile, setProfile] = useState(hasSSRData ? initialData.profile : null);
  const [loading, setLoading] = useState(!hasSSRData);
  const [error, setError] = useState(hasSSRData ? null : (initialData?.error || null));
  const [latestPosts, setLatestPosts] = useState(hasSSRData ? initialData.latestPosts : []);
  const [allTags, setAllTags] = useState(hasSSRData ? initialData.allTags : []);

  // Only fetch on client if no SSR data (for preview mode or fallback)
  useEffect(() => {
    // Skip fetch if we have SSR data and not in preview mode
    if (hasSSRData && !isPreview) {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
      return;
    }
    
    // For preview mode, clear any SSR error and fetch fresh
    if (isPreview) {
      setError(null);
      setLoading(true);
    }
    
    const fetchData = async () => {
      try {
        // For preview mode, get the auth token and add preview param
        let blogUrl = `${API_URL}/api/blogs/${slug}`;
        let headers = {};
        
        if (isPreview) {
          blogUrl += '?preview=true';
          // Get token from localStorage (admin authentication)
          const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }
        
        const [blogRes, profileRes, latestRes] = await Promise.all([
          fetch(blogUrl, { headers }),
          fetch(`${API_URL}/api/profile`),
          fetch(`${API_URL}/api/blogs?limit=5`)
        ]);

        if (!blogRes.ok) { 
          if (isPreview && blogRes.status === 401) {
            setError('Authentication required. Please log in as admin to preview drafts.');
          } else {
            setError('Blog post not found'); 
          }
          setLoading(false); 
          return; 
        }

        const [blogData, profileData, latestData] = await Promise.all([blogRes.json(), profileRes.json(), latestRes.json()]);

        // If in preview mode but post is already published, redirect to normal URL
        if (isPreview && blogData.is_published) {
          if (typeof window !== 'undefined') {
            window.location.replace(`/blog/${slug}`);
          }
          return;
        }

        setBlog(blogData);
        setProfile(profileData);
        setLatestPosts(latestData.filter(p => p.slug !== slug).slice(0, 3));
        document.title = blogData.title;

        const [adjRes, relRes] = await Promise.all([
          fetch(`${API_URL}/api/blogs/${slug}/adjacent`),
          fetch(`${API_URL}/api/blogs/${slug}/related?limit=3`)
        ]);
        const [adjData, relData] = await Promise.all([adjRes.json(), relRes.json()]);
        setAdjacent(adjData);
        setRelated(relData);

        const tags = new Set();
        if (blogData.tags) blogData.tags.forEach(t => tags.add(t));
        latestData.forEach(p => p.tags?.forEach(t => tags.add(t)));
        setAllTags([...tags]);
      } catch (err) { console.error('Error fetching blog:', err); setError('Failed to load blog post'); }
      finally { setLoading(false); }
    };
    fetchData();
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [slug, isPreview, hasSSRData]);

  const formatDate = (dateString) => format(new Date(dateString), 'MMM d, yyyy');
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = () => {
    navigator.clipboard.writeText(currentUrl);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: blog?.title, url: currentUrl }); } 
      catch (err) { if (err.name !== 'AbortError') copyLink(); }
    } else { copyLink(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-[#a78bfa]">loading_post</span>
        <span className="animate-pulse">|</span>
      </div>
    );
  }

  if (error || !blog) return <BlogNotFound slug={slug} />;

  const authorName = blog.author_name || profile?.name || siteName;
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const postUrl = `${siteUrl}/blog/${blog.slug}`;
  const ogImage = blog.image || `${siteUrl}/og-default.png`;

  return (
    <article 
      itemScope 
      itemType="https://schema.org/Article"
      className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black"
    >
      {/* Preview Banner for Draft Posts */}
      {isPreview && (
        <div className="sticky top-0 z-50 bg-amber-500/90 text-black px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Preview Mode — This post is not published yet</span>
            <a href={`/admin/blog/edit/${blog.slug}`} className="ml-2 underline hover:no-underline">Edit Post</a>
          </div>
        </div>
      )}
      {/* SEO Meta Tags are handled by Next.js generateMetadata in app/blog/[slug]/page.js */}
      {/* Header */}
      <header className="py-6 sm:py-8 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Link to="/blog" className="inline-flex items-center gap-2 text-[#a78bfa] text-xs hover:underline mb-4 sm:mb-6" rel="author">
            ← back
          </Link>
          
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-4">
            <h1 itemProp="headline" className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
              {blog.title}
            </h1>
            
            {/* Meta Info Row */}
            <div className="flex items-center gap-3 text-[11px] text-white/40 border-b border-white/10 pb-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <time itemProp="datePublished" dateTime={blog.created_at}>{formatDate(blog.created_at)}</time>
              </span>
              <span className="text-white/20">•</span>
              <span>{blog.reading_time} min</span>
              <span className="text-white/20">•</span>
              <span>{blog.views || 0} views</span>
            </div>
            
            <p itemProp="description" className="text-white/50 text-sm leading-relaxed">{blog.excerpt}</p>
            
            {/* Compact Meta Card */}
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span className="text-white/30 text-xs">// meta.php</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span><span className="text-white/40">by</span> <span className="text-green-400">{authorName}</span></span>
                  <span><span className="text-white/40 sm:hidden">category</span><span className="text-white/40 hidden sm:inline">in</span> <Link to={`/blog/category/${encodeURIComponent(blog.category)}`} className="text-orange-400 hover:underline">{blog.category}</Link></span>
                  {blog.tags?.length > 0 && (
                    <span className="text-[#a78bfa] hidden sm:inline">{blog.tags.length} tags</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(currentUrl)}`} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors p-2" aria-label="Share on Twitter">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <button onClick={handleShare} className="text-white/40 hover:text-white transition-colors p-2" aria-label="Share this post">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  <button onClick={copyLink} className="text-white/40 hover:text-white transition-colors p-2" aria-label="Copy link to clipboard">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 items-start">
            {/* Left - Title Info */}
            <div className="min-w-0">
              <h1 itemProp="headline" className="text-3xl font-bold tracking-tight mb-4 leading-tight">
                {blog.title}
              </h1>
              <p itemProp="description" className="text-white/50 text-base mb-5 leading-relaxed">{blog.excerpt}</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-white/10">
                  <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <time itemProp="datePublished" dateTime={blog.created_at} className="text-xs text-white/50">{formatDate(blog.created_at)}</time>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-white/10">
                  <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-white/50">{blog.reading_time} min read</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-white/10">
                  <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-xs text-white/50">{blog.views || 0} views</span>
                </div>
              </div>
            </div>

            {/* Right - Meta Card (Desktop) */}
            <div className="border border-white/10 bg-[#0d0d0d] w-full overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span className="text-white/30 text-xs">// meta.php</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                </div>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span className="text-white/50 shrink-0">author</span>
                  <span itemProp="name" className="text-green-400 truncate">"{authorName}"</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/50 shrink-0">category</span>
                  <Link to={`/blog/category/${encodeURIComponent(blog.category)}`} className="text-orange-400 hover:underline truncate" itemProp="articleSection">"{blog.category}"</Link>
                </div>
                {blog.tags?.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white/50 shrink-0">tags</span>
                    <span className="text-[#a78bfa]">[{blog.tags.length}]</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                  <span className="text-white/30 text-[10px]">// share:</span>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(currentUrl)}`} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors p-2" aria-label="Share on Twitter">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                  <button onClick={handleShare} className="text-white/40 hover:text-white transition-colors p-2" aria-label="Share this post">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  </button>
                  <button onClick={copyLink} className="text-white/40 hover:text-white transition-colors p-2" aria-label="Copy link to clipboard">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 lg:gap-8">
          {/* Left Column - Content */}
          <div className="space-y-4 sm:space-y-6 min-w-0" itemProp="articleBody">
            {/* Featured Image with placeholder */}
            <FeaturedImage image={blog.image} title={blog.title} />

            {/* Article Content */}
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-white/30 text-xs">// content.php</span>
              </div>
              <article className="p-4 sm:p-6">
                <div className="prose prose-invert prose-sm max-w-none blog-content-wrapper custom-content-styles
                  prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-white prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
                  prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-white/90
                  prose-p:text-white/70 prose-p:leading-relaxed prose-p:mb-4
                  prose-a:text-[#a78bfa] prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-white prose-strong:font-semibold
                  prose-code:text-[#a78bfa] prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-none prose-pre:p-0
                  prose-blockquote:border-l-[#a78bfa] prose-blockquote:bg-white/[0.02] prose-blockquote:py-3 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-white/60
                  prose-ul:text-white/70 prose-ol:text-white/70
                  prose-li:marker:text-[#a78bfa]
                  prose-hr:border-white/10
                  prose-img:rounded-none prose-img:border prose-img:border-white/10
                ">
                  {/* Render custom styles from content with high priority */}
                  {(() => {
                    const { styles, contentWithoutStyles } = extractCustomStyles(blog.content);
                    return (
                      <>
                        {styles && <style dangerouslySetInnerHTML={{ __html: styles }} />}
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeHighlight, rehypeRaw]} 
                          components={{ 
                            pre: PreWrapper, 
                            code: InlineCode,
                            table: ({node, ...props}) => (
                              <div className="table-wrapper overflow-x-auto">
                                <table {...props} />
                              </div>
                            )
                          }}
                        >
                          {sanitizeContent(contentWithoutStyles)}
                        </ReactMarkdown>
                      </>
                    );
                  })()}
                </div>
              </article>
            </div>

            {/* Tags */}
            {blog.tags?.length > 0 && (
              <div className="border border-white/10 bg-[#0d0d0d]">
                <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]"></span>
                    <span className="text-white/30 text-xs">// tags.php</span>
                  </div>
                  <span className="text-xs text-white/30">count = <span className="text-[#a78bfa]">{blog.tags.length}</span>;</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.map((tag) => (
                      <Link key={tag} to={`/blog/tag/${encodeURIComponent(tag)}`} className="text-xs px-3 py-1.5 border border-white/10 text-white/50 hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors">#{tag}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                <span className="text-white/30 text-xs">// navigation.php</span>
              </div>
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {adjacent.previous ? (
                  <Link to={`/blog/${adjacent.previous.slug}`} className="group p-4 hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] text-white/30">← previous</span>
                    <div className="text-sm text-white mt-1 group-hover:text-[#a78bfa] transition-colors line-clamp-1">{adjacent.previous.title}</div>
                  </Link>
                ) : (
                  <div className="p-4 text-white/20 text-xs">// null</div>
                )}
                {adjacent.next ? (
                  <Link to={`/blog/${adjacent.next.slug}`} className="group p-4 hover:bg-white/[0.02] transition-colors text-right">
                    <span className="text-[10px] text-white/30">next</span>
                    <div className="text-sm text-white mt-1 group-hover:text-[#a78bfa] transition-colors line-clamp-1">{adjacent.next.title}</div>
                  </Link>
                ) : (
                  <div className="p-4 text-white/20 text-xs text-right">// null</div>
                )}
              </div>
            </div>

            {/* Comments */}
            <CommentsSection blogId={blog.id} commentsEnabled={blog.comments_enabled !== false} />
          </div>

          {/* Right Column - Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <Sidebar latestPosts={latestPosts} allTags={allTags} profile={profile} />
            </div>
          </aside>
        </div>
      </div>

      {/* Related Posts */}
      {related.length > 0 && (
        <section className="py-8 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// related_posts.php</p>
              <span className="text-xs text-white/30">count = {related.length};</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((post, index) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group border border-white/10 bg-[#0d0d0d] hover:border-[#a78bfa]/30 transition-all">
                  <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span className="text-xs text-white/40">related_{String(index + 1).padStart(2, '0')}.php</span>
                    </div>
                    <span className="text-[10px] text-white/30">{post.category}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white text-sm font-medium group-hover:text-[#a78bfa] transition-colors line-clamp-2 mb-2">{post.title}</h3>
                    <p className="text-white/40 text-xs line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer profile={profile} />
    </article>
  );
}
