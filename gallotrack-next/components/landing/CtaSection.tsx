'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

export default function CtaSection() {
  const auth = useAuth();
  const isLoggedIn = !!auth.currentUserId;

  return (
    <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white">
      {/* Background patterned overlay matching brand left panel */}
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Take Control of Your Farm&apos;s Breeding Legacy
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/80 font-medium leading-relaxed">
            Join professional breeders leveraging structured lineage mapping and fight analytics to breed champion gamefowl.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 active:scale-[0.99] font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 active:scale-[0.99] font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer"
              >
                <span>Create an Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base transition-colors cursor-pointer"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
