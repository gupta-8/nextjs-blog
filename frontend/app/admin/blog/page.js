import AdminBlogClient from '@/components/pages/admin/AdminBlogClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Blog | Admin ',
  robots: { index: false, follow: false },
}

// Server-rendered blog list skeleton
function BlogListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// blog_manager.php</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            blog<span className="text-[#a78bfa]">.</span>
          </h1>
        </div>
        <div className="h-10 w-32 bg-[#a78bfa]/20 rounded animate-pulse" />
      </div>

      {/* Search/Filter Bar Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 flex-1 bg-white/5 border border-white/10 rounded animate-pulse" />
        <div className="h-10 w-32 bg-white/5 border border-white/10 rounded animate-pulse" />
      </div>

      {/* Blog Posts Skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-white/10 p-4 flex items-center gap-4">
            <div className="w-20 h-14 bg-white/5 rounded animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-white/5 rounded animate-pulse" />
              <div className="w-8 h-8 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminBlogPage() {
  return (
    <>
      <noscript>
        <BlogListSkeleton />
      </noscript>
      <AdminBlogClient />
    </>
  )
}
