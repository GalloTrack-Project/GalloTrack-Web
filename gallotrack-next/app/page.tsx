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
    <div className="flex items-center justify-center min-h-screen w-full p-6 bg-background overflow-hidden relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wireframe" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
            <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3"/>
            <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wireframe)"/>
      </svg>
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-card rounded-3xl shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] shadow-black/40 max-w-md w-full relative z-10 overflow-hidden border border-emerald-500/20">
        <div className="p-8 sm:p-10 space-y-7">
          <div className="text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto">
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
            <span className="block text-[9px] font-black tracking-[0.25em] text-emerald-400/90 uppercase">ISUFST CICT CAPSTONE PROJECT</span>
            <h1 className="text-3xl sm:text-4xl font-black text-card-foreground tracking-tight leading-none">GALLOTRACK</h1>
            <p className="text-[10px] text-muted-foreground font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
            <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full mx-auto"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">EMAIL ADDRESS</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </span>
                <input type="email" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-3.5 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="Enter your email address" autoComplete="email" required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">PASSWORD</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-11 py-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground" placeholder="Enter system password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-400 p-1 rounded-lg transition-colors cursor-pointer" title={showPassword ? 'Hide password' : 'Show password'}>
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
            </div>

            {error && <div className="text-xs text-rose-300 font-bold text-center bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">{error}</div>}
            {successMessage && <div className="text-xs text-emerald-300 font-bold text-center bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl leading-relaxed">{successMessage}</div>}

            <button type="submit" disabled={loading} className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-center gap-3">
                <span className="text-sm tracking-widest">LOG IN</span>
                <span className="w-6 h-6 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
              </div>
            </button>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-center gap-4">
                <button type="button" onClick={() => { setShowForgotPasswordModal(true); setForgotEmail(''); setForgotSent(false); setForgotError(''); }} className="text-[10px] font-bold text-muted-foreground hover:text-emerald-400 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400">Forgot Password?</button>
                <span className="text-muted-foreground text-[8px]">|</span>
                <Link href="/register" className="text-[10px] font-bold text-muted-foreground hover:text-emerald-400 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400">Create Account</Link>
              </div>
              <p className="text-[9px] text-muted-foreground font-semibold text-center tracking-wide flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>
                Powered by Advanced Gamefowl Analytics
              </p>
            </div>
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
