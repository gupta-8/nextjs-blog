'use client'
import React, { useRef, useState, useCallback, useMemo } from 'react';

/**
 * Full Hero Section with animated background and CTA
 * Can be used with or without the LiquidGlassHeader
 */
export default function LiquidGlassHero({ 
  name, 
  role, 
  motto, 
  navItems, 
  onNavClick,
  onMobileMenuClick,
  hideNav = false
}) {
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

  // Pre-generate particle positions to avoid Math.random in render
  const particlePositions = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      left: (i * 33.3 + (i % 3) * 11.1) % 100,
      top: (i * 27.7 + (i % 5) * 13.3) % 100,
      duration: 3 + (i % 5) * 0.8,
      delay: (i % 7) * 0.7
    }));
  }, []);

  // Track mouse for glow effect
  const handleMouseMove = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x: `${x}%`, y: `${y}%` });
  }, []);

  return (
    <div 
      ref={heroRef}
      className="relative w-full h-screen overflow-hidden bg-[#0a0a0f]"
      onMouseMove={handleMouseMove}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Main glow that follows mouse */}
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-25 blur-[100px] transition-all duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, #5227FF 0%, transparent 70%)',
            left: mousePos.x,
            top: mousePos.y,
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Static ambient glows */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
            left: '20%',
            top: '30%',
            animation: 'float1 12s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
            right: '15%',
            bottom: '25%',
            animation: 'float2 15s ease-in-out infinite'
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particlePositions.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `twinkle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 z-10">
        <div className="text-center">
          <p className="text-[#a78bfa] text-lg sm:text-xl mb-4 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Hello, I&apos;m
          </p>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            {name}
          </h1>
          <p className="text-xl sm:text-2xl text-[#c4b5fd] mb-6 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
            {role}
          </p>
          <p className="text-white/60 text-sm sm:text-base max-w-md mx-auto mb-10 animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
            {motto}
          </p>

          {/* CTA Button */}
          <div className="animate-fadeInUp" style={{ animationDelay: '1s' }}>
            <button
              onClick={() => onNavClick?.('#contact')}
              className="group relative px-8 py-4 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(82, 39, 255, 0.7) 0%, rgba(124, 58, 237, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 32px rgba(82, 39, 255, 0.35)'
              }}
            >
              <span className="relative z-10 text-white font-medium">Get In Touch</span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce z-20">
        <span className="text-white/40 text-xs">Scroll</span>
        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.05); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
