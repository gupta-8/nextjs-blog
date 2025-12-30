'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to manage dynamic favicon based on profile logo
 */
export function useDynamicFavicon() {
  const [profile, setProfile] = useState(null)
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

  useEffect(() => {
    // Fetch profile to get logo
    fetch(`${API_URL}/api/profile`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setProfile(data)
        }
      })
      .catch(console.error)
  }, [API_URL])

  useEffect(() => {
    if (profile?.logo) {
      // Update favicon dynamically
      updateFavicon(profile.logo)
    }
  }, [profile?.logo])

  return profile
}

function updateFavicon(logoUrl) {
  if (typeof document === 'undefined') return

  // Remove existing favicon links
  const existingLinks = document.querySelectorAll('link[rel*="icon"]')
  existingLinks.forEach(link => link.remove())

  // Add new favicon
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = logoUrl
  document.head.appendChild(link)

  // Also update apple-touch-icon
  const appleLink = document.createElement('link')
  appleLink.rel = 'apple-touch-icon'
  appleLink.href = logoUrl
  document.head.appendChild(appleLink)
}

export default useDynamicFavicon
