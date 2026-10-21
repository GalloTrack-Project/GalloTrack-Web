'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

export default function LandingNavbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const sectionIds = ['features', 'how-it-works', 'about'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isLoggedIn = !!auth.currentUserId;

  return (
    <header className="border-border/80 bg-background/85 sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl flex-wrap items-center justify-between gap-x-2 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex min-w-0 cursor-pointer items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition-colors group-hover:bg-emerald-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
          <div className="flex hidden items-baseline gap-2 sm:flex">
            <span className="text-foreground text-xl font-black tracking-tight">
              GALLO<span className="text-emerald-600 dark:text-emerald-400">TRACK</span>
            </span>
            <span className="text-muted-foreground hidden font-mono text-xs font-bold tracking-widest uppercase sm:inline">
              v1.0.0
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links with Active Scroll Indicator */}
        <nav
          aria-label="Main Navigation"
          className="hidden items-center gap-8 text-sm font-bold md:flex"
        >
          <a
            href="#features"
            className={`relative py-1 transition-colors ${
              activeSection === 'features'
                ? 'font-extrabold text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Features
            {activeSection === 'features' && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </a>
          <a
            href="#how-it-works"
            className={`relative py-1 transition-colors ${
              activeSection === 'how-it-works'
                ? 'font-extrabold text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            How it works
            {activeSection === 'how-it-works' && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </a>
          <a
            href="#about"
            className={`relative py-1 transition-colors ${
              activeSection === 'about'
                ? 'font-extrabold text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            About
            {activeSection === 'about' && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </a>
        </nav>

        {/* Desktop Action Area */}
        <div className="hidden items-center gap-3 md:flex">
          <CompactLanguageSwitcher />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-emerald-700"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="text-foreground hover:bg-muted cursor-pointer rounded-lg px-3.5 py-2 text-sm font-bold transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-emerald-700"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Theme Toggle */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <CompactLanguageSwitcher />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 sm:p-2"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 focus:outline-none sm:p-2"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-border bg-card animate-in slide-in-from-top space-y-4 border-b px-4 pt-3 pb-6 duration-200 md:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-2 text-sm font-bold">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-md px-3 py-2 transition-colors ${
                activeSection === 'features'
                  ? 'bg-emerald-500/10 font-extrabold text-emerald-600 dark:text-emerald-400'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-md px-3 py-2 transition-colors ${
                activeSection === 'how-it-works'
                  ? 'bg-emerald-500/10 font-extrabold text-emerald-600 dark:text-emerald-400'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              How it works
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-md px-3 py-2 transition-colors ${
                activeSection === 'about'
                  ? 'bg-emerald-500/10 font-extrabold text-emerald-600 dark:text-emerald-400'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              About
            </a>
          </nav>

          <div className="border-border flex flex-col gap-2.5 border-t pt-2">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-border text-foreground hover:bg-muted w-full rounded-lg border py-2.5 text-center text-sm font-bold"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-extrabold text-white hover:bg-emerald-700"
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
