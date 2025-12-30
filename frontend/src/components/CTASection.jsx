'use client'
import React from 'react';
import { Link } from '@/lib/router-compat';

export default function CTASection() {
  return (
    <section className="py-10 px-6 font-mono">
      <div className="max-w-6xl mx-auto">
        {/* Terminal Window */}
        <div className="relative">
          {/* Terminal Container */}
          <div className="relative border border-white/10 bg-[#0d0d0d]">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/80"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-500/80"></span>
                <span className="w-2 h-2 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-white/30 text-[10px]">contact.php</span>
              <div className="w-12"></div>
            </div>
            
            {/* Terminal Content */}
            <div className="p-4 sm:p-6">
              {/* Code Lines */}
              <div className="space-y-1.5 sm:space-y-2 mb-6 text-xs sm:text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">01</span>
                  <span className="text-[#a78bfa]">{'<?php'}</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">02</span>
                  <span className="text-white/40">// Ready to start something new?</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">03</span>
                  <div className="flex flex-wrap items-center gap-x-1">
                    <span className="text-[#a78bfa]">$project</span>
                    <span className="text-white/30">=</span>
                    <span className="text-[#a78bfa]">new</span>
                    <span className="text-green-400 ml-1">Collaboration</span>
                    <span className="text-white/30">();</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">04</span>
                  <div className="flex flex-wrap items-center gap-x-1">
                    <span className="text-[#a78bfa]">$project</span>
                    <span className="text-white/30">{'->'}</span>
                    <span className="text-cyan-400">with</span>
                    <span className="text-white/30">(</span>
                    <span className="text-orange-400">'you'</span>
                    <span className="text-white/30">);</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">05</span>
                  <div className="flex flex-wrap items-center gap-x-1">
                    <span className="text-[#a78bfa]">if</span>
                    <span className="text-white/30">(</span>
                    <span className="text-[#a78bfa]">$project</span>
                    <span className="text-white/30">{'->'}</span>
                    <span className="text-cyan-400">isAwesome</span>
                    <span className="text-white/30">()) {'{'}</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">06</span>
                  <div className="pl-3 sm:pl-4">
                    <span className="text-[#a78bfa]">return</span>
                    <span className="text-orange-400"> "Let's build it!"</span>
                    <span className="text-white/30">;</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="text-white/20 text-[10px] w-4 text-right flex-shrink-0 hidden sm:block">07</span>
                  <span className="text-white/30">{'}'}</span>
                </div>
              </div>
              
              {/* CTA Area */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <p className="text-white/50 text-xs sm:text-sm text-center sm:text-left">Have an idea? Let's make it happen.</p>
                <Link 
                  to="/contact"
                  className="group flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#a78bfa] text-black font-semibold text-xs tracking-wider hover:bg-[#c4b5fd] transition-all duration-300"
                >
                  <span>contact</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
