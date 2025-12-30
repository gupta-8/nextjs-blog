'use client'

import BlogPage from '@/views/BlogPage'
import { Suspense } from 'react'

// Wrapper to handle Suspense boundary for useSearchParams
function BlogPageWrapper({ initialData }) {
  return <BlogPage initialData={initialData} />
}

export default function BlogPageClient({ initialData }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
        <section className="py-12 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="text-4xl font-bold">Blog</h1>
          </div>
        </section>
      </div>
    }>
      <BlogPageWrapper initialData={initialData} />
    </Suspense>
  )
}
