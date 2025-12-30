import FileUploadClient from '@/components/pages/admin/FileUploadClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Upload Files | Admin ',
  robots: { index: false, follow: false },
}

function UploadSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-2">// upload.php</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          upload<span className="text-[#a78bfa]">_files</span>
        </h1>
      </div>
      <div className="border-2 border-dashed border-white/20 p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
          <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
          <div className="h-10 w-32 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function FileUploadPage() {
  return (
    <>
      <noscript><UploadSkeleton /></noscript>
      <FileUploadClient />
    </>
  )
}
