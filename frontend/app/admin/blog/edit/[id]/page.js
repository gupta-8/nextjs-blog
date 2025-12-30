'use client'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import BlogEditorPage from '@/components/editor/BlogEditorPage'

export default function EditBlogPage() {
  const params = useParams()
  
  useEffect(() => {
    document.title = 'Edit Post | Admin '
  }, [])
  
  return <BlogEditorPage isNew={false} blogId={params.id} />
}
