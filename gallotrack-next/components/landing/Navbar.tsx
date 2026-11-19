'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ArrowRight, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import Logo from '@/components/brand/Logo';
import { useT, type TranslationKey } from '@/lib/i18n';

type LandingNavbarProps = {
  linkPrefix?: '' | '/';
};

type NavItem = {
  id: string;
  labelKey: TranslationKey;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'features', labelKey: 'landing.features' },
  { id: 'how-it-works', labelKey: 'landing.howItWorks' },
  { id: 'about', labelKey: 'landing.about' },
];

export default function LandingNavbar({ linkPrefix = '' }: LandingNavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerId = useId();
  const isLoggedIn = !!auth.currentUserId;
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const elements = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => element !== null,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const drawer = drawerRef.current;
    const getFocusable = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

    const focusFirst = () => getFocusable()[0]?.focus();
    const frame = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [mobileMenuOpen]);

  const anchorHref = (id: string) => `${linkPrefix}#${id}`;
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const themeButton = (fullWidth = false) => (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('header.switchToLight') : t('header.switchToDark')}
      title={isDark ? t('header.switchToLight') : t('header.switchToDark')}
      className={`border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
        fullWidth ? 'w-full px-4' : 'w-11'
      }`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {fullWidth && <span>{t('header.toggleTheme')}</span>}
    </button>
  );

  const authActions = (fullWidth = false) =>
    isLoggedIn ? (
      <Link
        href="/dashboard"
        onClick={closeMobileMenu}
        className={`bg-gradient-to-r from-sidebar to-sidebar-end text-sidebar-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-black shadow-md transition-colors hover:from-hero-mid hover:to-sidebar focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        <span>{t('landing.openDashboard')}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    ) : (
      <div className={fullWidth ? 'flex w-full flex-col gap-2.5' : 'flex items-center gap-2.5'}>
        <Link
          href="/login"
          onClick={closeMobileMenu}
          className={`border-border bg-card/80 text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            fullWidth ? 'w-full' : ''
          }`}
        >
          {t('landing.login')}
        </Link>
        <Link
          href="/register"
          onClick={closeMobileMenu}
          className={`bg-gradient-to-r from-sidebar to-sidebar-end text-sidebar-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-black shadow-md transition-colors hover:from-hero-mid hover:to-sidebar focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            fullWidth ? 'w-full' : ''
          }`}
        >
          {t('landing.signUp')}
        </Link>
      </div>
    );

  return (
    <>
      <header className="border-border/80 bg-background/85 sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={t('landing.brandHome')}
          className="focus-visible:ring-ring focus-visible:ring-offset-background flex min-w-0 shrink-0 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="bg-background ring-border inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-1 shadow-sm ring-1">
            <Logo variant="mark" size="md" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="text-foreground text-lg font-black tracking-tight break-words sm:text-xl">
              GALLO<span className="text-brand-red">TRACK</span>
            </span>
            <span className="text-muted-foreground mt-1 block font-mono text-[10px] font-bold tracking-[0.22em] uppercase">
              {t('landing.version')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('landing.navAria')} className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={anchorHref(item.id)}
                aria-current={isActive ? 'location' : undefined}
                className={`focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex min-h-11 items-center rounded-sm text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none ${
                  isActive ? 'text-brand-red' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(item.labelKey)}
                <span
                  aria-hidden="true"
                  className={`bg-brand-red absolute right-0 bottom-1 left-0 h-0.5 rounded-full transition-opacity motion-reduce:transition-none ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex lg:gap-3">
          <CompactLanguageSwitcher />
          {mounted && themeButton()}
          {authActions()}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t('landing.openMenu')}
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            aria-controls={drawerId}
            className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            aria-label={t('landing.closeMenu')}
            onClick={closeMobileMenu}
            className="bg-sidebar-end/60 absolute inset-0 cursor-default backdrop-blur-[2px]"
          />
          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={t('landing.mobileNavAria')}
            className="border-border bg-card text-card-foreground absolute top-0 right-0 flex h-full w-[min(22rem,90vw)] flex-col overflow-y-auto border-l shadow-2xl"
          >
            <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
              <span className="text-foreground text-lg font-black tracking-tight">
                GALLO<span className="text-brand-red">TRACK</span>
              </span>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label={t('landing.closeMenu')}
                className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label={t('landing.mobileNavAria')} className="flex flex-col gap-1 p-4">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={anchorHref(item.id)}
                  onClick={closeMobileMenu}
                  className="text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-11 items-center rounded-md px-3 text-base font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
                >
                  {t(item.labelKey)}
                </a>
              ))}
            </nav>

            <div className="border-border mt-auto space-y-3 border-t p-4">
              <CompactLanguageSwitcher className="w-full [&>button]:w-full [&>button]:justify-between" />
              {mounted && themeButton(true)}
              {authActions(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
