'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mjvsbzayumcxmjcokwki.supabase.co';
const supabaseAnonKey = 'sb_publishable_MpufdSUihyXde5KmWAun_w_j0GSCTa3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type OtpType = 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite';
type Status = 'loading' | 'success' | 'error';

export default function ConfirmPage() {
  return (
    <Suspense fallback={<StatusCard status="loading" errorMessage="" />}>
      <ConfirmCard />
    </Suspense>
  );
}

function ConfirmCard() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('This link is invalid or has already been used.');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = (searchParams.get('type') as OtpType) || 'email';

        let confirmed = false;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          confirmed = true;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          confirmed = true;
        } else {
          const { data } = await supabase.auth.getSession();
          confirmed = !!data.session;
        }

        setStatus(confirmed ? 'success' : 'error');
        if (!confirmed) setErrorMessage('This link is invalid or has already been used.');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'This link is invalid or has already been used.');
      }
    })();
  }, [searchParams]);

  return <StatusCard status={status} errorMessage={errorMessage} />;
}

function StatusCard({ status, errorMessage }: { status: Status; errorMessage: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] overflow-hidden relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wireframe" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3" />
            <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wireframe)" />
      </svg>
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="antigravity-login-card bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 max-w-md w-full relative z-10 overflow-hidden border border-teal-500/20">
        <div className="p-8 sm:p-10 space-y-7 text-center">
          <div className="text-center space-y-2">
            <span className="text-[9px] font-bold tracking-[0.2em] text-teal-700 uppercase block">ISUFST CICT Capstone Project</span>
            <h1 className="text-3xl sm:text-4xl font-black text-teal-900 tracking-tight leading-none">GALLOTRACK</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent"></div>

          {status === 'loading' && (
            <div className="py-10 flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-teal-100 border-t-teal-700 animate-spin"></div>
              <p className="text-sm font-bold text-teal-800 uppercase tracking-widest">Verifying your email link…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-teal-900 tracking-tight">Email Confirmed Successfully! 🎉</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Your account is now verified. You can proceed to log in to GalloTrack.
              </p>
              <Link
                href="/"
                className="inline-block w-full bg-gradient-to-br from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/30 cursor-pointer mt-2"
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
              <h2 className="text-2xl sm:text-3xl font-black text-rose-800 tracking-tight">Confirmation Link Invalid</h2>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">{errorMessage}</p>
              <Link
                href="/"
                className="inline-block w-full bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-black/30 cursor-pointer mt-2"
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
