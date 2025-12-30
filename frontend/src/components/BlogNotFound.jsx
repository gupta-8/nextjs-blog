'use client'
import React from 'react';
import { Link } from '@/lib/router-compat';

export default function BlogNotFound({ slug }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono flex items-center justify-center px-6 py-20">
      <div className="max-w-xl w-full text-center">
        {/* Error Code */}
        <div className="mb-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// blog_error.php</p>
          <h1 className="text-6xl sm:text-8xl font-bold text-white/10 leading-none">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="border border-white/10 p-5 sm:p-6 mb-6 text-left overflow-hidden">
          <p className="text-white/30 text-xs sm:text-sm mb-2">
            <span className="text-red-400">PostNotFoundException</span>: Article not found
          </p>
          <p className="text-white/20 text-xs break-words" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
            <span className="text-white/40">Query:</span> SELECT * FROM posts WHERE slug = <span className="text-[#a78bfa]">'{slug || 'unknown'}'</span>
          </p>
          <p className="text-white/20 text-xs">
            <span className="text-white/40">Result:</span> <span className="text-red-400">0 rows</span>
          </p>
        </div>

        {/* Message */}
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            <span className="text-white/30">post</span> = <span className="text-red-400">false</span>;
          </h2>
          <p className="text-white/50 text-sm">
            This article doesn't exist, was deleted, or the URL is incorrect.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link 
            to="/blog"
            className="px-6 py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors"
          >
            browse all posts
          </Link>
          <Link 
            to="/"
            className="px-6 py-3 border border-white/20 text-white/70 text-sm hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors"
          >
            return home
          </Link>
        </div>
      </div>
    </div>
  );
}
