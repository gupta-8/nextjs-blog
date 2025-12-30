import { Suspense } from 'react'
import AboutPageClient from '@/components/pages/AboutPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60

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
    title: `About | ${name} - ${role}`,
    description: `Learn more about ${name}. ${bio}`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: '/about',
    },
    openGraph: {
      title: `About ${name}`,
      description: `Learn more about ${name}. ${bio}`,
      type: 'profile',
      siteName: `${name} - ${role}`,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || undefined,
    },
    twitter: {
      card: 'summary',
      title: `About ${name}`,
      description: `Learn more about ${name}. ${bio}`,
    },
  }
}

// Server-side data fetching for SSR
async function getInitialData() {
  try {
    const [profileRes, contentRes] = await Promise.all([
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/content/about`, { cache: 'no-store' })
    ])
    
    const [profile, content] = await Promise.all([
      profileRes.ok ? profileRes.json() : null,
      contentRes.ok ? contentRes.json() : {}
    ])
    
    return { profile, content }
  } catch (error) {
    console.error('Error fetching about data:', error)
    return { profile: null, content: {} }
  }
}

// Server-rendered skeleton for instant LCP
function AboutSkeleton({ initialData }) {
  const profile = initialData?.profile
  const content = initialData?.content || {}
  const name = profile?.name || 'Site'
  const firstName = name.split(' ')[0]
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// about_me.php</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
            <span className="text-white">developer</span> <span className="text-white/30">= [</span>
          </h1>
        </div>
      </section>
    </div>
  )
}

export default async function AboutPage() {
  const initialData = await getInitialData()
  
  return (
    <Suspense fallback={<AboutSkeleton initialData={initialData} />}>
      <AboutPageClient initialData={initialData} />
    </Suspense>
  )
}
