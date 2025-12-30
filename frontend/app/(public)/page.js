import HomePageClient from '@/components/pages/HomePageClient'

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
  const bio = profile?.bio || 'Bio'
  
  return {
    title: `${name} - ${role}`,
    description: bio,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: `${name} - ${role}`,
      description: bio,
      type: 'website',
      siteName: `${name} - ${role}`,
    },
    twitter: {
      card: 'summary',
      title: `${name} - ${role}`,
      description: bio,
    },
  }
}

// Fetch profile and content data server-side for better LCP
async function getInitialData() {
  try {
    const [profileRes, contentRes, blogsRes] = await Promise.all([
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/content/home`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/blogs?featured=true&limit=1`, { cache: 'no-store' })
    ])
    
    const [profile, content, blogs] = await Promise.all([
      profileRes.ok ? profileRes.json() : null,
      contentRes.ok ? contentRes.json() : {},
      blogsRes.ok ? blogsRes.json() : []
    ])
    
    return { profile, content, featuredBlog: blogs[0] || null }
  } catch (error) {
    return { profile: null, content: {}, featuredBlog: null }
  }
}

// Server-rendered hero for instant LCP - this HTML is sent immediately
function ServerHero({ initialData }) {
  const content = initialData?.content || {}
  const profile = initialData?.profile
  
  const name = content.hero_name || profile?.name || 'Site'
  const firstName = name.split(' ')[0]
  const tagline = content.hero_tagline || 'index.php'
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="min-h-screen flex items-center py-8">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="space-y-8">
            <p className="text-[#a78bfa] text-xs tracking-[0.3em]">// {tagline}</p>
            <div className="space-y-2">
              <p className="text-white/40 text-lg tracking-wide">hello, I'm</p>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter">
                <span className="text-white">{firstName}</span>
                <span className="text-[#a78bfa]">.</span>
              </h1>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default async function HomePage() {
  const initialData = await getInitialData()
  
  // Return server-rendered content with SSR data passed to client
  return (
    <>
      {/* Hidden server-rendered hero for SEO and instant LCP */}
      <noscript>
        <ServerHero initialData={initialData} />
      </noscript>
      {/* Client component with full interactivity */}
      <HomePageClient initialData={initialData} />
    </>
  )
}
