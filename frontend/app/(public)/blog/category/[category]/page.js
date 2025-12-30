import { Suspense } from 'react'
import BlogCategoryPageClient from '@/components/pages/BlogCategoryPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function generateMetadata({ params }) {
  const { category } = await params
  const decodedCategory = decodeURIComponent(category)
  
  return {
    title: `${decodedCategory} | Blog `,
    description: `Browse all blog posts in the ${decodedCategory} category.`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      }
    },
    alternates: {
      canonical: `/blog/category/${category}`,
    },
  }
}

// Server-side data fetching for SSR
async function getInitialData(category) {
  const decodedCategory = decodeURIComponent(category)
  
  try {
    const [blogsRes, profileRes] = await Promise.all([
      fetch(`${API_URL}/api/blogs/category/${encodeURIComponent(decodedCategory)}`, { cache: 'no-store' }),
      fetch(`${API_URL}/api/profile`, { cache: 'no-store' })
    ])
    
    const [blogs, profile] = await Promise.all([
      blogsRes.ok ? blogsRes.json() : [],
      profileRes.ok ? profileRes.json() : null
    ])
    
    return { blogs, profile, category: decodedCategory }
  } catch (error) {
    console.error('Error fetching category data:', error)
    return { blogs: [], profile: null, category: decodedCategory }
  }
}

// Server-rendered skeleton for instant LCP
function CategorySkeleton({ category }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      <section className="py-12 sm:py-16 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// category.php</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3">
            <span className="text-white/30">category</span>
            <span className="text-white/30">{' = '}</span>
            <span className="text-[#a78bfa]">"{category}"</span>
            <span className="text-white/30">;</span>
          </h1>
        </div>
      </section>
    </div>
  )
}

export default async function BlogCategoryPage({ params }) {
  const resolvedParams = await params
  const { category } = resolvedParams
  const decodedCategory = decodeURIComponent(category)
  const initialData = await getInitialData(category)
  
  return (
    <Suspense fallback={<CategorySkeleton category={decodedCategory} />}>
      <BlogCategoryPageClient params={resolvedParams} initialData={initialData} />
    </Suspense>
  )
}
