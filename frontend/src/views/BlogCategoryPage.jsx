'use client'
import React, { useState, useEffect } from 'react';
import { useParams, Link } from '@/lib/router-compat';
import { useSite } from '@/contexts/SiteContext';
import Footer from '../components/Footer';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function BlogCategoryPage({ category: propCategory, initialData }) {
  const paramsCategory = useParams()?.category;
  const rawCategory = propCategory || paramsCategory;
  // Decode URL-encoded category (e.g., %20 -> space)
  const category = rawCategory ? decodeURIComponent(rawCategory) : '';
  
  // Use SSR data if available
  const hasSSRData = initialData && initialData.blogs;
  
  const [blogs, setBlogs] = useState(hasSSRData ? initialData.blogs : []);
  const [loading, setLoading] = useState(!hasSSRData);
  const [profile, setProfile] = useState(hasSSRData ? initialData.profile : null);
  
  // Get dynamic site name
  const { siteName } = useSite();

  useEffect(() => {
    document.title = `${category} | ${siteName}`;
  }, [category, siteName]);

  // Only fetch on client if no SSR data
  useEffect(() => {
    if (hasSSRData) return;
    
    const fetchData = async () => {
      try {
        const [blogsRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/api/blogs/category/${encodeURIComponent(category)}`),
          fetch(`${API_URL}/api/profile`)
        ]);
        
        const blogsData = await blogsRes.json();
        const profileData = await profileRes.json();
        
        setBlogs(blogsData);
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [category, hasSSRData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-[#a78bfa]">loading</span>
        <span className="animate-pulse ml-1">|</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black">
      {/* Header */}
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left - Title */}
            <div>
              <Link to="/blog" className="inline-flex items-center gap-2 text-[#a78bfa] text-xs hover:underline mb-6">
                <span>{'←'}</span> back
              </Link>
              <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// category.php</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">
                <span className="text-white/30">category</span>
                <span className="text-white/30">{' = '}</span>
                <span className="text-[#a78bfa]">"{category}"</span>
                <span className="text-white/30">;</span>
              </h1>
              <p className="text-white/50 text-sm">
                // {blogs.length} post{blogs.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            {/* Right - Stats Card */}
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span className="text-white/30 text-xs">// info.php</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                </div>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">type</span>
                  <span className="text-orange-400">"category"</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">name</span>
                  <span className="text-green-400">"{category}"</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">count</span>
                  <span className="text-[#a78bfa]">{blogs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Posts List */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// posts.php</p>
            <p className="text-xs text-white/30">results = {blogs.length};</p>
          </div>
          
          {blogs.length > 0 ? (
            <div className="space-y-4">
              {blogs.map((blog, index) => (
                <Link 
                  key={blog.id} 
                  to={`/blog/${blog.slug}`}
                  className="group block border border-white/10 bg-[#0d0d0d] hover:border-[#a78bfa]/30 transition-all"
                >
                  {/* Post Header */}
                  <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <span className="text-xs text-white/40">post_{String(index + 1).padStart(2, '0')}.php</span>
                    </div>
                    <span className="text-[10px] text-white/30">{blog.reading_time} min</span>
                  </div>
                  
                  {/* Post Content */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      {blog.image && (
                        <div className="sm:w-44 flex-shrink-0">
                          <div className="aspect-[4/3] border border-white/10 overflow-hidden bg-[#0a0a0a] flex items-center justify-center">
                            <img 
                              src={blog.image} 
                              alt={blog.title}
                              className="w-full h-full object-contain opacity-60 group-hover:opacity-90 transition-opacity"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 group-hover:text-[#a78bfa] transition-colors">
                          {blog.title}
                        </h3>
                        
                        <p className="text-white/40 text-sm line-clamp-2 mb-4">
                          {blog.excerpt}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                            <svg className="w-3 h-3 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-white/50">{formatDate(blog.created_at)}</span>
                          </div>
                          {blog.tags?.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-1 border border-white/10 text-[#a78bfa]/60">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="hidden sm:flex items-center">
                        <span className="text-[#a78bfa] opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                          {'>'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                <span className="text-white/30 text-xs">// error.php</span>
              </div>
              <div className="p-8 sm:p-12 text-center">
                <div className="text-3xl text-white/10 mb-4">{'{ }'}</div>
                <p className="text-white/50 text-sm mb-2">result = null;</p>
                <p className="text-white/30 text-xs mb-4">// No posts in this category</p>
                <Link to="/blog" className="text-[#a78bfa] text-xs hover:underline">
                  {'←'} browse all
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer profile={profile} />
    </div>
  );
}
