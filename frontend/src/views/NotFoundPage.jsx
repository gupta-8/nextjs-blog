'use client'
import React, { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';

export default function NotFoundPage() {
  const [currentPath, setCurrentPath] = useState('/pages/');
  const [domain, setDomain] = useState('yourdomain.com');

  useEffect(() => {
    // Get the actual path from window.location
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
      // Use the actual hostname or fall back to NEXT_PUBLIC_SITE_URL
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const hostname = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      setDomain(hostname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono flex items-center justify-center px-6 pt-20 lg:pt-0">
      <div className="max-w-2xl w-full text-center">
        {/* Error Code */}
        <div className="mb-8">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// error_handler.php</p>
          <h1 className="text-7xl sm:text-9xl font-bold text-white/10 leading-none">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="border border-white/10 p-6 sm:p-8 mb-8 overflow-hidden">
          <div className="text-left space-y-2 max-w-full">
            <p className="text-white/30 text-xs sm:text-sm">
              <span className="text-red-400">Fatal error</span>: Page not found
            </p>
            <p className="text-white/30 text-xs sm:text-sm break-words overflow-wrap-anywhere" style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}>
              <span className="text-white/50">in</span> <span className="text-[#a78bfa]">/var/www/{domain}{currentPath}</span>
            </p>
            <p className="text-white/30 text-xs sm:text-sm">
              <span className="text-white/50">Stack trace:</span>
            </p>
            <p className="text-white/20 text-xs pl-4">
              #0 Router-&gt;resolve() returned <span className="text-red-400">NULL</span>
            </p>
            <p className="text-white/20 text-xs pl-4">
              #1 Request-&gt;dispatch() threw <span className="text-yellow-400">NotFoundException</span>
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            <span className="text-white/30">page</span> = <span className="text-red-400">null</span>;
          </h2>
          <p className="text-white/50 text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/"
            className="px-8 py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors"
          >
            return home
          </Link>
          <Link 
            to="/contact"
            className="px-8 py-3 border border-white/20 text-white/70 text-sm hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors"
          >
            report issue
          </Link>
        </div>
      </div>
    </div>
  );
}
