'use client';
import React from 'react';
import Link from 'next/link';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { BUILD_SHA } from '@/lib/build-info';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/80 bg-card border-t py-8 text-sm sm:py-10">
      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          {/* Logo & Version */}
          <div className="space-y-2">
            <Link href="/" className="group flex min-w-0 flex-wrap items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
                </svg>
              </div>
              <span className="text-foreground text-lg font-black tracking-tight">
                GALLO<span className="text-emerald-600 dark:text-emerald-400">TRACK</span>
              </span>
              <span className="text-muted-foreground border-border ml-1 rounded border px-1.5 py-0.5 font-mono text-xs font-bold tracking-widest uppercase">
                v1.0.0
              </span>
              <span className="text-muted-foreground font-mono text-xs font-bold tracking-widest uppercase">
                build {BUILD_SHA}
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-xs font-medium">
              Advanced Gamefowl Breeding &amp; Match Analytics Platform.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-xs font-bold">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#about" className="hover:text-foreground transition-colors">
              About
            </a>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
            <CompactLanguageSwitcher variant="select" />
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="border-border/60 text-muted-foreground flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row">
          <p className="text-center font-medium sm:text-left">
            &copy; {currentYear} GalloTrack. All rights reserved.
          </p>
          <p className="text-center font-semibold text-emerald-600 sm:text-right dark:text-emerald-400">
            ISUFST CICI Capstone Project
          </p>
        </div>
      </div>
    </footer>
  );
}
