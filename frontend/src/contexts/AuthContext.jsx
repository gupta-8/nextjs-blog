'use client'
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AuthContext = createContext(null);

// Token refresh interval (3 hours - before 4 hour expiry)
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const refreshIntervalRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Refresh access token using refresh token
  const refreshAccessToken = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) {
        // Refresh token expired, logout
        localStorage.removeItem('admin_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
        return null;
      }

      const data = await res.json();
      localStorage.setItem('admin_token', data.access_token);
      setToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }, [API_URL]);

  // Setup token refresh interval
  const setupTokenRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    refreshIntervalRef.current = setInterval(refreshAccessToken, TOKEN_REFRESH_INTERVAL);
  }, [refreshAccessToken]);

  // Initialize and verify token on mount - single effect to avoid race conditions
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAuth = async () => {
      const storedToken = typeof window !== 'undefined' 
        ? (localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token'))
        : null;
      
      if (storedToken) {
        try {
          // Verify token and get user info
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (!res.ok) {
            // Try to refresh token
            const newToken = await refreshAccessToken();
            if (newToken) {
              const retryRes = await fetch(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${newToken}` }
              });
              if (retryRes.ok) {
                const userData = await retryRes.json();
                setToken(newToken);
                setUser(userData);
                setupTokenRefresh();
                setLoading(false);
                return;
              }
            }
            throw new Error('Invalid token');
          }
          
          const userData = await res.json();
          setToken(storedToken);
          setUser(userData);
          setupTokenRefresh();
        } catch (error) {
          // Token invalid, clear it from both storages
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('refresh_token');
            sessionStorage.removeItem('admin_token');
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [API_URL, refreshAccessToken, setupTokenRefresh]);

  const login = async (email, password, rememberMe = false) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await res.json();
    
    // Always use localStorage to persist login across browser sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      if (data.last_login) {
        localStorage.setItem('last_login', data.last_login);
      }
      if (data.last_login_ip) {
        localStorage.setItem('last_login_ip', data.last_login_ip);
      }
      sessionStorage.removeItem('admin_token');
    }
    
    setToken(data.access_token);

    // Get user info
    const userRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    const userData = await userRes.json();
    
    if (!userData.is_admin) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_token');
      }
      setToken(null);
      throw new Error('Admin access required');
    }
    
    setUser(userData);
    setupTokenRefresh();
    return userData;
  };

  const loginWithToken = async (accessToken, refreshToken = null, lastLogin = null, lastLoginIp = null, rememberMe = false) => {
    // Always use localStorage to persist login across browser sessions
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
      if (lastLogin) {
        localStorage.setItem('last_login', lastLogin);
      }
      if (lastLoginIp) {
        localStorage.setItem('last_login_ip', lastLoginIp);
      }
      sessionStorage.removeItem('admin_token');
    }
    
    setToken(accessToken);

    // Get user info
    const userRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData = await userRes.json();
    
    if (!userData.is_admin) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('admin_token');
      }
      setToken(null);
      throw new Error('Admin access required');
    }
    
    setUser(userData);
    setupTokenRefresh();
    return userData;
  };

  const logout = () => {
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('admin_token');
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithToken, logout, isAuthenticated: !!user, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
