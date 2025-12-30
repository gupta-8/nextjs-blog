'use client'

import BlogPostPage from '@/views/BlogPostPage'

export default function BlogPostPageClient({ params, initialData }) {
  // Pass both slug and pre-fetched data to the BlogPostPage component
  return <BlogPostPage slug={params.slug} initialData={initialData} />
}
