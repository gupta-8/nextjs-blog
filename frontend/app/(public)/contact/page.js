import { Suspense } from 'react'
import ContactPageClient from '@/components/pages/ContactPageClient'

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
  
  return {
    title: `Contact | ${name} - ${role}`,
    description: `Get in touch with ${name}.`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: '/contact',
    },
    openGraph: {
      title: `Contact ${name}`,
      description: `Get in touch with ${name}.`,
      type: 'website',
      siteName: `${name} - ${role}`,
    },
    twitter: {
      card: 'summary',
      title: `Contact ${name}`,
      description: `Get in touch with ${name}.`,
    },
  }
}

// Server-side data fetching for SSR
async function getInitialData() {
  try {
    const [profileRes, contentRes] = await Promise.all([
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/content/contact`, { cache: 'no-store' })
    ])
    
    const [profile, content] = await Promise.all([
      profileRes.ok ? profileRes.json() : null,
      contentRes.ok ? contentRes.json() : {}
    ])
    
    return { profile, content }
  } catch (error) {
    console.error('Error fetching contact data:', error)
    return { profile: null, content: {} }
  }
}

// Server-rendered skeleton for instant LCP
function ContactSkeleton({ initialData }) {
  const profile = initialData?.profile
  const name = profile?.name || 'Site'
  const firstName = name.split(' ')[0]
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// contact.php</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            <span className="text-white">contact</span>
            <span className="text-[#a78bfa]">.</span>
          </h1>
        </div>
      </section>
    </div>
  )
}

export default async function ContactPage() {
  const initialData = await getInitialData()
  
  return (
    <Suspense fallback={<ContactSkeleton initialData={initialData} />}>
      <ContactPageClient initialData={initialData} />
    </Suspense>
  )
}
