'use client'
import React, { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Link, useSearchParams } from '@/lib/router-compat';
import ImageWithPlaceholder from '../components/ImagePlaceholder';
import { useSite } from '@/contexts/SiteContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Lazy load Footer
const Footer = dynamic(() => import('../components/Footer'), {
  loading: () => <div className="h-[200px] bg-[#0a0a0a]" aria-hidden="true" />,
  ssr: false
});

// Memoized blog card for better performance
const BlogCard = memo(function BlogCard({ blog, formatDate }) {
  return (
    <Link to={`/blog/${blog.slug}`} className="group block">
      <article className="border border-white/10 bg-[#0d0d0d] overflow-hidden hover:border-[#a78bfa]/30 transition-colors duration-200">
        {/* Image with placeholder */}
        <div className="aspect-video overflow-hidden">
          <ImageWithPlaceholder
            src={blog.featured_image}
            alt={blog.title}
            className="group-hover:scale-105 transition-transform duration-300 opacity-90"
          />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/40">
            {blog.category && (
              <span className="text-[#a78bfa]">{blog.category}</span>
            )}
            <span>•</span>
            <time dateTime={blog.created_at}>{formatDate(blog.created_at)}</time>
          </div>
          <h3 className="text-white font-medium line-clamp-2 group-hover:text-[#a78bfa] transition-colors">
            {blog.title}
          </h3>
          {blog.excerpt && (
            <p className="text-white/50 text-sm line-clamp-2">{blog.excerpt}</p>
          )}
        </div>
      </article>
    </Link>
  );
});

// Loading skeleton
const BlogCardSkeleton = memo(function BlogCardSkeleton() {
  return (
    <div className="border border-white/10 bg-[#0d0d0d] overflow-hidden">
      <div className="aspect-video bg-white/5 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 bg-white/5 animate-pulse" />
        <div className="h-5 w-full bg-white/5 animate-pulse" />
        <div className="h-4 w-3/4 bg-white/5 animate-pulse" />
      </div>
    </div>
  );
});

