import BlogPostPageClient from '@/components/pages/BlogPostPageClient'
import Script from 'next/script'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.yourdomain.com'

// Helper to get site URL from backend URL
const getSiteUrl = () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://yourdomain.com'
  // Convert backend URL to frontend URL (remove /api suffix if present, adjust port if needed)
  return backendUrl.replace('/api', '').replace(':8001', ':3000').replace('api.', '')
}

// Fetch profile for metadata
async function getProfile() {
  try {
    const res = await fetch(`${API_URL}/api/profile`, { cache: 'no-store' })
    if (res.ok) return res.json()
    return null
  } catch (error) {
    return null
  }
}

// Generate dynamic metadata for SEO, Telegram Instant View, and social sharing
export async function generateMetadata({ params }) {
  const { slug } = await params
  const profile = await getProfile()
  const siteName = profile?.name && profile?.role ? `${profile.name} - ${profile.role}` : 'Name - Role'
  const authorName = profile?.name || 'Name'
  
  try {
    const res = await fetch(`${API_URL}/api/blogs/${slug}`, { cache: 'no-store' })
    
    if (!res.ok) {
      return {
        title: `Blog Post Not Found | ${authorName}`,
        description: 'The requested blog post could not be found.',
        robots: { index: false, follow: false }
      }
    }
    
    const blog = await res.json()
    const ogImage = blog.image || '/og-image.png'
    const siteUrl = getSiteUrl()
    
    return {
      title: `${blog.title} | ${authorName}`,
      description: blog.excerpt || blog.title,
      authors: [{ name: blog.author_name || authorName }],
      robots: {
        index: blog.is_published !== false,
        follow: true,
        googleBot: {
          index: blog.is_published !== false,
          follow: true,
        }
      },
      alternates: {
        canonical: `${siteUrl}/blog/${slug}`,
      },
      // Open Graph - used by Telegram, Facebook, etc.
      openGraph: {
        type: 'article',
        title: blog.title,
        description: blog.excerpt || blog.title,
        url: `${siteUrl}/blog/${slug}`,
        siteName: siteName,
        images: [{
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blog.title,
        }],
        publishedTime: blog.created_at,
        modifiedTime: blog.updated_at,
        authors: [blog.author_name || authorName],
        section: blog.category,
        tags: blog.tags,
      },
      // Twitter Card
      twitter: {
        card: 'summary_large_image',
        title: blog.title,
        description: blog.excerpt || blog.title,
        images: [ogImage],
      },
      // Additional meta for Telegram Instant View
      other: {
        // Article metadata for IV
        'article:published_time': blog.created_at,
        'article:modified_time': blog.updated_at || blog.created_at,
        'article:author': blog.author_name || authorName,
        'article:section': blog.category,
        // Reading time for Telegram
        'twitter:label1': 'Reading time',
        'twitter:data1': `${blog.reading_time || 5} min read`,
        'twitter:label2': 'Category',
        'twitter:data2': blog.category,
      },
    }
  } catch (error) {
    console.error('Error fetching blog metadata:', error)
    return {
      title: `Blog | ${authorName}`,
      description: 'Read our latest blog posts.',
    }
  }
}

