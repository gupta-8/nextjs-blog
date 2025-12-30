'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import NextLink from 'next/link'

// Next.js compatible Link component that mimics react-router-dom's Link
export function Link({ to, href, children, className, ...props }) {
  const linkHref = to || href || '/'
  return (
    <NextLink href={linkHref} className={className} {...props}>
      {children}
    </NextLink>
  )
}

// Hook to mimic react-router-dom's useNavigate
export function useNavigate() {
  const router = useRouter()
  return (path, options) => {
    if (options?.replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }
}

// Hook to mimic react-router-dom's useParams
export function useParams() {
  // This will be passed as props in Next.js
  return {}
}

// Hook to mimic react-router-dom's useLocation
export function useLocation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return {
    pathname,
    search: searchParams.toString() ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  }
}

// Navigate component for declarative navigation
export function Navigate({ to, replace = false }) {
  const router = useRouter()
  
  if (typeof window !== 'undefined') {
    if (replace) {
      router.replace(to)
    } else {
      router.push(to)
    }
  }
  
  return null
}

export { useRouter, usePathname, useSearchParams }
