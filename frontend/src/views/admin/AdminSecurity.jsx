'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import { Link } from '@/lib/router-compat';
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminSecurity() {
  const { token } = useAuth();
  const { siteName } = useSite();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    document.title = `Security | ${siteName}`;
  }, [siteName]);
  
  // Settings
  const [settings, setSettings] = useState({
    email_otp_enabled: false,
    totp_enabled: false,
    passkey_enabled: false,
    admin_email: ''
  });
  
  // SMTP Config
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_email: '',
    smtp_password: '',
    use_tls: true
  });
  
  // TOTP Setup
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [settingUpTotp, setSettingUpTotp] = useState(false);
  
  // Passkeys
  const [passkeys, setPasskeys] = useState([]);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [editingPasskey, setEditingPasskey] = useState(null);
  const [editPasskeyName, setEditPasskeyName] = useState('');
  
  // Passkey Config
  const [passkeyConfig, setPasskeyConfig] = useState({
    rp_id: '',
    rp_name: '',
    origin: ''
  });
  
  // Messages
  const [message, setMessage] = useState({ type: '', text: '' });

  // Password Change
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [settingsRes, smtpRes, passkeysRes, passkeyConfigRes] = await Promise.all([
        fetch(`${API_URL}/api/security/settings`, { headers }),
        fetch(`${API_URL}/api/security/smtp-config`, { headers }),
        fetch(`${API_URL}/api/security/passkey/list`, { headers }),
        fetch(`${API_URL}/api/security/passkey/config`, { headers })
      ]);
      
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
      
      if (smtpRes.ok) {
        const data = await smtpRes.json();
        if (data && Object.keys(data).length > 0) {
          setSmtpConfig(prev => ({ ...prev, ...data }));
        }
      }
      
      if (passkeysRes.ok) {
        const data = await passkeysRes.json();
        setPasskeys(data);
      }
      
      if (passkeyConfigRes.ok) {
        const data = await passkeyConfigRes.json();
        if (data && Object.keys(data).length > 0) {
          setPasskeyConfig(data);
        }
      }
    } catch (err) {
      console.error('Failed to load security settings:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Save security settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        showMessage('success', 'Security settings saved');
      } else {
        showMessage('error', 'Failed to save settings');
      }
    } catch (err) {
      showMessage('error', 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Save SMTP config
  const saveSmtpConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/smtp-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(smtpConfig)
      });
      
      if (res.ok) {
        showMessage('success', 'SMTP configuration saved');
      } else {
        showMessage('error', 'Failed to save SMTP config');
      }
    } catch (err) {
      showMessage('error', 'Error saving SMTP config');
    } finally {
      setSaving(false);
    }
  };

  // Test SMTP
  const testSmtp = async () => {
    setTestingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/security/smtp-test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (res.ok) {
        showMessage('success', data.message || 'Test email sent!');
      } else {
        showMessage('error', data.detail || 'Failed to send test email');
      }
    } catch (err) {
      showMessage('error', 'Error testing SMTP');
    } finally {
      setTestingEmail(false);
    }
  };

  // Setup TOTP
  const setupTotp = async () => {
    setSettingUpTotp(true);
    try {
      const res = await fetch(`${API_URL}/api/security/totp/setup`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTotpSetup(data);
      } else {
        showMessage('error', 'Failed to setup TOTP');
      }
    } catch (err) {
      showMessage('error', 'Error setting up TOTP');
    } finally {
      setSettingUpTotp(false);
    }
  };

  // Verify and enable TOTP
  const enableTotp = async () => {
    if (!totpCode || totpCode.length !== 6) {
      showMessage('error', 'Please enter a 6-digit code');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/totp/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ totp_code: totpCode })
      });
      
      if (res.ok) {
        showMessage('success', 'Authenticator app enabled!');
        setTotpSetup(null);
        setTotpCode('');
        setSettings(prev => ({ ...prev, totp_enabled: true }));
      } else {
        const data = await res.json();
        showMessage('error', data.detail || 'Invalid code');
      }
    } catch (err) {
      showMessage('error', 'Error enabling TOTP');
    } finally {
      setSaving(false);
    }
  };

  // Disable TOTP
  const disableTotp = async () => {
    if (!window.confirm('Are you sure you want to disable authenticator app?')) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/totp`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        showMessage('success', 'Authenticator app disabled');
        setSettings(prev => ({ ...prev, totp_enabled: false }));
      }
    } catch (err) {
      showMessage('error', 'Error disabling TOTP');
    } finally {
      setSaving(false);
    }
  };

  // Register Passkey
  const registerPasskey = async () => {
    if (!passkeyName.trim()) {
      showMessage('error', 'Please enter a name for the passkey');
      return;
    }
    
    setRegisteringPasskey(true);
    try {
      // Get registration options
      const optionsRes = await fetch(`${API_URL}/api/security/passkey/register-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!optionsRes.ok) {
        throw new Error('Failed to get registration options');
      }
      
      const options = await optionsRes.json();
      
      // Convert base64url to ArrayBuffer
      options.challenge = base64urlToBuffer(options.challenge);
      options.user.id = base64urlToBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: base64urlToBuffer(cred.id)
        }));
      }
      
      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: options
      });
      
      // Prepare response
      const credentialResponse = {
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        response: {
          clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64url(credential.response.attestationObject)
        },
        type: credential.type
      };
      
      // Send to server
      const registerRes = await fetch(`${API_URL}/api/security/passkey/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          credential: credentialResponse,
          name: passkeyName
        })
      });
      
      if (registerRes.ok) {
        showMessage('success', 'Passkey registered successfully!');
        setPasskeyName('');
        fetchData();
      } else {
        const data = await registerRes.json();
        showMessage('error', data.detail || 'Failed to register passkey');
      }
    } catch (err) {
      console.error('Passkey registration error:', err);
      if (err.name === 'NotAllowedError') {
        showMessage('error', 'Passkey registration was cancelled');
      } else {
        showMessage('error', `Error: ${err.message}`);
      }
    } finally {
      setRegisteringPasskey(false);
    }
  };

  // Delete Passkey
  const deletePasskey = async (id) => {
    if (!window.confirm('Are you sure you want to delete this passkey?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/security/passkey/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        showMessage('success', 'Passkey deleted');
        fetchData();
      }
    } catch (err) {
      showMessage('error', 'Error deleting passkey');
    }
  };

  // Update Passkey Name
  const updatePasskeyName = async (id) => {
    if (!editPasskeyName.trim()) {
      showMessage('error', 'Please enter a name');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/security/passkey/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editPasskeyName })
      });
      
      if (res.ok) {
        showMessage('success', 'Passkey name updated');
        setEditingPasskey(null);
        setEditPasskeyName('');
        fetchData();
      } else {
        const data = await res.json();
        showMessage('error', data.detail || 'Failed to update passkey');
      }
    } catch (err) {
      showMessage('error', 'Error updating passkey');
    }
  };

  // Start editing passkey
  const startEditingPasskey = (passkey) => {
    setEditingPasskey(passkey.id);
    setEditPasskeyName(passkey.name);
  };

  // Cancel editing passkey
  const cancelEditingPasskey = () => {
    setEditingPasskey(null);
    setEditPasskeyName('');
  };

  // Save passkey config
  const savePasskeyConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/security/passkey/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(passkeyConfig)
      });
      
      if (res.ok) {
        showMessage('success', 'Passkey configuration saved');
      }
    } catch (err) {
      showMessage('error', 'Error saving passkey config');
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const changePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      showMessage('error', 'Please fill in all password fields');
      return;
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 8) {
      showMessage('error', 'New password must be at least 8 characters');
      return;
    }
    
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/api/security/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      });
      
      if (res.ok) {
        showMessage('success', 'Password changed successfully!');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const data = await res.json();
        showMessage('error', data.detail || 'Failed to change password');
      }
    } catch (err) {
      showMessage('error', 'Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

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

  return (
    <div className="font-mono">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// security_settings.php</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            security<span className="text-[#a78bfa]">_settings</span>
          </h1>
          <p className="text-white/40 text-xs sm:text-sm">Manage authentication and security settings</p>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 border ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Admin Email */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <h2 className="text-white font-medium mb-4">
            <span className="text-white/30">// </span>admin_email
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">Email for OTP codes</label>
              <input
                type="email"
                value={settings.admin_email}
                onChange={(e) => setSettings(prev => ({ ...prev, admin_email: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="admin@example.com"
              />
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50"
            >
              {saving ? 'saving...' : 'save email'}
            </button>
          </div>
        </section>

        {/* Change Password */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <h2 className="text-white font-medium mb-4">
            <span className="text-white/30">// </span>change_password
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="••••••••"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/50 text-xs mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              onClick={changePassword}
              disabled={changingPassword}
              className="px-6 py-2 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50"
            >
              {changingPassword ? 'changing...' : 'change password'}
            </button>
          </div>
        </section>

        {/* SMTP Configuration */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <h2 className="text-white font-medium mb-4">
            <span className="text-white/30">// </span>smtp_config
            <span className="text-white/30 text-xs ml-2">(for Email OTP)</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">SMTP Host</label>
              <input
                type="text"
                value={smtpConfig.smtp_host}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="smtp.ultamail.com"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">SMTP Port</label>
              <input
                type="number"
                value={smtpConfig.smtp_port}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">Email Address</label>
              <input
                type="email"
                value={smtpConfig.smtp_email}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_email: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">Password</label>
              <input
                type="password"
                value={smtpConfig.smtp_password}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, smtp_password: e.target.value }))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={smtpConfig.use_tls}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, use_tls: e.target.checked }))}
                className="w-4 h-4 accent-[#a78bfa]"
              />
              Use TLS
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={saveSmtpConfig}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50"
            >
              {saving ? 'saving...' : 'save smtp'}
            </button>
            <button
              onClick={testSmtp}
              disabled={testingEmail}
              className="w-full sm:w-auto px-6 py-2 border border-white/20 text-white/70 text-sm hover:border-[#a78bfa]/50 hover:text-[#a78bfa] disabled:opacity-50"
            >
              {testingEmail ? 'sending...' : 'test email'}
            </button>
          </div>
        </section>

        {/* Email OTP */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-medium">
                <span className="text-white/30">// </span>email_otp
              </h2>
              <p className="text-white/40 text-xs mt-1">6-digit code sent to your email on login</p>
            </div>
            {settings.email_otp_enabled && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400">ENABLED</span>
            )}
          </div>
          
          <button
            onClick={async () => {
              const newValue = !settings.email_otp_enabled;
              setSettings(prev => ({ ...prev, email_otp_enabled: newValue }));
              setSaving(true);
              try {
                await fetch(`${API_URL}/api/security/settings`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ ...settings, email_otp_enabled: newValue })
                });
                showMessage('success', newValue ? 'Email OTP enabled' : 'Email OTP disabled');
              } catch (err) {
                showMessage('error', 'Failed to save');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            className={`px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              settings.email_otp_enabled 
                ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10' 
                : 'bg-[#a78bfa] text-black hover:bg-[#c4b5fd]'
            }`}
          >
            {saving ? 'saving...' : settings.email_otp_enabled ? 'disable otp' : 'enable otp'}
          </button>
          
          {settings.email_otp_enabled && (
            <p className="mt-3 text-white/30 text-xs">// Make sure SMTP is configured above</p>
          )}
        </section>

        {/* TOTP (Authenticator App) */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-medium">
                <span className="text-white/30">// </span>authenticator_app
              </h2>
              <p className="text-white/40 text-xs mt-1">Google Authenticator, Authy, etc.</p>
            </div>
            {settings.totp_enabled && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400">ENABLED</span>
            )}
          </div>
          
          {!settings.totp_enabled && !totpSetup && (
            <button
              onClick={setupTotp}
              disabled={settingUpTotp}
              className="px-6 py-2 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50"
            >
              {settingUpTotp ? 'setting up...' : 'setup totp'}
            </button>
          )}
          
          {totpSetup && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="bg-white p-2 rounded">
                  <img src={totpSetup.qr_code} alt="TOTP QR Code" className="w-48 h-48" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-sm mb-4">
                    Scan the QR code or enter the key manually:
                  </p>
                  
                  {/* Manual Entry Key with Copy */}
                  <div className="bg-white/5 p-4 border border-white/10 mb-4">
                    <p className="text-white/40 text-xs mb-2">// setup_key (for manual entry)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[#a78bfa] text-sm sm:text-base font-mono tracking-wider break-all flex-1">
                        {totpSetup.secret}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(totpSetup.secret);
                          showMessage('success', 'Key copied to clipboard');
                        }}
                        className="px-3 py-1.5 bg-white/10 text-white/60 text-xs hover:bg-white/20 hover:text-white shrink-0"
                        title="Copy key"
                      >
                        copy
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-white/50 text-xs mb-2">verification_code =</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-32 px-4 py-3 bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest focus:outline-none focus:border-[#a78bfa]/50"
                        placeholder="000000"
                        maxLength={6}
                      />
                      <button
                        onClick={enableTotp}
                        disabled={saving || totpCode.length !== 6}
                        className="px-6 py-2 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50"
                      >
                        {saving ? 'verifying...' : 'enable totp'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTotpSetup(null)}
                className="text-white/50 text-sm hover:text-white"
              >
                ← cancel
              </button>
            </div>
          )}
          
          {settings.totp_enabled && !totpSetup && (
            <div className="mt-4">
              <button
                onClick={disableTotp}
                disabled={saving}
                className="px-6 py-2 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 disabled:opacity-50"
              >
                disable totp
              </button>
            </div>
          )}
        </section>

        {/* Passkeys */}
        <section className="mb-6 border border-white/10 p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-white font-medium">
              <span className="text-white/30">// </span>passkeys
            </h2>
            <p className="text-white/40 text-xs mt-1">Biometric login (Face ID, Touch ID, Windows Hello)</p>
          </div>
          
          {/* Registered Passkeys */}
          {passkeys.length > 0 && (
            <div className="mb-6">
              <p className="text-white/50 text-xs mb-3">Registered passkeys:</p>
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <div key={passkey.id} className="p-3 bg-white/5 border border-white/10">
                    {editingPasskey === passkey.id ? (
                      // Edit Mode
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={editPasskeyName}
                          onChange={(e) => setEditPasskeyName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                          placeholder="Passkey name"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updatePasskeyName(passkey.id)}
                            className="px-3 py-2 bg-[#a78bfa] text-black text-xs font-medium hover:bg-[#c4b5fd]"
                          >
                            save
                          </button>
                          <button
                            onClick={cancelEditingPasskey}
                            className="px-3 py-2 border border-white/20 text-white/60 text-xs hover:border-white/40"
                          >
                            cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm">{passkey.name}</p>
                          <p className="text-white/40 text-[10px]">
                            Created: {new Date(passkey.created_at).toLocaleDateString()}
                            {passkey.last_used && ` • Last used: ${new Date(passkey.last_used).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => startEditingPasskey(passkey)}
                            className="text-[#a78bfa] text-xs hover:text-[#c4b5fd]"
                          >
                            edit
                          </button>
                          <button
                            onClick={() => deletePasskey(passkey.id)}
                            className="text-red-400 text-xs hover:text-red-300"
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Register New Passkey */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#a78bfa]/50"
              placeholder="Passkey name (e.g., MacBook Pro)"
            />
            <button
              onClick={registerPasskey}
              disabled={registeringPasskey || !passkeyName.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] disabled:opacity-50 whitespace-nowrap"
            >
              {registeringPasskey ? 'registering...' : 'add_passkey'}
            </button>
          </div>
        </section>

        {/* Security Summary */}
        <section className="border border-white/10 p-6 bg-white/[0.02]">
          <h2 className="text-white font-medium mb-4">
            <span className="text-white/30">// </span>security_status
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className={`p-4 border ${settings.email_otp_enabled ? 'border-green-500/30 bg-green-500/10' : 'border-white/10'}`}>
              <p className="text-[10px] text-white/40 mb-1">Email OTP</p>
              <p className={settings.email_otp_enabled ? 'text-green-400' : 'text-white/50'}>
                {settings.email_otp_enabled ? '✓ Enabled' : '○ Disabled'}
              </p>
            </div>
            <div className={`p-4 border ${settings.totp_enabled ? 'border-green-500/30 bg-green-500/10' : 'border-white/10'}`}>
              <p className="text-[10px] text-white/40 mb-1">Authenticator</p>
              <p className={settings.totp_enabled ? 'text-green-400' : 'text-white/50'}>
                {settings.totp_enabled ? '✓ Enabled' : '○ Disabled'}
              </p>
            </div>
            <div className={`p-4 border ${passkeys.length > 0 ? 'border-green-500/30 bg-green-500/10' : 'border-white/10'}`}>
              <p className="text-[10px] text-white/40 mb-1">Passkeys</p>
              <p className={passkeys.length > 0 ? 'text-green-400' : 'text-white/50'}>
                {passkeys.length > 0 ? `✓ ${passkeys.length} registered` : '○ None'}
              </p>
            </div>
          </div>
        </section>
      </div>
  );
}
