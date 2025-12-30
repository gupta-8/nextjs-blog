import AdminDashboardClient from '@/components/pages/admin/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard | Admin',
  robots: { index: false, follow: false },
}

// Server-rendered dashboard skeleton for instant LCP
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// dashboard.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          dashboard<span className="text-[#a78bfa]">.</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">// Overview of your site</p>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-white/10 p-4">
            <div className="h-3 w-16 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-white/10 p-4">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="border border-white/10 p-4">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <>
      <noscript>
        <DashboardSkeleton />
      </noscript>
      <AdminDashboardClient />
    </>
  )
}
