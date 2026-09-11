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
    <div className="min-h-screen w-full flex bg-[#0a0f0d] relative overflow-hidden">
      {/* ====== LEFT PANEL — Branding ====== */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-10 xl:p-14">
        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[160px]"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[180px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/8 rounded-full blur-[140px]"></div>
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="gl" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gl)"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/[0.07] backdrop-blur-sm border border-white/[0.1] rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-black/20">
              🐓
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">GALLO<span className="text-emerald-400">TRACK</span></h2>
              <span className="text-[8px] font-bold text-emerald-400/50 tracking-[0.25em] uppercase block">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-400/80 tracking-widest uppercase">Open Source &bull; Free Forever</span>
            </div>
            <h1 className="text-4xl xl:text-[3.4rem] font-black text-white leading-[1.08] tracking-tight">
              Advanced<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Gamefowl</span><br/>
              Analytics Platform
            </h1>
            <p className="text-[13px] text-white/40 font-medium max-w-md leading-relaxed">
              Optimize your breeding program with data-driven lineage tracking, match performance analytics, and comprehensive flock management tools.
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
              <div key={f.title} className="group bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 space-y-2.5 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all duration-300 cursor-default">
                <div className="w-9 h-9 bg-white/[0.06] border border-white/[0.08] rounded-xl flex items-center justify-center text-base group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all duration-300">
                  {f.icon}
                </div>
                <p className="text-[11px] font-bold text-white/80 tracking-wide">{f.title}</p>
                <p className="text-[10px] text-white/30 font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex items-center gap-10">
          {[
            { value: '32+', label: 'Fowls Registered' },
            { value: '4+', label: 'Active Farms' },
            { value: '100%', label: 'Open Source' },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-10">
              <div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
              {i < 2 && <div className="w-px h-8 bg-white/[0.06]"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* ====== RIGHT PANEL — Login Form ====== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Subtle glows */}
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/3 left-1/4 w-[250px] h-[250px] bg-teal-400/[0.03] rounded-full blur-[80px] pointer-events-none"></div>

        {/* Glass card */}
        <div className="relative z-10 w-full max-w-[400px]">
          {/* Card glow */}
          <div className="absolute -inset-px bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/15 rounded-3xl blur-lg opacity-40"></div>

          <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.07] rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>

            <div className="p-8 sm:p-9 space-y-7">
              {/* Mobile logo */}
              <div className="lg:hidden text-center">
                <div className="relative w-14 h-14 mx-auto mb-3">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg"></div>
                  <div className="relative w-14 h-14 bg-white/[0.07] backdrop-blur-sm border border-white/[0.1] rounded-2xl flex items-center justify-center text-2xl">
                    🐓
                  </div>
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">GALLOTRACK</h1>
              </div>

              {/* Header */}
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-white tracking-tight">Welcome back</h2>
                <p className="text-[13px] text-white/40 font-medium">Sign in to your account to continue</p>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-white/45 tracking-wide">Email address</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-emerald-400 transition-colors pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </span>
                    <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder:text-white/25 focus:bg-white/[0.07] focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 outline-none" placeholder="you@example.com" autoComplete="off" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-white/45 tracking-wide">Password</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-emerald-400 transition-colors pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[13px] text-white placeholder:text-white/25 focus:bg-white/[0.07] focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 outline-none" placeholder="Enter your password" autoComplete="new-password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-emerald-400 transition-colors cursor-pointer" title={showPassword ? 'Hide' : 'Show'}>
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className="relative">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                      <div className="w-[18px] h-[18px] rounded-lg border border-white/15 bg-white/[0.04] peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-white/40 group-hover:text-white/60 transition-colors">Remember me</span>
                  </label>
                  <button type="button" onClick={() => { setShowForgotPasswordModal(true); setForgotEmail(''); setForgotSent(false); setForgotError(''); }} className="text-[11px] font-medium text-emerald-400/70 hover:text-emerald-300 transition-colors cursor-pointer">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 text-[12px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/15 px-4 py-3 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-4 py-3 rounded-xl leading-relaxed">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                    {successMessage}
                  </div>
                )}

                <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 cursor-pointer overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="absolute inset-0 bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-center gap-2.5">
                    {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                    <span className="text-[13px] tracking-wide">{loading ? 'Signing in...' : 'Sign in'}</span>
                  </div>
                </button>

                <p className="text-center text-[12px] text-white/35 font-medium">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                    Create one
                  </Link>
                </p>

                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <div className="w-8 h-px bg-white/[0.06]"></div>
                  <p className="text-[8px] text-white/20 font-bold tracking-[0.2em] uppercase">ISUFST CICT Capstone</p>
                  <div className="w-8 h-px bg-white/[0.06]"></div>
                </div>
              </form>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent"></div>
          </div>
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
