import BlogEditorPage from '@/components/editor/BlogEditorPage'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'New Post | Admin ',
  robots: { index: false, follow: false },
}

export default function NewBlogPage() {
  return <BlogEditorPage isNew={true} blogId={null} />
}
