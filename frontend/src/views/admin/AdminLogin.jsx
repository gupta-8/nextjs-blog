'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { useNavigate, Link } from '@/lib/router-compat';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const { loginWithToken, isAuthenticated } = useAuth();
  const { siteName } = useSite();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Login | ${siteName}`;
  }, [siteName]);

  // Check if setup is required (no admin exists)
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/setup-status`);
        const data = await res.json();
        
        if (data.setup_required) {
          // Redirect to setup page
          navigate('/setup', { replace: true });
          return;
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
      } finally {
        setCheckingSetup(false);
      }
    };
    
    checkSetupStatus();
  }, [navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Login method: 'select', 'password', 'passkey', 'totp'
  const [loginMethod, setLoginMethod] = useState('select');

  // Show loading while checking setup status
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper functions for WebAuthn
  function base64urlToBuffer(base64url) {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Check if TOTP is required
      if (data.requires_totp) {
        setLoginMethod('totp');
        setError('');
        return;
      }

      // No TOTP required, login directly
      await loginWithToken(data.access_token, data.refresh_token, data.last_login, data.last_login_ip);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // TOTP Verification
  const handleTotpLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login/totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totp_code: totpCode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Invalid code');
      }

      await loginWithToken(data.access_token, data.refresh_token, data.last_login, data.last_login_ip);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Passkey Login (usernameless)
  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get authentication options (no email needed)
      const optionsRes = await fetch(`${API_URL}/api/security/passkey/authenticate-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.detail || 'Failed to get passkey options');
      }
      
      const options = await optionsRes.json();
      const sessionId = options.session_id;
      
      // Convert base64url to ArrayBuffer
      options.challenge = base64urlToBuffer(options.challenge);
      
      // Get credential from browser (browser will show available passkeys)
      const credential = await navigator.credentials.get({
        publicKey: options
      });
      
      // Prepare response
      const credentialResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        response: {
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          authenticatorData: bufferToBase64url(credential.response.authenticatorData),
          signature: bufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle 
            ? bufferToBase64url(credential.response.userHandle) 
            : null
        },
        type: credential.type
      };
      
      // Verify with server
      const authRes = await fetch(`${API_URL}/api/security/passkey/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialResponse,
          session_id: sessionId
        })
      });
      
      if (authRes.ok) {
        const data = await authRes.json();
        await loginWithToken(data.access_token, data.refresh_token, data.last_login, data.last_login_ip);
        navigate('/admin/dashboard');
      } else {
        const data = await authRes.json();
        setError(data.detail || 'Passkey authentication failed');
      }
    } catch (err) {
      console.error('Passkey auth error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError(err.message || 'Passkey authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Render method selection
  const renderMethodSelect = () => (
    <div className="space-y-4">
      <p className="text-white/50 text-sm text-center mb-6">Choose how you want to sign in</p>
      
      <button
        key="select-password-btn"
        onClick={() => setLoginMethod('password')}
        className="w-full py-4 border border-white/20 text-white/80 text-sm hover:border-[#a78bfa]/50 hover:text-[#a78bfa] flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        email + password
      </button>
      
      <button
        key="select-passkey-btn"
        onClick={() => setLoginMethod('passkey')}
        className="w-full py-4 border border-white/20 text-white/80 text-sm hover:border-[#a78bfa]/50 hover:text-[#a78bfa] flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
        passkey
      </button>
    </div>
  );

  // Render password login form
  const renderPasswordLogin = () => (
    <form onSubmit={handlePasswordLogin} className="space-y-5">
      <div>
        <label className="block text-white/50 text-xs mb-2">email =</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors"
          placeholder="'email@example.com'"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-white/50 text-xs mb-2">password =</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors"
            placeholder="'••••••••'"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
      >
        {loading ? 'authenticating...' : 'login'}
      </button>

      <button
        type="button"
        onClick={() => { setLoginMethod('select'); setError(''); }}
        className="w-full text-white/40 text-xs hover:text-white/60"
      >
        ← back
      </button>
    </form>
  );

  // Render TOTP verification form
  const renderTotpLogin = () => (
    <form onSubmit={handleTotpLogin} className="space-y-5">
      <div className="text-center py-2">
        <div className="w-12 h-12 mx-auto mb-3 border border-[#a78bfa]/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/50 text-sm">Enter the 6-digit code from your authenticator app</p>
      </div>

      <div>
        <label className="block text-white/50 text-xs mb-2">totp_code =</label>
        <input
          type="text"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white text-2xl text-center tracking-[0.5em] placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors font-mono"
          placeholder="000000"
          maxLength={6}
          required
          autoFocus
        />
      </div>

      <button
        type="submit"
        disabled={loading || totpCode.length !== 6}
        className="w-full py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
      >
        {loading ? 'verifying...' : 'verify'}
      </button>

      <button
        type="button"
        onClick={() => { 
          setLoginMethod('password'); 
          setTotpCode('');
          setError(''); 
        }}
        className="w-full text-white/40 text-xs hover:text-white/60"
      >
        ← back
      </button>
    </form>
  );

  // Render passkey login form (no email needed)
  const renderPasskeyLogin = () => (
    <div className="space-y-5">
      <div className="text-center py-4">
        <div className="w-16 h-16 mx-auto mb-4 border border-[#a78bfa]/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#a78bfa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
          </svg>
        </div>
        <p className="text-white/50 text-sm">
          Click below to sign in with your passkey
        </p>
        <p className="text-white/30 text-[10px] mt-1">
          // Your device will show available passkeys
        </p>
      </div>

      <button
        key="passkey-submit-btn"
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="w-full py-4 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
        {loading ? 'authenticating...' : 'use passkey'}
      </button>

      <button
        key="passkey-back-btn"
        type="button"
        onClick={() => { setLoginMethod('select'); setError(''); }}
        className="w-full text-white/40 text-xs hover:text-white/60"
        style={{ 
          border: 'none', 
          borderWidth: '0', 
          background: 'transparent',
          transition: 'none',
          outline: 'none'
        }}
      >
        ← back
      </button>
    </div>
  );

  // Render based on login method
  const renderContent = () => {
    switch (loginMethod) {
      case 'password':
        return <div key="password-form">{renderPasswordLogin()}</div>;
      case 'totp':
        return <div key="totp-form">{renderTotpLogin()}</div>;
      case 'passkey':
        return <div key="passkey-form">{renderPasskeyLogin()}</div>;
      default:
        return <div key="select-form">{renderMethodSelect()}</div>;
    }
  };

  // Get title based on method
  const getTitle = () => {
    switch (loginMethod) {
      case 'password':
        return { file: 'password_auth.php', method: 'password' };
      case 'totp':
        return { file: 'totp_verify.php', method: 'verify_2fa' };
      case 'passkey':
        return { file: 'passkey_auth.php', method: 'passkey' };
      default:
        return { file: 'admin_panel.php', method: 'login' };
    }
  };

  const title = getTitle();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 font-mono">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-4">// {title.file}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            admin<span className="text-[#a78bfa]">_</span><span className="text-[#a78bfa]">{title.method}</span>
          </h1>
          <p className="text-white/50 text-sm">
            {loginMethod === 'totp' 
              ? '// Two-factor authentication required' 
              : '// Sign in to manage your portfolio'
            }
          </p>
          <Link to="/" className="inline-flex items-center gap-1 mt-3 text-[#a78bfa]/70 text-xs hover:text-[#a78bfa] transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            back to site
          </Link>
        </div>

        {/* Login Form */}
        <div className="border border-white/10 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-white/30">// auth_form</p>
            <div className="flex gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${loginMethod === 'select' ? 'bg-[#a78bfa]' : 'bg-white/20'}`}></span>
              <span className={`w-2.5 h-2.5 rounded-full ${loginMethod === 'password' || loginMethod === 'passkey' ? 'bg-[#a78bfa]' : 'bg-white/20'}`}></span>
              <span className={`w-2.5 h-2.5 rounded-full ${loginMethod === 'totp' ? 'bg-[#a78bfa]' : 'bg-white/20'}`}></span>
            </div>
          </div>

          {error && (
            <div className="border border-red-500/30 px-4 py-3 text-red-400 text-sm mb-5">
              <span className="text-red-500/50">// Error: </span>{error}
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
