'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGaloTrack } from '@/lib/context';
import ForgotPasswordModal from '@/components/modals/ForgotPasswordModal';

export default function LoginPage() {
  const router = useRouter();
  const store = useGaloTrack();
  const {
    currentPage,
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

  useEffect(() => {
    if (currentPage !== 'login') {
      router.push('/dashboard');
    }
  }, [currentPage, router]);

  if (currentPage !== 'login') return null;

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* LEFT PANEL — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
        <div className="absolute top-0 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Top — Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              🐓
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">GALLO<span className="text-emerald-200">TRACK</span></h2>
              <span className="text-[9px] font-mono font-bold text-emerald-200/70 tracking-widest uppercase block">v1.0.0</span>
            </div>
          </div>

          {/* Center — Hero */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Advanced<br/>
                <span className="text-emerald-200">Gamefowl</span><br/>
                Analytics Platform
              </h1>
              <p className="text-sm text-emerald-100/70 font-medium max-w-md leading-relaxed">
                Optimize your breeding program with data-driven lineage tracking, match performance analytics, and comprehensive flock management.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {[
                { icon: '🧬', title: 'Lineage Tracking', desc: 'Deep ancestry mapping' },
                { icon: '⚔️', title: 'Match Analytics', desc: 'Performance insights' },
                { icon: '📊', title: 'Flock Dashboard', desc: 'Real-time overview' },
                { icon: '🏟️', title: 'Farm Registry', desc: 'Multi-farm support' },
              ].map((f) => (
                <div key={f.title} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3.5 space-y-1.5 hover:bg-white/15 transition-colors">
                  <span className="text-lg">{f.icon}</span>
                  <p className="text-xs font-bold text-white">{f.title}</p>
                  <p className="text-[10px] text-emerald-200/60 font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — Stats */}
          <div className="flex items-center gap-8">
            {[
              { value: '32+', label: 'Fowls Registered' },
              { value: '4+', label: 'Active Farms' },
              { value: '100%', label: 'Open Source' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-emerald-200/60 font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-teal-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-16 h-16 drop-shadow-[0_0_14px_rgba(16,185,129,0.45)]">
                <defs>
                  <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#059669"/>
                  </linearGradient>
                </defs>
                <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" fill="url(#shieldGrad)" stroke="rgba(52,211,153,0.55)" strokeWidth="0.8"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl">🐓</span>
            </div>
            <h1 className="text-2xl font-black text-card-foreground tracking-tight">GALLOTRACK</h1>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground font-medium">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </span>
                <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="you@example.com" autoComplete="off" required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-11 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="Enter your password" autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-400 p-1 rounded-lg transition-colors cursor-pointer" title={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                <div className="relative">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                  <div className="w-4 h-4 rounded-md border border-input bg-muted peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Remember Me</span>
              </label>
              <button type="button" onClick={() => { setShowForgotPasswordModal(true); setForgotEmail(''); setForgotSent(false); setForgotError(''); }} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors tracking-wide cursor-pointer">
                Forgot Password?
              </button>
            </div>

            {error && <div className="text-xs text-rose-500 font-bold text-center bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl dark:text-rose-300">{error}</div>}
            {successMessage && <div className="text-xs text-emerald-500 font-bold text-center bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl dark:text-emerald-300 leading-relaxed">{successMessage}</div>}

            <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-3">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span className="text-sm tracking-widest">{loading ? 'SIGNING IN...' : 'SIGN IN'}</span>
              </div>
            </button>

            <p className="text-center text-[11px] text-muted-foreground font-medium pt-1">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                Create one
              </Link>
            </p>

            <p className="text-center text-[9px] text-muted-foreground/50 font-semibold tracking-wide flex items-center justify-center gap-1.5 pt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/50"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>
              ISUFST CICT Capstone Project
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
