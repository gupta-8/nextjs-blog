import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSite } from '@/contexts/SiteContext';
import ConfirmationModal from '../../components/ConfirmationModal';
export default function AdminProfile() {
  const { token } = useAuth();
  const { siteName } = useSite();
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    bio: '',
    location: '',
    timezone: '',
    philosophy: '',
    motto: '',
    email: '',
    phone: '',
    logo: '',
    social: { github: '', linkedin: '', twitter: '', dribbble: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragging, setLogoDragging] = useState(false);
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    document.title = `Profile | ${siteName}`;
  }, [siteName]);

  useEffect(() => {
    fetch(`${API_URL}/api/profile`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setProfile(prev => ({ ...prev, ...data }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profile)
      });

      if (res.ok) {
        setMessage('// Success: Profile updated!');
      } else {
        setMessage('// Error: Failed to update profile');
      }
    } catch (err) {
      setMessage('// Error: Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // Handle logo upload
  const handleLogoUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('// Error: Invalid file type. Use PNG, JPEG, GIF, WebP, or SVG');
      return;
    }

    // Validate file size (max 2MB for logo)
    if (file.size > 2 * 1024 * 1024) {
      setMessage('// Error: File too large. Max 2MB for logo');
      return;
    }

    // Check if image is square (512x512 recommended)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      
      // Allow some tolerance for square check
      if (Math.abs(img.width - img.height) > 10) {
        setMessage('// Error: Logo must be square (512x512 recommended)');
        return;
      }

      setLogoUploading(true);
      setMessage('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const logoUrl = data.url.startsWith('http') ? data.url : `${API_URL}${data.url}`;
        setProfile(prev => ({ ...prev, logo: logoUrl }));
        setMessage('// Success: Logo uploaded! Click Save to apply.');
      } catch (error) {
        console.error('Logo upload error:', error);
        setMessage('// Error: Failed to upload logo');
      } finally {
        setLogoUploading(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setMessage('// Error: Invalid image file');
    };

    img.src = objectUrl;
  }, [API_URL, token]);

  const handleLogoDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragging(true);
  }, []);

  const handleLogoDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragging(false);
  }, []);

  const handleLogoDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleLogoUpload(files[0]);
    }
  }, [handleLogoUpload]);

  const handleLogoFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);

  const removeLogo = useCallback(() => {
    setProfile(prev => ({ ...prev, logo: '' }));
    setShowDeleteLogoConfirm(false);
    setMessage('// Logo removed. Click Save to apply.');
  }, []);

  return (
    <div className="font-mono">
      <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// profile.php</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
        profile<span className="text-[#a78bfa]">_settings</span>
      </h1>

      {/* Success/Error Message - Now at TOP */}
      {message && (
        <div className={`mb-6 p-4 border ${
          message.includes('Success') 
            ? 'border-green-500/30 bg-green-500/10 text-green-400' 
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          <div className="flex items-center gap-3">
            {message.includes('Success') ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm">{message}</span>
            <button 
              type="button" 
              onClick={() => setMessage('')}
              className="ml-auto text-white/50 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site Logo - Redesigned */}
        <div className="border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="p-4 sm:p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#a78bfa] text-xs tracking-[0.2em] uppercase">// site_logo</p>
                <p className="text-white/40 text-[11px] mt-1">Favicon & logo sitewide</p>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 bg-[#a78bfa]/10 border border-[#a78bfa]/20 rounded">
                <span className="text-[#a78bfa] text-[10px]">512×512</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6">
            {profile.logo ? (
              /* Logo Preview Mode */
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                {/* Logo Display */}
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-white/10 bg-[#0a0a0a] rounded-lg overflow-hidden shadow-lg">
                    <img 
                      src={profile.logo} 
                      alt="Site Logo" 
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  {/* Active indicator */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>

                {/* Logo Info & Actions */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-white text-sm font-medium mb-1">Logo Active</p>
                  <p className="text-white/40 text-xs mb-4 break-all max-w-xs">{profile.logo.length > 50 ? profile.logo.substring(0, 50) + '...' : profile.logo}</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Change Logo */}
                    <label className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-center">
                      {logoUploading ? 'Uploading...' : 'Change Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                        disabled={logoUploading}
                      />
                    </label>
                    
                    {/* Delete Logo */}
                    <button
                      type="button"
                      onClick={() => setShowDeleteLogoConfirm(true)}
                      className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                    >
                      Delete Logo
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Upload Mode */
              <div className="flex flex-col items-center">
                <label
                  className={`w-full max-w-xs aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    logoDragging 
                      ? 'border-[#a78bfa] bg-[#a78bfa]/10 scale-105' 
                      : 'border-white/20 hover:border-[#a78bfa]/50 hover:bg-white/[0.02]'
                  }`}
                  onDragOver={handleLogoDragOver}
                  onDragLeave={handleLogoDragLeave}
                  onDrop={handleLogoDrop}
                >
                  {logoUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-3 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
                      <span className="text-white/50 text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        logoDragging ? 'bg-[#a78bfa]/20' : 'bg-white/5'
                      }`}>
                        <svg className={`w-8 h-8 ${logoDragging ? 'text-[#a78bfa]' : 'text-white/40'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-medium ${logoDragging ? 'text-[#a78bfa]' : 'text-white/70'}`}>
                          {logoDragging ? 'Drop to upload' : 'Drag & drop logo'}
                        </p>
                        <p className="text-white/30 text-xs mt-1">or click to browse</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-white/20 text-[10px]">PNG, JPG, SVG</span>
                        <span className="text-white/10">•</span>
                        <span className="text-white/20 text-[10px]">Max 2MB</span>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    disabled={logoUploading}
                  />
                </label>
                
                {/* URL Input */}
                <div className="w-full max-w-xs mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-white/30 text-[10px] uppercase tracking-wider">or paste URL</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 placeholder:text-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (logoUrlInput.trim()) {
                          setProfile({ ...profile, logo: logoUrlInput.trim() });
                          setMessage('// Success: Logo URL set! Click Save to apply.');
                        }
                      }}
                      disabled={!logoUrlInput.trim()}
                      className="px-4 py-3 bg-[#a78bfa] text-black text-sm font-medium rounded hover:bg-[#a78bfa]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Delete Logo Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteLogoConfirm}
          onClose={() => setShowDeleteLogoConfirm(false)}
          onConfirm={removeLogo}
          variant="danger"
          label="delete_logo"
          title="Delete Logo?"
          description="Your logo will be removed from the admin panel, footer, and favicon. This action requires saving to take effect."
        />

        {/* Basic Info */}
        <div className="border border-white/10 p-4 sm:p-6">
          <p className="text-xs text-white/30 mb-4">// basic_info</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">name =</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">role =</label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                placeholder="Role"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 placeholder:text-white/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/50 text-xs mb-2">bio =</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
                placeholder="Bio"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50 resize-none placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">location =</label>
              <input
                type="text"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/50 text-xs mb-2">philosophy =</label>
              <input
                type="text"
                value={profile.philosophy}
                onChange={(e) => setProfile({ ...profile, philosophy: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-white/50 text-xs mb-2">motto =</label>
              <input
                type="text"
                value={profile.motto}
                onChange={(e) => setProfile({ ...profile, motto: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="border border-white/10 p-4 sm:p-6">
          <p className="text-xs text-white/30 mb-4">// contact_info</p>
          <div>
            <label className="block text-white/50 text-xs mb-2">email =</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="border border-white/10 p-4 sm:p-6">
          <p className="text-xs text-white/30 mb-4">// social_links</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">github =</label>
              <input
                type="url"
                value={profile.social?.github || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, github: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://github.com/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">linkedin =</label>
              <input
                type="url"
                value={profile.social?.linkedin || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, linkedin: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://linkedin.com/in/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">twitter =</label>
              <input
                type="url"
                value={profile.social?.twitter || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, twitter: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://twitter.com/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">instagram =</label>
              <input
                type="url"
                value={profile.social?.instagram || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, instagram: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://instagram.com/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">youtube =</label>
              <input
                type="url"
                value={profile.social?.youtube || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, youtube: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://youtube.com/@...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">dribbble =</label>
              <input
                type="url"
                value={profile.social?.dribbble || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, dribbble: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://dribbble.com/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">behance =</label>
              <input
                type="url"
                value={profile.social?.behance || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, behance: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://behance.net/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">codepen =</label>
              <input
                type="url"
                value={profile.social?.codepen || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, codepen: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://codepen.io/...'"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-2">website =</label>
              <input
                type="url"
                value={profile.social?.website || ''}
                onChange={(e) => setProfile({ ...profile, social: { ...profile.social, website: e.target.value } })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#a78bfa]/50"
                placeholder="'https://yourwebsite.com'"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
        >
          {saving ? 'saving...' : 'save changes'}
        </button>
      </form>
    </div>
  );
}
