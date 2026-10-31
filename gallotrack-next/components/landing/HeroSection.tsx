'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import HeroCarousel from '@/components/hero/HeroCarousel';
import { getPrimaryHeroImage } from '@/lib/hero-config';

export default function HeroSection() {
  const auth = useAuth();
  const isLoggedIn = !!auth.currentUserId;

  return (
    <section className="relative overflow-hidden pt-6 pb-12 md:pt-10 md:pb-16 lg:pt-14 lg:pb-20">
      {/* Background radial gradient accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-center lg:text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ISUFST CICI Capstone Project</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-foreground tracking-tight leading-[1.12]">
                Advanced Gamefowl <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">Breeding &amp; Match</span> Analytics
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Optimize your breeding program with lineage tracking, fight performance logs, and real-time flock management.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-lg border border-border bg-card/80 hover:bg-muted text-foreground font-bold text-sm transition-colors cursor-pointer"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-5 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Private farm records
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Automatic bloodline calculation
              </span>
            </div>
          </div>

          {/* Right Column: Primary farm photo */}
          <div className="lg:col-span-6 w-full flex justify-center">
            <HeroCarousel
              images={[getPrimaryHeroImage()]}
              showThumbnails={false}
              className="max-w-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
