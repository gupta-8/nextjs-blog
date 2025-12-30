'use client'

import BlogTagPage from '@/views/BlogTagPage'

export default function BlogTagPageClient({ params, initialData }) {
  return <BlogTagPage tag={params.tag} initialData={initialData} />
}
