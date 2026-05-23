"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles } from "lucide-react"; 
import { useEffect, useRef } from "react";

const HeroSection = () => {
  const imageRef = useRef();

  useEffect(() => {
    const imageElement = imageRef.current;
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const scrollThreshold = 50;
      if (imageElement && scrollPosition > scrollThreshold) {
        imageElement.classList.add("scrolled");
      } else if (imageElement) {
        imageElement.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    // Changed justify-center to justify-start and added pt-8 for a tighter top fit
    <div className="min-h-[100dvh] flex flex-col justify-start items-center px-4 pt-8 md:pt-16 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
      <div className="container mx-auto text-center flex flex-col items-center max-w-sm md:max-w-lg">
        
        {/* Pill Badge - Margin bottom reduced to mb-4 */}
        <div className="inline-flex items-center gap-2 bg-blue-100/50 border border-blue-200 px-3 py-1 rounded-full mb-4 animate-fade-in">
          <Sparkles className="w-3 h-3 text-blue-600" />
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Insightivia AI 2.0</span>
        </div>

        {/* Heading - mt-0 to remove any inherited top gap */}
        <h1 className="text-3xl md:text-6xl font-extrabold text-slate-900 mb-1 mt-0 tracking-tight leading-[1.1]">
          Finances Made <br /> Simple
        </h1>
        <p className="text-[9px] md:text-xs font-bold text-slate-400 tracking-[0.3em] uppercase mb-6 md:mb-10">
          Your Intelligent Partner
        </p>

        {/* Hero Card Wrapper */}
        <div className="relative w-full max-w-[290px] md:max-w-md mb-6 md:mb-10">
          {/* Floating Saved Badge */}
          <div className="absolute -right-2 -top-3 bg-white rounded-xl p-1.5 md:p-3 shadow-xl border flex items-center gap-2 z-10 scale-90 md:scale-100">
            <div className="bg-emerald-100 p-1 rounded-full">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex items-center justify-center">
                 <span className="text-white text-[7px]">✓</span>
               </div>
            </div>
            <div className="text-left">
              <p className="text-[7px] text-gray-400 font-bold uppercase leading-none">Saved</p>
              <p className="text-emerald-500 font-bold text-[10px]">+₱4,500.00</p>
            </div>
          </div>

          {/* Main Card */}
          <div ref={imageRef} className="bg-white rounded-[28px] md:rounded-[40px] shadow-2xl border p-5 md:p-8 text-left transition-all duration-500">
            <div className="flex justify-between items-start mb-0.5">
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">Net Balance</p>
              <button className="text-gray-300 text-xs">•••</button>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4 md:mb-8">₱42,850.12</h2>
            
            <div className="h-16 md:h-28 w-full relative mb-4 md:mb-8">
               <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                  <path 
                    d="M0 35 Q 25 30, 40 20 T 100 5" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M0 35 Q 25 30, 40 20 T 100 5 V 40 H 0 Z" 
                    fill="url(#gradientHero)" 
                    opacity="0.1"
                  />
                  <defs>
                    <linearGradient id="gradientHero" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
               </svg>
            </div>

            <div className="flex justify-between items-center">
               <div className="flex -space-x-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                  <div className="w-5 h-5 rounded-full bg-slate-300 border border-white" />
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[7px] font-bold text-gray-500">+12k</div>
               </div>
               <p className="text-[8px] text-gray-400 font-medium">Joined optimization today</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center space-y-2 w-full max-w-[260px]">
          <Link href="/dashboard" className="w-full">
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 md:h-16 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          
          <Link href="/feature-guide">
            <Button variant="link" className="text-blue-600 font-bold text-xs h-8 p-0">
              See How
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;