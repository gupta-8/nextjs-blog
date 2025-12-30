import AdminProfileClient from '@/components/pages/admin/AdminProfileClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Profile | Admin ',
  robots: { index: false, follow: false },
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// profile.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          profile<span className="text-[#a78bfa]">.</span>
        </h1>
      </div>
      <div className="border border-white/10 p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/10 rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-48 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-full bg-white/5 border border-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminProfilePage() {
  return (
    <>
      <noscript><ProfileSkeleton /></noscript>
      <AdminProfileClient />
    </>
  )
}
