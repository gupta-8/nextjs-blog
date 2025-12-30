'use client'
import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { useSite } from '@/contexts/SiteContext';

export default function Footer({ profile }) {
  const { siteName } = useSite();
  const name = profile?.name || siteName;
  const firstName = name.split(' ')[0];
  const currentYear = new Date().getFullYear();
  
  const [apiStatus, setApiStatus] = useState('checking');
  const [totalVisits, setTotalVisits] = useState(null);

  // Check API status, track visit, and get visits
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    const checkApi = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch {
        setApiStatus('offline');
      }
    };

    const trackVisit = async () => {
      try {
        // Only track once per session
        if (typeof window !== 'undefined' && !sessionStorage.getItem('visit_tracked')) {
          await fetch(`${API_URL}/api/visits/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          sessionStorage.setItem('visit_tracked', 'true');
        }
      } catch {
        // silently fail
      }
    };

    const getVisits = async () => {
      try {
        const response = await fetch(`${API_URL}/api/visits`);
        if (response.ok) {
          const data = await response.json();
          setTotalVisits(data.total);
        }
      } catch {
        // silently fail
      }
    };

    checkApi();
    trackVisit();
    // Get visits after a small delay to ensure track completes
    setTimeout(getVisits, 500);
    
    // Re-check visits every 30 seconds
    const interval = setInterval(getVisits, 30000);
    
    return () => clearInterval(interval);
  }, []);


  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer className="relative border-t border-white/10 font-mono overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(167,139,250,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#a78bfa]/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#a78bfa]/3 rounded-full blur-[80px] pointer-events-none"></div>
      
      {/* Main Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              {profile?.logo ? (
                <img src={profile.logo} alt="Logo" className="w-10 h-10 rounded object-contain" />
              ) : (
                <img src="/h-logo.png" alt="H." className="w-10 h-10 rounded" />
              )}
              <div>
                <h3 className="text-white font-bold text-lg">{firstName}<span className="text-[#a78bfa]">.</span></h3>
                {profile?.role && <p className="text-white/40 text-xs">{profile.role}</p>}
              </div>
            </div>
            {profile?.motto && (
              <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs">
                {profile.motto}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white/30 text-xs tracking-[0.2em] uppercase mb-4">// Navigation</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    className="text-white/50 text-sm hover:text-[#a78bfa] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Section */}
          <div>
            <h4 className="text-white/30 text-xs tracking-[0.2em] uppercase mb-4">// Connect</h4>
            <ul className="space-y-3">
              {profile?.social?.github && (
                <li>
                  <a 
                    href={profile.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-[#a78bfa] transition-colors flex items-center gap-3 group"
                  >
                    <svg className="w-4 h-4 text-white/30 group-hover:text-[#a78bfa] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                </li>
              )}
              {profile?.social?.linkedin && (
                <li>
                  <a 
                    href={profile.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-[#a78bfa] transition-colors flex items-center gap-3 group"
                  >
                    <svg className="w-4 h-4 text-white/30 group-hover:text-[#a78bfa] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
                </li>
              )}
              {profile?.social?.twitter && (
                <li>
                  <a 
                    href={profile.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 text-sm hover:text-[#a78bfa] transition-colors flex items-center gap-3 group"
                  >
                    <svg className="w-4 h-4 text-white/30 group-hover:text-[#a78bfa] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Twitter / X
                  </a>
                </li>
              )}
              {profile?.email && (
                <li>
                  <a 
                    href={`mailto:${profile.email}`}
                    className="text-white/50 text-sm hover:text-[#a78bfa] transition-colors flex items-center gap-3 group"
                  >
                    <svg className="w-4 h-4 text-white/30 group-hover:text-[#a78bfa] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Terminal/Code Block */}
          <div>
            <h4 className="text-white/30 text-xs tracking-[0.2em] uppercase mb-4">// Info</h4>
            <div className="bg-[#0d0d12] border border-white/10 p-4 text-xs">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                <span className="text-white/20 ml-2 text-[10px]">status.php</span>
              </div>
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center">
                  <span className="text-white/30">api</span>
                  <span className="text-white/20">&nbsp;=&nbsp;</span>
                  <span className={`${apiStatus === 'online' ? 'text-green-400' : apiStatus === 'offline' ? 'text-red-400' : 'text-yellow-400'}`}>
                    "{apiStatus}"
                  </span>
                  <span className="text-white/20">;</span>
                </div>
                <div>
                  <span className="text-white/30">visits</span>
                  <span className="text-white/20"> = </span>
                  <span className="text-orange-400">{totalVisits !== null ? totalVisits.toLocaleString() : '...'}</span>
                  <span className="text-white/20">;</span>
                </div>
                <div className="pt-2 mt-2 border-t border-white/5">
                  <span className="text-[#a78bfa]">return</span>
                  <span className="text-green-400"> "Thanks for visiting!"</span>
                  <span className="text-white/20">;</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 pb-20 lg:pb-8 relative z-[100]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <span>© {currentYear} {firstName}. All rights reserved.</span>
            </div>

            {/* Back to Top */}
            <div 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-white/30 text-xs hover:text-[#a78bfa] transition-colors group cursor-pointer select-none"
            >
              <span>Back to top</span>
              <svg className="w-4 h-4 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