// Server-side data fetching for SSR - eliminates LCP delay
async function fetchBlogData(slug) {
  try {
    // Fetch all required data in parallel on the server
    const [blogRes, profileRes, latestRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs/${slug}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/blogs?limit=5`, { cache: 'no-store' })
    ])

    if (!blogRes.ok) {
      return { error: 'Blog post not found', blog: null }
    }

    const [blog, profile, latestPosts] = await Promise.all([
      blogRes.json(),
      profileRes.json(),
      latestRes.json()
    ])

    // Fetch adjacent and related posts
    const [adjRes, relRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs/${slug}/adjacent`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/blogs/${slug}/related?limit=3`, { cache: 'no-store' })
    ])
    
    const [adjacent, related] = await Promise.all([
      adjRes.ok ? adjRes.json() : { previous: null, next: null },
      relRes.ok ? relRes.json() : []
    ])

    // Collect all tags
    const tags = new Set()
    if (blog.tags) blog.tags.forEach(t => tags.add(t))
    latestPosts.forEach(p => p.tags?.forEach(t => tags.add(t)))

    return {
      blog,
      profile,
      latestPosts: latestPosts.filter(p => p.slug !== slug).slice(0, 3),
      adjacent,
      related,
      allTags: [...tags],
      error: null
    }
  } catch (error) {
    console.error('Error fetching blog data:', error)
    return { error: 'Failed to load blog post', blog: null }
  }
}

// Generate Schema.org JSON-LD for rich results and Telegram IV
function generateStructuredData(blog, siteUrl, profile) {
  if (!blog) return null
  
  const authorName = blog.author_name || profile?.name || 'Name'
  const ogImage = blog.image || `${siteUrl}/og-image.png`
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${siteUrl}/blog/${blog.slug}#article`,
    'headline': blog.title,
    'description': blog.excerpt || blog.title,
    'image': {
      '@type': 'ImageObject',
      'url': ogImage,
      'width': 1200,
      'height': 630
    },
    'datePublished': blog.created_at,
    'dateModified': blog.updated_at || blog.created_at,
    'author': {
      '@type': 'Person',
      'name': authorName,
      'url': siteUrl
    },
    'publisher': {
      '@type': 'Person',
      'name': authorName,
      'url': siteUrl,
      'logo': {
        '@type': 'ImageObject',
        'url': `${siteUrl}/logo.png`
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': `${siteUrl}/blog/${blog.slug}`
    },
    'articleSection': blog.category,
    'keywords': blog.tags?.join(', '),
    'wordCount': blog.content ? blog.content.split(/\s+/).length : 0,
    'inLanguage': 'en-US'
  }
}

// Server-rendered blog post for Telegram Instant View
// This provides clean semantic HTML that Telegram can parse
function ServerBlogPost({ blog, siteUrl, profile }) {
  if (!blog) return null
  
  const authorName = blog.author_name || profile?.name || 'Name'
  const ogImage = blog.image || `${siteUrl}/og-image.png`
  
  // Strip HTML tags for plain text (Telegram IV uses this)
  const plainContent = blog.content 
    ? blog.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
  
  return (
    <article 
      itemScope 
      itemType="https://schema.org/Article"
      className="min-h-screen bg-[#0a0a0a] text-white font-mono"
    >
      {/* Article Header - Telegram IV extracts this */}
      <header className="py-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <a href="/blog" className="text-[#a78bfa] text-xs mb-4 block" rel="author">← back to blog</a>
          
          {/* Title - Main heading for Telegram IV */}
          <h1 itemProp="headline" className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
            {blog.title}
          </h1>
          
          {/* Meta information */}
          <div className="mt-4 text-sm text-white/50">
            <address className="inline not-italic" itemProp="author" itemScope itemType="https://schema.org/Person">
              By <span itemProp="name">{authorName}</span>
            </address>
            <span className="mx-2">•</span>
            <time itemProp="datePublished" dateTime={blog.created_at}>
              {new Date(blog.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </time>
            <span className="mx-2">•</span>
            <span>{blog.reading_time || 5} min read</span>
          </div>
          
          {/* Excerpt/Subtitle - Telegram IV uses this */}
          {blog.excerpt && (
            <p itemProp="description" className="text-white/60 mt-4">
              {blog.excerpt}
            </p>
          )}
        </div>
      </header>
      
      {/* Featured Image - Telegram IV extracts this */}
      {blog.image && (
        <figure className="max-w-6xl mx-auto px-4 py-6">
          <img 
            itemProp="image" 
            src={blog.image} 
            alt={blog.title}
            className="w-full h-auto"
          />
        </figure>
      )}
      
      {/* Article Content - Main body for Telegram IV */}
      <div itemProp="articleBody" className="max-w-6xl mx-auto px-4 py-6 prose prose-invert">
        {/* Render content as HTML for Telegram to parse */}
        <div dangerouslySetInnerHTML={{ __html: blog.content || '' }} />
      </div>
      
      {/* Article Footer with Tags */}
      {blog.tags && blog.tags.length > 0 && (
        <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {blog.tags.map(tag => (
              <a 
                key={tag} 
                href={`/blog/tag/${encodeURIComponent(tag)}`}
                className="text-[#a78bfa] text-sm"
                rel="tag"
              >
                #{tag}
              </a>
            ))}
          </div>
        </footer>
      )}
      
      {/* Hidden structured data for crawlers */}
      <meta itemProp="url" content={`${siteUrl}/blog/${blog.slug}`} />
      <meta itemProp="mainEntityOfPage" content={`${siteUrl}/blog/${blog.slug}`} />
    </article>
  )
}

export default async function BlogPostPage({ params }) {
  const resolvedParams = await params
  const { slug } = resolvedParams
  const siteUrl = getSiteUrl()
  
  // Fetch data on the server for SSR
  const initialData = await fetchBlogData(slug)
  const structuredData = generateStructuredData(initialData?.blog, siteUrl, initialData?.profile)
  
  return (
    <>
      {/* Schema.org JSON-LD for SEO and Telegram IV */}
      {structuredData && (
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      
      {/* Server-rendered article for Telegram Instant View (noscript fallback) */}
      <noscript>
        <ServerBlogPost blog={initialData?.blog} siteUrl={siteUrl} profile={initialData?.profile} />
      </noscript>
      
      {/* Client component with full interactivity */}
      <BlogPostPageClient params={resolvedParams} initialData={initialData} />
    </>
  )
}