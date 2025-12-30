import AdminFilesClient from '@/components/pages/admin/AdminFilesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Files | Admin ',
  robots: { index: false, follow: false },
}

function FilesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// file_manager.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          files<span className="text-[#a78bfa]">.</span>
        </h1>
      </div>
      <div className="border border-dashed border-white/20 p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-white/5 rounded animate-pulse" />
        <div className="h-4 w-48 mx-auto bg-white/10 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border border-white/10 p-2">
            <div className="aspect-square bg-white/5 rounded animate-pulse mb-2" />
            <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminFilesPage() {
  return (
    <>
      <noscript><FilesSkeleton /></noscript>
      <AdminFilesClient />
    </>
  )
}
