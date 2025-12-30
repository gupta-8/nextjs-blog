'use client'
import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import Footer from '../components/Footer';
import { useSite } from '@/contexts/SiteContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ContactPage({ initialData }) {
  // Use SSR data if available
  const hasSSRData = initialData && initialData.profile;
  
  const [profile, setProfile] = useState(hasSSRData ? initialData.profile : null);
  const [content, setContent] = useState(hasSSRData ? (initialData.content || {}) : {});
  const [loading, setLoading] = useState(!hasSSRData);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Get dynamic site name
  const { siteName } = useSite();

  useEffect(() => {
    document.title = `Contact | ${siteName}`;
  }, [siteName]);

  // Only fetch on client if no SSR data
  useEffect(() => {
    if (hasSSRData) return;
    
    const fetchData = async () => {
      try {
        const [profileRes, contentRes] = await Promise.all([
          fetch(`${API_URL}/api/profile`),
          fetch(`${API_URL}/api/content/contact`)
        ]);
        const profileData = await profileRes.json();
        const contentData = await contentRes.json();
        setProfile(profileData);
        setContent(contentData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hasSSRData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Validate email with TLD
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (value && !emailRegex.test(value)) {
        setEmailError('Please enter a valid email (e.g., name@example.com)');
      } else {
        setEmailError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email before submit
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError('Please enter a valid email (e.g., name@example.com)');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const encode = (data) => {
        return Object.keys(data)
          .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
          .join('&');
      };

      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode({
          'form-name': 'contact',
          ...formData
        })
      });
      
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-[#a78bfa]">loading_</span>
        <span className="animate-pulse">|</span>
      </div>
    );
  }

  const name = profile?.name || siteName;
  const firstName = name.split(' ')[0].toLowerCase();
  const contactHeading = content.contact_heading || "Let's work together";
  const contactDescription = content.contact_description || "Have a project in mind? Let's discuss how we can work together.";
  const contactEmail = content.contact_email || profile?.email || 'hello@example.com';
  const contactPhone = content.contact_phone || profile?.phone || '+91 98765 43210';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black">
      
      {/* Hero Section */}
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// contact.php</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            
            <span className="text-white">message</span>
            <span className="text-white/30"> = new </span>
            <span className="text-[#a78bfa]">Contact</span>
            
          </h1>
          <p className="text-white/50 text-sm max-w-xl">
            // {contactDescription}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-8">
            
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-white/10 p-6">
                <p className="text-xs text-white/30 mb-4">// contact_info</p>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-[#a78bfa]">'email'</span>
                    <span className="text-white/30">{' => '}</span>
                    <a href={`mailto:${contactEmail}`} className="text-white hover:text-[#a78bfa]">
                      "{contactEmail}"</a>
                  </div>
                  <div>
                    <span className="text-[#a78bfa]">'location'</span>
                    <span className="text-white/30">{' => '}</span>
                    <span className="text-white">"{profile?.location || 'Location'}"</span>
                  </div>
                </div>
              </div>
              
              {/* Social */}
              {(profile?.social?.github || profile?.social?.linkedin || profile?.social?.twitter || 
                profile?.social?.instagram || profile?.social?.youtube || profile?.social?.dribbble || 
                profile?.social?.behance || profile?.social?.codepen || profile?.social?.website) && (
                <div className="border border-white/10 p-6">
                  <p className="text-xs text-white/30 mb-4">// social_links</p>
                  <div className="flex flex-wrap gap-3">
                    {profile?.social?.github && (
                      <a href={profile.social.github} target="_blank" rel="noopener noreferrer" 
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="GitHub">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.linkedin && (
                      <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="LinkedIn">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.twitter && (
                      <a href={profile.social.twitter} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="Twitter/X">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.instagram && (
                      <a href={profile.social.instagram} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="Instagram">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.youtube && (
                      <a href={profile.social.youtube} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="YouTube">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.dribbble && (
                      <a href={profile.social.dribbble} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="Dribbble">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.behance && (
                      <a href={profile.social.behance} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="Behance">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.665 1.45.665 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.48.348-1.05.6-1.67.767-.61.165-1.252.254-1.91.254H0V4.51h6.938v-.007zM6.545 9.66c.565 0 1.04-.128 1.425-.39.385-.263.58-.696.58-1.3 0-.32-.06-.593-.17-.812-.116-.222-.273-.4-.465-.52-.196-.12-.42-.205-.68-.26-.26-.054-.54-.08-.84-.08H3.79v3.36h2.755v.002zm.185 5.55c.34 0 .658-.034.958-.105.302-.07.568-.18.8-.336.233-.16.42-.37.558-.65.14-.277.205-.622.205-1.03 0-.815-.25-1.397-.75-1.75-.5-.355-1.15-.53-1.95-.53H3.79v4.4h2.94v.001zm6.568-1.78c.205.494.538.873.993 1.13.458.257.986.39 1.593.39.456 0 .875-.095 1.26-.286.38-.19.646-.46.79-.81h2.62c-.43 1.24-1.103 2.14-2.02 2.71-.92.567-2 .85-3.26.85-.89 0-1.69-.145-2.4-.433-.71-.29-1.32-.7-1.81-1.23-.5-.527-.88-1.16-1.14-1.9-.27-.738-.4-1.54-.4-2.41 0-.83.14-1.6.41-2.32.28-.72.67-1.34 1.17-1.87.5-.53 1.1-.94 1.8-1.24.7-.3 1.47-.45 2.3-.45.9 0 1.69.17 2.39.51.7.34 1.28.81 1.74 1.42.46.61.8 1.33 1.02 2.14.22.82.3 1.72.24 2.71H15c0-.31-.04-.62-.1-.9-.07-.29-.17-.55-.32-.77-.14-.21-.33-.38-.56-.52-.23-.13-.52-.2-.87-.2-.57 0-1.04.2-1.4.58-.36.39-.58.95-.65 1.68h4.04v.01h.015l-.003-.01zM15.02 10.37c-.02-.265-.067-.52-.14-.768-.07-.25-.173-.465-.307-.65-.135-.185-.305-.33-.512-.435-.21-.107-.465-.16-.77-.16-.3 0-.56.053-.78.16-.21.108-.39.254-.53.438-.14.185-.25.4-.32.65-.07.247-.11.507-.14.767h3.5v-.002zm-3.17-5.41h5.34v1.48h-5.34V4.96z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.codepen && (
                      <a href={profile.social.codepen} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="CodePen">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.144 13.067v-2.134L16.55 12zm1.276 1.194a.628.628 0 0 1-.006.083l-.005.028-.011.053-.01.031c-.005.016-.01.031-.017.047l-.014.03a.78.78 0 0 1-.021.043l-.019.03a.57.57 0 0 1-.08.1l-.026.025a.602.602 0 0 1-.036.033l-.027.023-.001.001-6.18 4.12a.63.63 0 0 1-.7 0l-6.18-4.12-.002-.001-.027-.023a.602.602 0 0 1-.036-.033l-.026-.025a.57.57 0 0 1-.08-.1l-.019-.03a.78.78 0 0 1-.021-.043l-.014-.03c-.007-.016-.012-.031-.017-.047l-.01-.031c-.004-.018-.008-.035-.011-.053l-.005-.028a.628.628 0 0 1-.006-.083V9.739c0-.028.002-.055.006-.083l.005-.027c.003-.018.007-.035.011-.053l.01-.031c.005-.016.01-.031.017-.047l.014-.03c.007-.015.014-.028.021-.043l.019-.03c.018-.024.038-.048.058-.072l.007-.008.02-.02.026-.025c.012-.012.024-.023.036-.033l.027-.023.002-.001 6.18-4.12a.63.63 0 0 1 .7 0l6.18 4.12.002.001.027.023c.012.01.024.021.036.033l.026.025.02.02.007.008c.02.024.04.048.058.072l.019.03c.007.015.014.028.021.043l.014.03c.007.016.012.031.017.047l.01.031c.004.018.008.035.011.053l.005.027c.004.028.006.055.006.083v4.522zm-8.42-9.67l-5.143 3.428 2.3 1.538 2.843-1.895V4.59zm1.256 0v3.071l2.843 1.895 2.3-1.538-5.143-3.428zm-6.453 5.39l-1.594 1.066 1.594 1.066V9.98zm5.197 3.467L8.157 12l-2.3 1.538 5.143 3.428v-3.519zm1.256 0v3.519l5.143-3.428-2.3-1.538-2.843 1.447zm.312-2.387L12 10.125l-2.57 1.935L12 13.996l2.57-1.936zM5.856 13.067l1.594-1.066-1.594-1.066v2.132z"/>
                        </svg>
                      </a>
                    )}
                    {profile?.social?.website && (
                      <a href={profile.social.website} target="_blank" rel="noopener noreferrer"
                         className="w-10 h-10 flex items-center justify-center border border-white/10 text-white/50 hover:text-[#a78bfa] hover:border-[#a78bfa]/50 transition-colors"
                         title="Website">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="border border-white/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs text-white/30">// contact_form</p>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-white/20"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a78bfa]"></span>
                  </div>
                </div>
                
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="text-[#a78bfa] text-4xl mb-4">✓</div>
                    <h3 className="text-white mb-2">{'message sent!'}</h3>
                    <p className="text-white/40 text-sm">{"// I'll get back to you soon"}</p>
                  </div>
                ) : (
                  <form 
                    name="contact" 
                    method="POST" 
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                  >
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/40 text-xs mb-2">name = *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="'John Doe'"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 text-xs mb-2">email = *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="'john@example.com'"
                          className={`w-full px-4 py-3 bg-white/5 border text-white text-sm placeholder:text-white/20 focus:outline-none transition-colors ${emailError ? 'border-red-500' : 'border-white/10 focus:border-[#a78bfa]/50'}`}
                        />
                        {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white/40 text-xs mb-2">message = *</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="// Tell me about your project..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#a78bfa]/50 transition-colors resize-none"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#a78bfa] text-black text-sm font-medium hover:bg-[#c4b5fd] transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? 'sending...' : 'submit'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer profile={profile} />
    </div>
  );
}
