import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SiteProvider } from '@/contexts/SiteContext'
import { Toaster } from '@/components/ui/toaster'

// Default metadata - will be overridden by page-specific generateMetadata
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    }
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0a',
}

// Critical inline CSS for instant LCP - these styles render before any external CSS loads
const criticalCSS = `
  /* Base reset and critical styles */
  *,*::before,*::after{box-sizing:border-box}
  html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
  body{margin:0;min-height:100vh;background:#0a0a0a;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;line-height:1.5}
  
  /* Layout utilities */
  .min-h-screen{min-height:100vh}
  .bg-\\[\\#0a0a0a\\]{background-color:#0a0a0a}
  .text-white{color:#fff}
  .font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
  
  /* LCP element styles - Hero text */
  .text-\\[\\#a78bfa\\]{color:#a78bfa}
  .text-4xl{font-size:2.25rem;line-height:2.5rem}
  .text-5xl{font-size:3rem;line-height:1}
  .text-6xl{font-size:3.75rem;line-height:1}
  .text-7xl{font-size:4.5rem;line-height:1}
  .text-8xl{font-size:6rem;line-height:1}
  .font-bold{font-weight:700}
  .font-black{font-weight:900}
  .tracking-tight{letter-spacing:-.025em}
  .tracking-tighter{letter-spacing:-.05em}
  
  /* Flexbox for layout */
  .flex{display:flex}
  .items-center{align-items:center}
  .justify-center{justify-content:center}
  
  /* Spacing */
  .space-y-2>:not([hidden])~:not([hidden]){margin-top:.5rem}
  .space-y-4>:not([hidden])~:not([hidden]){margin-top:1rem}
  .space-y-8>:not([hidden])~:not([hidden]){margin-top:2rem}
  .px-4{padding-left:1rem;padding-right:1rem}
  .px-6{padding-left:1.5rem;padding-right:1.5rem}
  .py-6{padding-top:1.5rem;padding-bottom:1.5rem}
  .py-8{padding-top:2rem;padding-bottom:2rem}
  .py-12{padding-top:3rem;padding-bottom:3rem}
  .mb-4{margin-bottom:1rem}
  .mb-6{margin-bottom:1.5rem}
  .mt-4{margin-top:1rem}
  
  /* Container */
  .max-w-6xl{max-width:72rem}
  .max-w-7xl{max-width:80rem}
  .mx-auto{margin-left:auto;margin-right:auto}
  .w-full{width:100%}
  
  /* Positioning */
  .relative{position:relative}
  .z-10{z-index:10}
  
  /* Text colors */
  .text-white\\/30{color:rgba(255,255,255,.3)}
  .text-white\\/40{color:rgba(255,255,255,.4)}
  .text-white\\/50{color:rgba(255,255,255,.5)}
  .text-white\\/60{color:rgba(255,255,255,.6)}
  .text-xs{font-size:.75rem;line-height:1rem}
  .text-sm{font-size:.875rem;line-height:1.25rem}
  .text-lg{font-size:1.125rem;line-height:1.75rem}
  .text-xl{font-size:1.25rem;line-height:1.75rem}
  .text-2xl{font-size:1.5rem;line-height:2rem}
  .text-3xl{font-size:1.875rem;line-height:2.25rem}
  
  /* Border */
  .border-b{border-bottom-width:1px}
  .border-white\\/10{border-color:rgba(255,255,255,.1)}
  
  /* Font display optimization */
  @font-face{font-family:'system-mono';font-display:swap;src:local('SF Mono'),local('Monaco'),local('Consolas'),local('Liberation Mono'),local('Courier New')}
`

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Critical inline CSS for instant LCP */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body className="antialiased min-h-screen">
        <SiteProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </SiteProvider>
      </body>
    </html>
  )
}
