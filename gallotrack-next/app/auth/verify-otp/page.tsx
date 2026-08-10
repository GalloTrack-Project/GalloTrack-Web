'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase, ensureOwnerRecords } from '@/lib/registry';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <VerifyOtpCard />
    </Suspense>
  );
}

function VerifyOtpCard() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!/^\d{6,10}$/.test(token.trim())) {
      setError('Please enter the verification code sent to your Gmail (6 to 10 digits).');
      return;
    }

    setLoading(true);
    try {
      // The numeric code entered here is the exact OTP token issued by
      // Supabase for the signup confirmation. It must be verified verbatim -
      // truncating it would produce an invalid-token error, because Supabase
      // validates the full token against the stored hash server-side. Its
      // length is controlled by Supabase's MAILER_OTP_LENGTH (6, 8 or 10).
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup',
      });

      if (verifyError) {
        setStatus('error');
        setError(verifyError.message);
        return;
      }

      // Persist owner profile + farm rows from the signup metadata, then drop
      // the session so the user must log in manually via the Login page.
      await ensureOwnerRecords(supabase, data.user);
      await supabase.auth.signOut();
      try { localStorage.removeItem('gallotrack_user_id'); } catch { /* ignore */ }
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('System Error: Unable to verify your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Please enter your registered email address first.');
      return;
    }
    setResending(true);
    setError('');
    setResendNotice('');
    try {
      // Re-issue the signup confirmation email, which carries a fresh
      // numeric OTP code (only the latest token is valid).
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setResendNotice('A new verification code has been sent to your Gmail. Check your inbox (and spam folder) — the previous code is no longer valid.');
        setStatus('verifying');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const inputClass = "w-full p-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground";
  const labelClass = "block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest";

  return (
    <div className="flex items-center justify-center min-h-screen w-full p-6 bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] light:from-emerald-50 light:via-slate-50 light:to-teal-50 overflow-hidden relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wireframe-otp" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3" />
            <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wireframe-otp)" />
      </svg>
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 max-w-md w-full relative z-10 overflow-hidden border border-border">
        <div className="p-8 sm:p-10 space-y-6 text-center">
          <div className="text-center space-y-2">
            <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/90 uppercase block">ISUFST CICT Capstone Project</span>
            <h1 className="text-3xl sm:text-4xl font-black text-card-foreground tracking-tight leading-none">GALLOTRACK</h1>
            <p className="text-[10px] text-muted-foreground font-semibold">Advanced Gamefowl Lineage Analytics &amp; Structural Trace Registry</p>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>

          {status === 'success' && (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight">Farm Owner Verified! 🎉</h2>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Your account is now active and your farm profile has been linked to your inventory. You can now sign in.
              </p>
              <Link
                href="/"
                className="inline-block w-full bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/50 cursor-pointer mt-2"
              >
                <span className="text-sm tracking-widest">PROCEED TO LOGIN</span>
              </Link>
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <h2 className="text-base font-black text-card-foreground tracking-tight">Email Verification</h2>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                  Enter the <strong className="text-emerald-400 font-black">verification code</strong> sent to your Gmail address to activate your farm owner account.
                </p>
              </div>

              <div>
                <label className={labelClass}>Registered Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="owner@gmail.com" required />
              </div>

              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full py-3.5 border border-input rounded-xl text-center text-lg font-black tracking-[0.5em] bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none text-foreground placeholder:text-muted-foreground placeholder:tracking-widest placeholder:font-normal"
                  placeholder="—— ——"
                  required
                />
                <p className="text-[9px] text-muted-foreground font-mono font-semibold mt-1.5">Check your Gmail inbox (and spam folder) for the code.</p>
              </div>

              {error && <div className="text-xs text-rose-300 font-bold text-center bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">{error}</div>}

              {resendNotice && (
                <div className="text-xs text-emerald-300 font-bold text-center bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl leading-relaxed">{resendNotice}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.99] text-white font-black py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-950/50 cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                  <span className="tracking-widest">{loading ? 'Verifying Code...' : 'VERIFY CODE'}</span>
                </span>
              </button>

              <div className="flex items-center justify-between text-[10px] font-bold pt-1">
                <button type="button" onClick={handleResend} disabled={resending} className="text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400 disabled:opacity-50">
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
                <Link href="/" className="text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}