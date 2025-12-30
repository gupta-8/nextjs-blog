import BlogPageClient from '@/components/pages/BlogPageClient'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

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

// Dynamic metadata based on profile
export async function generateMetadata() {
  const profile = await getProfile()
  const name = profile?.name || 'Name'
  const role = profile?.role || 'Role'
  
  return {
    title: `Blog | ${name} - ${role}`,
    description: `Thoughts, tutorials, and insights by ${name}.`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: '/blog',
    },
    openGraph: {
      title: `Blog | ${name}`,
      description: `Thoughts, tutorials, and insights by ${name}.`,
      type: 'website',
      siteName: `${name} - ${role}`,
    },
    twitter: {
      card: 'summary',
      title: `Blog | ${name}`,
      description: `Thoughts, tutorials, and insights by ${name}.`,
    },
  }
}

// Fetch data server-side
async function getInitialData() {
  try {
    const [blogsRes, featuredRes, categoriesRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs?limit=50`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/blogs?featured=true&limit=1`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/blogs/categories/list`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' })
    ])
    
    const [blogs, featured, categories, profile] = await Promise.all([
      blogsRes.ok ? blogsRes.json() : [],
      featuredRes.ok ? featuredRes.json() : [],
      categoriesRes.ok ? categoriesRes.json() : [],
      profileRes.ok ? profileRes.json() : null
    ])
    
    return { blogs, featuredBlogs: featured, categories, profile }
  } catch (error) {
    return { blogs: [], featuredBlogs: [], categories: [], profile: null }
  }
}

// Server-rendered header for instant LCP
function ServerBlogHeader() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="py-12 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// blog.php</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-white">blog</span>
            <span className="text-[#a78bfa]">.</span>
          </h1>
          <p className="text-white/50 mt-4 text-lg">Thoughts, tutorials, and insights on PHP, WordPress, and web development.</p>
        </div>
      </section>
    </div>
  )
}

export default async function BlogPage() {
  const initialData = await getInitialData()
  
  return (
    <>
      <noscript>
        <ServerBlogHeader />
      </noscript>
      <BlogPageClient initialData={initialData} />
    </>
  )
}
