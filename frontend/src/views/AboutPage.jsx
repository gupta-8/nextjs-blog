import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import CTASection from '../components/CTASection';
import { useSite } from '@/contexts/SiteContext';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AboutPage({ initialData }) {
  // Use SSR data if available
  const hasSSRData = initialData && initialData.profile;
  
  const [profile, setProfile] = useState(hasSSRData ? initialData.profile : null);
  const [content, setContent] = useState(hasSSRData ? (initialData.content || {}) : {});
  const [loading, setLoading] = useState(!hasSSRData);
  
  // Get dynamic site name
  const { siteName } = useSite();

  useEffect(() => {
    document.title = `About | ${siteName}`;
  }, [siteName]);

  // Only fetch on client if no SSR data
  useEffect(() => {
    if (hasSSRData) return;
    
    const fetchData = async () => {
      try {
        const [profileRes, contentRes] = await Promise.all([
          fetch(`${API_URL}/api/profile`),
          fetch(`${API_URL}/api/content/about`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono">
        <span className="text-[#a78bfa]">loading_</span>
        <span className="animate-pulse">|</span>
      </div>
    );
  }

  const name = profile?.name || 'Name';
  const firstName = name.split(' ')[0];
  const bio = content.about_bio || profile?.summary || 'Bio';
  const location = profile?.location || content.about_location || 'Location';
  const philosophyQuote = profile?.philosophy || content.about_philosophy_quote || ''; // Empty if not set

  const journey = [
    { year: '2018', event: 'started', desc: 'Started coding journey with PHP' },
    { year: '2019', event: 'themes', desc: 'Built first custom WordPress theme' },
    { year: '2020', event: 'freelance', desc: 'Started working with international clients' },
    { year: '2021', event: 'woocommerce', desc: 'Specialized in WooCommerce solutions' },
    { year: '2022', event: 'projects = 50+', desc: 'Completed 50+ projects with 5-star reviews' },
    { year: '2023', event: 'expanded', desc: 'Added React and modern frameworks' },
  ];

  const values = [
    { key: 'precision', value: 'Every line of code with purpose' },
    { key: 'performance', value: 'Speed is never an afterthought' },
    { key: 'passion', value: 'Love what I do, shows in work' },
    { key: 'collaboration', value: 'Great communication, great results' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#a78bfa] selection:text-black">
      
      {/* Hero Section */}
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-6">// about_me.php</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
            <span className="text-white">developer</span> <span className="text-white/30">= [</span>
          </h1>
          
          <div className="ml-4 sm:ml-8 space-y-3 text-base sm:text-lg">
            <div>
              <span className="text-[#a78bfa]">'name'</span>
              <span className="text-white/30">{' => '}</span>
              <span className="text-white">"{name}"</span><span className="text-white/30">,</span>
            </div>
            <div>
              <span className="text-[#a78bfa]">'role'</span>
              <span className="text-white/30">{' => '}</span>
              <span className="text-white">"{profile?.role || 'Developer'}"</span><span className="text-white/30">,</span>
            </div>
            <div>
              <span className="text-[#a78bfa]">'location'</span>
              <span className="text-white/30">{' => '}</span>
              <span className="text-white">"{location}"</span><span className="text-white/30">,</span>
            </div>
            {philosophyQuote && (
              <div>
                <span className="text-[#a78bfa]">'philosophy'</span>
                <span className="text-white/30">{' => '}</span>
                <span className="text-white">"{philosophyQuote}"</span><span className="text-white/30">,</span>
              </div>
            )}
            <div>
              <span className="text-[#a78bfa]">'available'</span>
              <span className="text-white/30">{' => '}</span>
              <span className="text-[#a78bfa]">true</span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-4">
            <span className="text-white/30">];</span>
          </h1>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-8">// stats</p>
          <div className="space-y-4 sm:space-y-0 sm:flex sm:border sm:border-white/10 sm:divide-x sm:divide-white/10">
            {[
              { key: 'experience', value: '2+', unit: 'years' },
              { key: 'projects', value: '20+', unit: 'completed' },
              { key: 'response', value: '<24h', unit: 'time' },
            ].map((stat) => (
              <div 
                key={stat.key} 
                className="flex-1 p-4 sm:p-6 text-center border border-white/10 sm:border-0"
              >
                <div className="text-2xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-white/40 tracking-wider">{stat.key}.{stat.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// values</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
            <span className="text-white">values</span> <span className="text-white/30">= [</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-px bg-white/10">
            {values.map((item, index) => (
              <div key={item.key} className="bg-[#0a0a0a] p-6">
                <div className="flex items-start gap-4">
                  <span className="text-white/20 text-sm">[{index}]</span>
                  <div>
                    <span className="text-[#a78bfa]">{item.key}:</span>
                    <p className="text-white/50 mt-1 text-sm">"{item.value}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
            <span className="text-white/30">];</span>
          </h2>
        </div>
      </section>

      {/* Journey Timeline */}
      <section className="py-10 px-6 border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#a78bfa] text-xs tracking-[0.3em] mb-3">// journey</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">
            <span className="text-white/30">function </span>
            <span className="text-[#a78bfa]">timeline</span>
            <span className="text-white/30">() {'{'}</span>
          </h2>
          
          <div className="space-y-0">
            {journey.map((item, index) => (
              <div key={item.year} className="flex border-l border-white/10 ml-4">
                <div className="flex-shrink-0 -ml-2 mt-6">
                  <div className="w-4 h-4 rounded-full bg-[#a78bfa] border-4 border-[#0a0a0a]"></div>
                </div>
                <div className="pl-6 pb-8">
                  <span className="text-[#a78bfa] text-xs">{item.year}</span>
                  <div className="text-white mt-1">{item.event}</div>
                  <p className="text-white/40 text-sm mt-1">// {item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-white/30">{'}'}</span>
          </h2>
        </div>
      </section>

      <CTASection />

      <Footer profile={profile} />
    </div>
  );
}