// Posts Grid with 3 columns on PC, load more after 9 posts
const PostsGrid = memo(function PostsGrid({ blogs, formatDate }) {
  const [visibleCount, setVisibleCount] = useState(9);
  const POSTS_PER_PAGE = 9;
  
  const visibleBlogs = blogs.slice(0, visibleCount);
  const hasMore = visibleCount < blogs.length;
  
  const loadMore = () => {
    setVisibleCount(prev => prev + POSTS_PER_PAGE);
  };
  
  return (
    <>
      {/* 3-column grid on desktop (1024px+), 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleBlogs.map((blog, index) => {
          const postNumber = blogs.length - index;
          const imageUrl = blog.featured_image || blog.image;
          
          return (
            <Link 
              key={blog.id} 
              to={`/blog/${blog.slug}`}
              className="group block border border-white/10 bg-[#0d0d0d] hover:border-[#a78bfa]/30 transition-all"
            >
              {/* Post Header */}
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="text-xs text-white/40">post_{String(postNumber).padStart(2, '0')}.php</span>
                </div>
                <span className="text-[10px] text-white/30">{blog.category}</span>
              </div>
              
              {/* Full Image */}
              <div className="aspect-video border-b border-white/10 overflow-hidden bg-[#0a0a0a]">
                <ImageWithPlaceholder 
                  src={imageUrl} 
                  alt={blog.title}
                  className="opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                />
              </div>
              
              {/* Post Content */}
              <div className="p-4">
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#a78bfa] transition-colors line-clamp-2">
                  {blog.title}
                </h3>
                
                <p className="text-white/40 text-sm line-clamp-2 mb-3">
                  {blog.excerpt}
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                    <svg className="w-3 h-3 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-white/50">{formatDate(blog.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10">
                    <svg className="w-3 h-3 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[10px] text-white/50">{blog.reading_time || 3} min</span>
                  </div>
                  {blog.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-1 border border-white/10 text-[#a78bfa]/60">#{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-3 border border-[#a78bfa]/50 text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors text-sm font-medium"
          >
            load_more
          </button>
        </div>
      )}
    </>
  );
});

export default function BlogPage({ initialData = {} }) {
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState(initialData.blogs || []);
  const [featuredBlogs, setFeaturedBlogs] = useState(initialData.featuredBlogs || []);
  const [categories, setCategories] = useState(initialData.categories || []);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(!initialData.blogs);
  const [profile, setProfile] = useState(initialData.profile || null);
  
  // Get dynamic site name
  const { siteName } = useSite();

  useEffect(() => {
    document.title = `Blog | ${siteName}`;
  }, [siteName]);

  // Only fetch if no initial data
  useEffect(() => {
    if (initialData.blogs) return;
    
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        const [blogsRes, featuredRes, categoriesRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/api/blogs?limit=50`, { signal: controller.signal, cache: 'default' }),
          fetch(`${API_URL}/api/blogs?featured=true&limit=1`, { signal: controller.signal, cache: 'default' }),
          fetch(`${API_URL}/api/blogs/categories/list`, { signal: controller.signal, cache: 'default' }),
          fetch(`${API_URL}/api/profile`, { signal: controller.signal, cache: 'default' })
        ]);
        
        const [blogsData, featuredData, categoriesData, profileData] = await Promise.all([
          blogsRes.json(),
          featuredRes.json(),
          categoriesRes.json(),
          profileRes.json()
        ]);
        
        setBlogs(blogsData);
        setFeaturedBlogs(featuredData);
        setCategories(categoriesData);
        setProfile(profileData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Silent fail
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    return () => controller.abort();
  }, [initialData.blogs]);

  // Memoized filter function
  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [blogs, selectedCategory, searchQuery]);

  // Memoized date formatter
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  if (loading && !initialData.blogs) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-[#a78bfa]">loading</span>
        <span className="animate-pulse ml-1">|</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            
            {/* Left - Title */}
            <div>
              <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// blog.php</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                <span className="text-white/30">blog</span>
                <span className="text-white/30">{' = '}</span>
                <span className="text-white">new</span>
                <span className="text-[#a78bfa] ml-2">Posts</span>
                
              </h1>
              <p className="text-white/50 text-sm sm:text-base leading-relaxed">
                Thoughts, tutorials, and insights on PHP, WordPress, and web development.
              </p>
            </div>
            
            {/* Right - Stats Card */}
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="text-white/30 text-xs">// stats.php</span>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">total_posts</span>
                  <span className="text-[#a78bfa]">{blogs.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">categories</span>
                  <span className="text-green-400">{categories.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50">featured</span>
                  <span className="text-orange-400">{featuredBlogs.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="py-8 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-4">
            
            {/* Search Box - takes remaining space */}
            <div className="flex-1 border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span className="text-white/30 text-xs">// search.php</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-[#a78bfa]">query</span>
                  <span className="text-white/30">=</span>
                  <div className="flex-1 flex items-center">
                    <span className="text-green-400">"</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search posts..."
                      className="flex-1 bg-transparent text-green-400 text-sm placeholder:text-green-400/30 focus:outline-none"
                    />
                    <span className="text-green-400">"</span>
                  </div>
                  <span className="text-white/30">;</span>
                </div>
                {searchQuery && (
                  <p className="text-xs text-white/30 mt-3">
                    // Found {filteredBlogs.length} result{filteredBlogs.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            
            {/* Category Filter - compact width */}
            <div className="lg:w-auto border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <span className="text-white/30 text-xs">// filter.php</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-yellow-500/60"></span>
                  <span className="w-2 h-2 rounded-full bg-green-500/60"></span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`text-xs px-3 py-1.5 border transition-all ${
                      selectedCategory === 'all'
                        ? 'border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/10'
                        : 'border-white/10 text-white/40 hover:border-white/20'
                    }`}
                  >
                    all
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-3 py-1.5 border transition-all ${
                        selectedCategory === cat
                          ? 'border-[#a78bfa] text-[#a78bfa] bg-[#a78bfa]/10'
                          : 'border-white/10 text-white/40 hover:border-white/20'
                      }`}
                    >
                      {cat.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Post */}
      {featuredBlogs.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <section className="py-10 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// featured.php</p>
            
            <Link to={`/blog/${featuredBlogs[0].slug}`} className="group block">
              <div className="border border-[#a78bfa]/30 bg-[#0d0d0d] hover:border-[#a78bfa]/50 transition-colors">
                {/* Header */}
                <div className="border-b border-white/10 bg-[#a78bfa]/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse"></span>
                    <span className="text-xs text-white/50">featured_post.php</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-[#a78bfa]/20 to-[#a78bfa]/10 border-l border-[#a78bfa]/20">
                    <svg className="w-3 h-3 text-[#a78bfa]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-[10px] text-[#a78bfa] font-medium tracking-wide">FEATURED</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="grid md:grid-cols-2">
                  {/* Image Side with placeholder */}
                  <div className="aspect-video md:aspect-auto border-b md:border-b-0 md:border-r border-white/10 bg-[#0a0a0a] overflow-hidden">
                    <ImageWithPlaceholder 
                      src={featuredBlogs[0].image} 
                      alt={featuredBlogs[0].title}
                      className="opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  
                  {/* Text Side */}
                  <div className="p-5 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-[#a78bfa] transition-colors">
                      {featuredBlogs[0].title}
                    </h2>
                    
                    <p className="text-white/50 text-sm leading-relaxed mb-4 line-clamp-3">
                      {featuredBlogs[0].excerpt}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10">
                        <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] text-white/50">{formatDate(featuredBlogs[0].created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10">
                        <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] text-white/50">{featuredBlogs[0].reading_time} min</span>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 border border-white/10">
                        <svg className="w-3.5 h-3.5 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-[10px] text-white/50">{featuredBlogs[0].category}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="flex gap-2">
                        {featuredBlogs[0].tags?.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] text-[#a78bfa]/60">#{tag}</span>
                        ))}
                      </div>
                      <span className="text-sm text-[#a78bfa] group-hover:translate-x-1 transition-transform flex items-center gap-2">
                        read more
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// {searchQuery ? 'search_results.php' : 'posts.php'}</p>
            <p className="text-xs text-white/30">
              count = {filteredBlogs.length};
            </p>
          </div>
          
          {filteredBlogs.length > 0 ? (
            <PostsGrid 
              blogs={filteredBlogs} 
              formatDate={formatDate}
            />
          ) : (
            <div className="border border-white/10 bg-[#0d0d0d]">
              <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                <span className="text-white/30 text-xs">// error.php</span>
              </div>
              <div className="p-8 sm:p-12 text-center">
                <div className="text-4xl text-white/10 mb-4">{'{ }'}</div>
                <p className="text-white/50 text-sm mb-2">result = null;</p>
                <p className="text-white/30 text-xs">// No posts found. Try a different search.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer profile={profile} />
    </div>
  );
}
