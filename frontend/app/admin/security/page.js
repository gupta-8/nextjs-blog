import AdminSecurityClient from '@/components/pages/admin/AdminSecurityClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Security | Admin ',
  robots: { index: false, follow: false },
}

function SecuritySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// security.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          security<span className="text-[#a78bfa]">.</span>
        </h1>
      </div>
      <div className="grid gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-white/10 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-white/10 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-10 w-32 bg-[#a78bfa]/20 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSecurityPage() {
  return (
    <>
      <noscript><SecuritySkeleton /></noscript>
      <AdminSecurityClient />
    </>
  )
}
