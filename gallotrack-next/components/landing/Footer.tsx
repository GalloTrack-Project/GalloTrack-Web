'use client';
import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/80 bg-card py-8 sm:py-10 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Logo & Version */}
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
                </svg>
              </div>
              <span className="text-lg font-black tracking-tight text-foreground">
                GALLO<span className="text-emerald-600 dark:text-emerald-400">TRACK</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1 px-1.5 py-0.5 rounded border border-border">
                v1.0.0
              </span>
            </Link>
            <p className="text-xs text-muted-foreground font-medium max-w-sm">
              Advanced Gamefowl Breeding &amp; Match Analytics Platform.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-muted-foreground">
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
          </div>
        </div>

        {/* Bottom Credits & Copyright */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="font-medium text-center sm:text-left">
            &copy; {currentYear} GalloTrack. All rights reserved.
          </p>
          <p className="font-semibold text-center sm:text-right text-emerald-600 dark:text-emerald-400">
            ISUFST CICI Capstone Project
          </p>
        </div>
      </div>
    </footer>
  );
}
