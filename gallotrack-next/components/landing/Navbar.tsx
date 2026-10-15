'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

export default function LandingNavbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoggedIn = !!auth.currentUserId;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:bg-emerald-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black tracking-tight text-foreground">
              GALLO<span className="text-emerald-600 dark:text-emerald-400">TRACK</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">
              v1.0.0
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#about" className="hover:text-foreground transition-colors">
            About
          </a>
        </nav>

        {/* Desktop Action Area */}
        <div className="hidden md:flex items-center gap-3">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-all"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-3.5 py-2 rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Theme Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-3 font-bold text-sm">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground transition-colors"
            >
              About
            </a>
          </nav>

          <div className="pt-2 border-t border-border flex flex-col gap-2.5">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-extrabold text-sm"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
