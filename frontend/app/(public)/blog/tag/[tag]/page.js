import { Suspense } from 'react'
import BlogTagPageClient from '@/components/pages/BlogTagPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function generateMetadata({ params }) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  
  return {
    title: `#${decodedTag} | Blog `,
    description: `Browse all blog posts tagged with ${decodedTag}.`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: `/blog/tag/${tag}`,
    },
  }
}

// Server-side data fetching for SSR
async function getInitialData(tag) {
  const decodedTag = decodeURIComponent(tag)
  
  try {
    const [blogsRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs/tag/${encodeURIComponent(decodedTag)}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' })
    ])
    
    const [blogs, profile] = await Promise.all([
      blogsRes.ok ? blogsRes.json() : [],
      profileRes.ok ? profileRes.json() : null
    ])
    
    return { blogs, profile, tag: decodedTag }
  } catch (error) {
    console.error('Error fetching tag data:', error)
    return { blogs: [], profile: null, tag: decodedTag }
  }
}

// Server-rendered skeleton for instant LCP
function TagSkeleton({ tag }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// tag.php</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            <span className="text-white/30">tag</span>
            <span className="text-white/30">{' = '}</span>
            <span className="text-[#a78bfa]">"#{tag}"</span>
            <span className="text-white/30">;</span>
          </h1>
        </div>
      </section>
    </div>
  )
}

export default async function BlogTagPage({ params }) {
  const resolvedParams = await params
  const { tag } = resolvedParams
  const decodedTag = decodeURIComponent(tag)
  const initialData = await getInitialData(tag)
  
  return (
    <Suspense fallback={<TagSkeleton tag={decodedTag} />}>
      <BlogTagPageClient params={resolvedParams} initialData={initialData} />
    </Suspense>
  )
}
