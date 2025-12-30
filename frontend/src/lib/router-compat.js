'use client'

// Compatibility layer for react-router-dom -> Next.js
import { useRouter as useNextRouter, usePathname, useSearchParams } from 'next/navigation'
import NextLink from 'next/link'
import { forwardRef, useEffect } from 'react'

// Link component compatible with react-router-dom
export const Link = forwardRef(function Link({ to, href, children, className, onClick, ...props }, ref) {
  const linkHref = to || href || '/'
  return (
    <NextLink href={linkHref} className={className} onClick={onClick} ref={ref} {...props}>
      {children}
    </NextLink>
  )
})

// useNavigate hook
export function useNavigate() {
  const router = useNextRouter()
  return (path, options = {}) => {
    if (options.replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }
}

// useLocation hook
export function useLocation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  return {
    pathname: pathname || '/',
    search: searchParams?.toString() ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
    state: null,
  }
}

// useParams hook - returns empty, params should be passed as props in Next.js
export function useParams() {
  // In Next.js, params are passed as props, not via hook
  // This is a placeholder - actual params come from page props
  return {}
}

// Navigate component for declarative navigation
export function Navigate({ to, replace = false }) {
  const router = useNextRouter()
  
  useEffect(() => {
    if (replace) {
      router.replace(to)
    } else {
      router.push(to)
    }
  }, [to, replace, router])
  
  return null
}

// Outlet component - not needed in Next.js app router
export function Outlet() {
  return null
}

// Wrapper for useSearchParams to match react-router-dom API
export function useSearchParamsCompat() {
  const searchParams = useSearchParams()
  // Create a fallback object with get method if searchParams is null
  const safeSearchParams = searchParams || {
    get: () => null,
    has: () => false,
    getAll: () => [],
    keys: () => [],
    values: () => [],
    entries: () => [],
    forEach: () => {},
    toString: () => '',
  }
  // Return as array like react-router-dom: [searchParams, setSearchParams]
  // setSearchParams is a no-op since we don't have it in Next.js client components
  return [safeSearchParams, () => {}]
}

// Re-export for convenience
export { usePathname }
export { useSearchParamsCompat as useSearchParams }
export { useNextRouter as useRouter }
