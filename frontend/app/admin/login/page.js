import AdminLoginClient from '@/components/pages/admin/AdminLoginClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Login ',
  description: 'Sign in to the admin panel',
  robots: { index: false, follow: false },
}

// Server-rendered login form shell for instant LCP
function ServerLoginShell() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 font-mono">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// admin_panel.php</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            admin<span className="text-[#a78bfa]">login</span>
          </h1>
          <p className="text-white/50 text-sm">// Sign in to manage your portfolio</p>
          <a href="/" className="inline-flex items-center gap-1 mt-3 text-[#a78bfa]/70 text-xs hover:text-[#a78bfa] transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            back to site
          </a>
        </div>

        {/* Login Form Shell */}
        <div className="border border-white/10 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-white/30">// auth_form</p>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-white/50 text-sm text-center mb-6">Choose how you want to sign in</p>
            
            <div className="w-full py-4 border border-white/20 text-white/80 text-sm flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              email + password
            </div>
            
            <div className="w-full py-4 border border-white/20 text-white/80 text-sm flex items-center justify-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              passkey
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <>
      {/* Server-rendered shell for SEO and instant LCP */}
      <noscript>
        <ServerLoginShell />
      </noscript>
      {/* Client component with full interactivity */}
      <AdminLoginClient />
    </>
  )
}
