'use client'

import BlogCategoryPage from '@/views/BlogCategoryPage'

export default function BlogCategoryPageClient({ params, initialData }) {
  return <BlogCategoryPage category={params.category} initialData={initialData} />
}
