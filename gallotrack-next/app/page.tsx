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
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-[#0a0f0d]">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[160px] animate-pulse"></div>
        <div className="absolute top-1/2 -right-40 w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
          </svg>
        </div>
      </div>

      {/* Main glass card */}
      <div className="relative z-10 w-full max-w-[460px]">
        {/* Outer glow */}
        <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 via-transparent to-teal-500/20 rounded-[2rem] blur-xl opacity-50"></div>

        <div className="relative bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-[2rem] shadow-2xl shadow-black/40 overflow-hidden">
          {/* Top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"></div>

          <div className="p-8 sm:p-10 space-y-8">
            {/* Logo & Title */}
            <div className="text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg"></div>
                <div className="relative w-16 h-16 bg-white/[0.08] backdrop-blur-sm border border-white/[0.12] rounded-2xl flex items-center justify-center text-3xl">
                  🐓
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold tracking-[0.3em] text-emerald-400/70 uppercase">ISUFST CICT Capstone</span>
                <h1 className="text-3xl font-black text-white tracking-tight">GALLOTRACK</h1>
                <p className="text-[11px] text-white/40 font-medium">Advanced Gamefowl Analytics</p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]"></div>
              <span className="text-[10px] font-semibold text-white/30 tracking-widest uppercase">Sign In</span>
              <div className="flex-1 h-px bg-white/[0.06]"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-white/50 tracking-wide">Email address</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </span>
                  <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 outline-none" placeholder="you@example.com" autoComplete="off" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-white/50 tracking-wide">Password</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-emerald-400 transition-colors pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[13px] text-white placeholder:text-white/30 focus:bg-white/[0.08] focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 outline-none" placeholder="Enter your password" autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-emerald-400 transition-colors cursor-pointer" title={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                  <div className="relative">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only peer" />
                    <div className="w-[18px] h-[18px] rounded-lg border border-white/20 bg-white/[0.05] peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors">Remember me</span>
                </label>
                <button type="button" onClick={() => { setShowForgotPasswordModal(true); setForgotEmail(''); setForgotSent(false); setForgotError(''); }} className="text-[11px] font-medium text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-pointer">
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 text-[12px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl leading-relaxed">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                  {successMessage}
                </div>
              )}

              <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed">
                <div className="absolute inset-0 bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-2.5">
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span className="text-[13px] tracking-wide">{loading ? 'Signing in...' : 'Sign in'}</span>
                </div>
              </button>

              <p className="text-center text-[12px] text-white/40 font-medium">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Create one
                </Link>
              </p>
            </form>
          </div>

          {/* Bottom accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"></div>
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
