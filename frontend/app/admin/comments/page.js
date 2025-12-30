import AdminCommentsClient from '@/components/pages/admin/AdminCommentsClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Comments | Admin ',
  robots: { index: false, follow: false },
}

function CommentsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// comments.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          comments<span className="text-[#a78bfa]">.</span>
        </h1>
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border border-white/10 p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-full animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminCommentsPage() {
  return (
    <>
      <noscript><CommentsSkeleton /></noscript>
      <AdminCommentsClient />
    </>
  )
}
