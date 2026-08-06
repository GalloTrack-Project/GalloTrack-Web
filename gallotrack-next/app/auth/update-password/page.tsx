'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co';
const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Status = 'loading' | 'ready' | 'success' | 'error';

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdateCard />}>
      <UpdateCard />
    </Suspense>
  );
}

function UpdateCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('This link is invalid or has already been used.');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('This link is invalid or has already been used.');
        }

        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'This link is invalid or has already been used.');
      }
    })();
  }, [searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setFormError(error.message);
      } else {
        await supabase.auth.signOut();
        try { localStorage.removeItem('gallotrack_user_id'); } catch { /* ignore */ }
        setStatus('success');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] overflow-hidden relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wireframe-up" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3" />
            <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wireframe-up)" />
      </svg>
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 max-w-md w-full relative z-10 overflow-hidden border border-teal-500/20">
        <div className="p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[9px] font-bold tracking-[0.2em] text-teal-700 uppercase block">ISUFST CICT Capstone Project</span>
            <h1 className="text-3xl sm:text-4xl font-black text-teal-900 tracking-tight leading-none">GALLOTRACK</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent"></div>

          {status === 'loading' && (
            <div className="py-10 flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-teal-700 animate-spin"></div>
              <p className="text-sm font-bold text-teal-800 uppercase tracking-widest">Verifying recovery link…</p>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-black text-teal-900 tracking-tight">Set a New Password</h2>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Choose a secure password for your GalloTrack account.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none"
                    placeholder="Enter new password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer" title={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-teal-800 mb-2 uppercase tracking-widest">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3.5 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all font-semibold outline-none"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {formError && <div className="text-xs text-rose-600 font-bold text-center bg-rose-50 border border-rose-200/60 p-3.5 rounded-xl">{formError}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/30 cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span className="tracking-widest">{submitting ? 'Updating Password...' : 'UPDATE PASSWORD'}</span>
                </span>
              </button>
            </form>
          )}

          {status === 'success' && (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight text-center">Password Updated Successfully! 🎉</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed text-center">
                Your GalloTrack password has been changed. You can now sign in with your new password.
              </p>
              <Link
                href="/"
                className="inline-block w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/30 cursor-pointer mt-2 text-center"
              >
                <span className="text-sm tracking-widest">PROCEED TO LOGIN</span>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-rose-800 tracking-tight text-center">Recovery Link Invalid</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed text-center">{errorMessage}</p>
              <Link
                href="/"
                className="inline-block w-full bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-black/30 cursor-pointer mt-2 text-center"
              >
                <span className="text-sm tracking-widest">BACK TO LOGIN</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
