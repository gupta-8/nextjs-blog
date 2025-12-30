import NotFoundPageClient from '@/components/pages/NotFoundPageClient'
export const dynamic = 'force-dynamic'

export const metadata = {
  title: '404 - Page Not Found ',
  description: 'The page you are looking for does not exist.',
}

export default function NotFound() {
  return <NotFoundPageClient />
}
