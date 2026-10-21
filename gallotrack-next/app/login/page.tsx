'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGaloTrack } from '@/lib/context';
import ForgotPasswordModal from '@/components/modals/ForgotPasswordModal';
import { Dna, Swords, BarChart3, Building2, ArrowLeft } from 'lucide-react';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useT } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const store = useGaloTrack();
  const {
    currentUserId,
    handleLogin,
    loading,
    error,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    successMessage,
    showForgotPasswordModal,
    setShowForgotPasswordModal,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    setForgotSent,
    forgotError,
    setForgotError,
    forgotLoading,
    handleSendResetLink,
  } = store;

  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    document.title = `${t('auth.loginTitle')} | GalloTrack`;
  }, [t]);

  useEffect(() => {
    fetch('/api/admin/system-settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.system_status === 'Maintenance') {
          setMaintenanceMsg(
            s.maintenance_message ||
              'System is currently under maintenance. Some features may be unavailable.',
          );
        }
      })
      .catch(() => {});
  }, []);

  const rawRedirect =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect')
      : null;
  const safeRedirect = sanitizeRedirectPath(rawRedirect, '/dashboard');

  useEffect(() => {
    if (currentUserId) {
      router.push(safeRedirect);
    }
  }, [currentUserId, router, safeRedirect]);

  if (currentUserId) return null;

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* LEFT PANEL — Branding */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute top-0 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"></div>

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          {/* Top — Logo and Back link */}
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex cursor-pointer items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm transition-colors group-hover:bg-white/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  GALLO<span className="text-emerald-200">TRACK</span>
                </h2>
                <span className="block font-mono text-xs font-bold tracking-widest text-emerald-200/70 uppercase">
                  v1.0.0
                </span>
              </div>
            </Link>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <CompactLanguageSwitcher variant="select" />
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-emerald-100/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>

          {/* Center — Hero */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl leading-[1.1] font-black tracking-tight text-white xl:text-5xl">
                Advanced
                <br />
                <span className="text-emerald-200">Gamefowl Breeding</span>
                <br />
                &amp; Match Analytics
              </h1>
              <p className="max-w-md text-sm leading-relaxed font-medium text-emerald-100/70">
                Optimize your breeding program with lineage tracking, fight performance logs, and
                real-time flock management.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid max-w-lg grid-cols-2 gap-3">
              {[
                { icon: Dna, title: 'Lineage Tracking', desc: 'Breeding Male, Female & Offspring' },
                { icon: Swords, title: 'Match Logs', desc: 'Fight records & win rates' },
                { icon: BarChart3, title: 'Flock Dashboard', desc: 'Active flock overview' },
                { icon: Building2, title: 'Farm Registry', desc: 'Breeding classifications' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="space-y-1.5 rounded-md border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15"
                >
                  <f.icon className="h-5 w-5 text-emerald-300" />
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="text-xs font-medium text-emerald-200/60">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Project Note */}
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-100/60">
            <span>ISUFST CICI Capstone Project</span>
            <span>·</span>
            <span>Gamefowl Lineage &amp; Fight Intelligence</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl"></div>
        <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-400/5 blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo and Back link */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-2 lg:hidden">
            <Link href="/" className="inline-flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
                </svg>
              </div>
              <span className="text-foreground hidden font-black tracking-tight sm:inline">
                GALLOTRACK
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <CompactLanguageSwitcher variant="button" />
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h2 className="text-card-foreground text-2xl font-black tracking-tight sm:text-3xl">
              {t('auth.loginTitle')}
            </h2>
            <p className="text-muted-foreground text-sm font-medium">{t('auth.loginSubtitle')}</p>
          </div>

          {maintenanceMsg && (
            <div className="mb-5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm font-bold text-amber-700 dark:text-amber-300">
              {maintenanceMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-black tracking-widest uppercase"
                htmlFor="email-address"
              >
                {t('auth.emailLabel')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-emerald-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-input-border bg-muted/60 focus:bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-md border py-3 pr-3.5 pl-10 text-sm font-semibold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="off"
                  required
                  id="email-address"
                />
              </div>
            </div>

            <div>
              <label
                className="text-muted-foreground mb-2 block text-xs font-black tracking-widest uppercase"
                htmlFor="password"
              >
                {t('auth.passwordLabel')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-emerald-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-input-border bg-muted/60 focus:bg-muted text-foreground placeholder:text-muted-foreground w-full rounded-md border py-3 pr-11 pl-10 text-sm font-semibold transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder={t('auth.passwordPlaceholder')}
                  autoComplete="new-password"
                  required
                  id="password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-sm p-1 transition-colors hover:text-emerald-400"
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label
                className="group flex cursor-pointer items-center space-x-2.5 select-none"
                htmlFor="remember-me-login"
              >
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                    id="remember-me-login"
                  />
                  <div className="border-input-border bg-muted flex h-4 w-4 items-center justify-center rounded-sm border transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500">
                    <svg
                      className="h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs font-bold tracking-widest uppercase transition-colors group-hover:text-emerald-400">
                  Remember Me
                </span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPasswordModal(true);
                  setForgotEmail('');
                  setForgotSent(false);
                  setForgotError('');
                }}
                className="cursor-pointer text-xs font-bold tracking-wide text-emerald-500 transition-colors hover:text-emerald-400"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3.5 text-center text-sm font-bold text-rose-500 dark:text-rose-300">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-center text-sm leading-relaxed font-bold text-emerald-500 dark:text-emerald-300">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full cursor-pointer overflow-hidden rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-black text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99]"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                )}
                <span className="text-sm tracking-widest">
                  {loading ? t('auth.signingIn') : t('auth.signInButton')}
                </span>
              </div>
            </button>

            <p className="text-muted-foreground pt-1 text-center text-xs font-medium">
              {t('auth.noAccountPrompt')}{' '}
              <Link
                href="/register"
                className="font-bold text-emerald-500 transition-colors hover:text-emerald-400"
              >
                {t('auth.signUpLink')}
              </Link>
            </p>

            <p className="text-muted-foreground/50 flex items-center justify-center gap-1.5 pt-2 text-center text-xs font-semibold tracking-wide">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-500/50"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
              </svg>
              ISUFST CICI Capstone Project
            </p>
          </form>
        </div>
      </div>

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          showForgotPasswordModal={showForgotPasswordModal}
          setShowForgotPasswordModal={setShowForgotPasswordModal}
          handleSendResetLink={handleSendResetLink}
          forgotEmail={forgotEmail}
          setForgotEmail={setForgotEmail}
          forgotLoading={forgotLoading}
          forgotSent={forgotSent}
          forgotError={forgotError}
        />
      )}
    </div>
  );
}
