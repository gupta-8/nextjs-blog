'use client'
import React, { useState, useEffect, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { Link } from '@/lib/router-compat';
import { useSite } from '@/contexts/SiteContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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

// Lazy load non-critical below-fold components
const Footer = dynamic(() => import('../components/Footer'), {
  loading: () => <div className="h-[200px] bg-[#0a0a0a]" aria-hidden="true" />,
  ssr: false // Don't SSR footer - it's below the fold
});

const CTASection = dynamic(() => import('../components/CTASection'), {
  loading: () => <div className="h-[300px] bg-[#0a0a0a]" aria-hidden="true" />,
  ssr: false
});

// Memoized stat card component
const StatCard = memo(function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-[#a78bfa]">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
});

export default function HomePage({ initialData = {} }) {
  // Use server-provided data immediately - no loading state needed for initial render
  const [profile, setProfile] = useState(initialData.profile || null);
  const [content, setContent] = useState(initialData.content || {});
  const [featuredBlog, setFeaturedBlog] = useState(initialData.featuredBlog || null);
  
  // Skip client-side fetch if we have initial data
  const [loading, setLoading] = useState(!initialData.profile);
  
  // Get dynamic site name
  const { siteName } = useSite();

  useEffect(() => {
    document.title = `${siteName}`;
  }, [siteName]);

  // Only fetch client-side if no initial data was provided
  useEffect(() => {
    if (initialData.profile) return; // Skip if we have server data
    
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        const [profileRes, contentRes, blogsRes] = await Promise.all([
          fetch(`${API_URL}/api/profile`, { 
            signal: controller.signal,
            cache: 'default'
          }),
          fetch(`${API_URL}/api/content/home`, { 
            signal: controller.signal,
            cache: 'default'
          }),
          fetch(`${API_URL}/api/blogs?featured=true&limit=1`, { 
            signal: controller.signal,
            cache: 'default'
          })
        ]);
        
        const [profileData, contentData, blogsData] = await Promise.all([
          profileRes.json(),
          contentRes.json(),
          blogsRes.json()
        ]);
        
        setProfile(profileData);
        setContent(contentData);
        setFeaturedBlog(blogsData[0] || null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Silent fail - show default content
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    return () => controller.abort();
  }, [initialData.profile]);

  // Memoize derived values to prevent unnecessary re-renders
  const { name, firstName, role, tagline, philosophy, statsExp, statsProjects, statsClients } = useMemo(() => {
    const name = content.hero_name || profile?.name || siteName;
    return {
      name,
      firstName: name.split(' ')[0],
      role: content.hero_role || profile?.role || 'PHP & WordPress Developer',
      tagline: content.hero_tagline || 'index.php',
      philosophy: content.hero_philosophy || profile?.motto || '', // Empty if not set
      statsExp: content.stats_experience || '5+ years',
      statsProjects: content.stats_projects || '100+',
      statsClients: content.stats_clients || '50+'
    };
  }, [content, profile, siteName]);

  // Show skeleton only if no initial data AND still loading
  if (loading && !initialData.profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
        <section className="min-h-screen flex items-center py-8 sm:py-0">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <div className="space-y-8">
              <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// index.php</p>
              <div className="space-y-2">
                <p className="text-white/40 text-lg tracking-wide">hello, I'm</p>
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter">
                  <span className="text-white">{siteName}</span>
                  <span className="text-[#a78bfa]">.</span>
                </h1>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }
  
  const statsLocation = content.stats_location || 'Chhattisgarh';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black">

      {/* Hero Section - LCP optimized with instant render */}
      <section className="min-h-screen flex items-center border-b border-white/10 relative overflow-hidden py-8 sm:py-0">
        {/* Background Grid Pattern - CSS only, no JS */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none" 
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgba(167,139,250,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Floating Code Elements - Hidden on mobile for faster LCP */}
        <div className="absolute top-20 left-10 text-white/[0.03] text-6xl font-bold select-none hidden lg:block" aria-hidden="true">{'<?php'}</div>
        <div className="absolute bottom-32 right-16 text-white/[0.03] text-5xl font-bold select-none hidden lg:block" aria-hidden="true">{'?>'}</div>
        <div className="absolute top-1/4 right-1/4 text-white/[0.02] text-8xl font-bold select-none hidden lg:block rotate-12" aria-hidden="true">{'{ }'}</div>
        
        {/* Glowing Orb - CSS-only blur effects */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#a78bfa]/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-[#a78bfa]/3 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
        
        <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Side - Main Content */}
            <div className="space-y-8">
              {/* Tag */}
              <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// {tagline}</p>
              
              {/* Main Heading */}
              <div className="space-y-2">
                <p className="text-white/40 text-lg sm:text-xl tracking-wide">hello, I'm</p>
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
                  <span className="text-white">{firstName}</span>
                  <span className="text-[#a78bfa] drop-shadow-[0_0_30px_rgba(167,139,250,0.3)]">.</span>
                </h1>
              </div>
              
              {/* Role & Tagline */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px w-12 bg-gradient-to-r from-[#a78bfa] to-transparent"></div>
                  <p className="text-white/60 text-sm sm:text-base font-medium tracking-wide uppercase">
                    {role}
                  </p>
                </div>
                {philosophy && (
                  <p className="text-white/40 text-base sm:text-lg leading-relaxed max-w-lg">
                    {philosophy}
                  </p>
                )}
              </div>
              
              {/* CTA Buttons */}
              <div className="flex items-center gap-3 sm:gap-4 pt-4">
                <Link 
                  to="/blog"
                  className="group relative px-5 sm:px-8 py-3 sm:py-4 bg-[#a78bfa] text-black font-semibold text-xs sm:text-sm tracking-wider hover:bg-[#c4b5fd] transition-all duration-300 hover:shadow-[0_0_40px_rgba(167,139,250,0.4)]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    read blog
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
                <Link 
                  to="/contact"
                  className="group px-5 sm:px-8 py-3 sm:py-4 border-2 border-white/20 text-white/70 font-medium text-xs sm:text-sm tracking-wider hover:border-[#a78bfa]/50 hover:text-white hover:bg-white/[0.02] transition-all duration-300"
                >
                  contact
                </Link>
              </div>
            </div>
            
            {/* Right Side - Developer Card */}
            <div className="relative lg:order-last mt-8 lg:mt-0 overflow-hidden">
              <div className="border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-sm">
                {/* Card Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex-shrink-0 bg-[#a78bfa] flex items-center justify-center">
                      {profile?.logo ? (
                        <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-black font-bold">{firstName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium font-mono truncate">{typeof window !== 'undefined' ? window.location.hostname : 'site.com'}</p>
                      <p className="text-white/40 text-xs truncate">{profile?.location || 'Location'}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-green-400 text-[10px] uppercase tracking-wider">Online</span>
                    </div>
                  </div>
                </div>
                
                {/* Services */}
                <div className="p-4 sm:p-6 border-b border-white/10">
                  <p className="text-[#a78bfa] text-[10px] tracking-[0.2em] mb-4">// services.php</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/5">
                      <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="text-white/60 text-xs">WordPress</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/5">
                      <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                      <span className="text-white/60 text-xs">PHP</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/5">
                      <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                      <span className="text-white/60 text-xs">Themes</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/5">
                      <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-white/60 text-xs">Speed</span>
                    </div>
                  </div>
                </div>
                
                {/* Status */}
                <div className="p-4 sm:p-6">
                  <p className="text-[#a78bfa] text-[10px] tracking-[0.2em] mb-4">// status.php</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white/70 text-sm">Building projects</p>
                        <p className="text-white/30 text-[10px]">open for freelance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white/70 text-sm">Learning React</p>
                        <p className="text-white/30 text-[10px]">expanding stack</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator - Removed */}
      </section>

      {/* Blog Section */}
      <section className="py-16 sm:py-20 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          {featuredBlog ? (
            <Link to={`/blog/${featuredBlog.slug}`} className="group block">
              <div className="relative">
                {/* Accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#a78bfa] via-[#a78bfa]/50 to-transparent"></div>
                
                <div className="pl-6 sm:pl-8">
                  {/* Label */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] text-[#a78bfa] tracking-widest uppercase">Featured Post</span>
                    <span className="h-px flex-1 bg-white/10"></span>
                    <span className="text-[10px] text-white/30">{featuredBlog.category}</span>
                  </div>

                  {/* Content Grid - Text left, Image right on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6 md:gap-8 items-start">
                    {/* Text Content */}
                    <div className="order-2 md:order-1">
                      {/* Title */}
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-[#a78bfa] transition-colors">
                        {featuredBlog.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-white/50 text-base sm:text-lg mb-6 leading-relaxed">
                        {featuredBlog.excerpt}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>{featuredBlog.reading_time} min read</span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span>{featuredBlog.views || 0} views</span>
                      </div>
                    </div>

                    {/* Image - Right side on desktop, above on mobile - only show if valid */}
                    {featuredBlog.image && !isImageBroken(featuredBlog.image) && (
                      <div className="order-1 md:order-2 w-full md:w-[260px] lg:w-[300px] h-[180px] md:h-[200px] flex-shrink-0 overflow-hidden border border-white/10 bg-[#0a0a0a]">
                        <img 
                          src={featuredBlog.image} 
                          alt={featuredBlog.title}
                          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#a78bfa] via-[#a78bfa]/50 to-transparent"></div>
              <div className="pl-6 sm:pl-8">
                <span className="text-[10px] text-[#a78bfa] tracking-widest uppercase">Blog</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2 mb-3">Coming Soon</h2>
                <p className="text-white/40 text-sm mb-4">Thoughts on development and design.</p>
                <Link to="/blog" className="text-sm text-[#a78bfa] hover:underline">
                  View all posts
                </Link>
              </div>
            </div>
          )}

          {/* View all link */}
          {featuredBlog && (
            <div className="mt-8 text-center">
              <Link 
                to="/blog" 
                className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-[#a78bfa] transition-colors border-b border-white/10 hover:border-[#a78bfa]/30 pb-1"
              >
                View all posts
              </Link>
            </div>
          )}
        </div>
      </section>

      <CTASection />

      <Footer profile={profile} />
    </div>
  );
}
