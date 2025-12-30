'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  // Try to get cached profile from localStorage for instant display
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('site_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          // Cache in localStorage for faster subsequent loads
          if (typeof window !== 'undefined') {
            localStorage.setItem('site_profile', JSON.stringify(data));
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [API_URL]);

  // Get site name with fallback
  const siteName = profile?.name || 'Admin';
  
  // Helper to generate page title
  const getPageTitle = (page) => {
    if (!page) return `${siteName}`;
    return `${page} | ${siteName}`;
  };

  return (
    <SiteContext.Provider value={{ profile, siteName, getPageTitle, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (!context) {
    // Return defaults if used outside provider
    return {
      profile: null,
      siteName: 'Admin',
      getPageTitle: (page) => page ? `${page} | Admin` : 'Admin',
      loading: false
    };
  }
  return context;
}
