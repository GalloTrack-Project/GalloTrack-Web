'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, fullNameFromMetadata } from '@/lib/registry';

const ICONS = {
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
};

function FieldIcon({ which }: { which: keyof typeof ICONS }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[which]}
      </svg>
    </span>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-[10px] font-black text-card-foreground uppercase tracking-widest border-b border-border pb-2.5 flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[11px] shrink-0">{icon}</span>
      {title}
    </h2>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First Name and Last Name are required.');
      return;
    }
    if (!farmName.trim()) {
      setError('Farm / Yard Name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address (e.g., owner@gmail.com).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      const fullName = fullNameFromMetadata({ first_name: firstName.trim(), middle_name: middleName.trim(), last_name: lastName.trim() });

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            middle_name: middleName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            farm_name: farmName.trim(),
            contact_number: contactNumber.trim(),
          },
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/confirm' : undefined,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      router.push(`/auth/verify-otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      console.error(err);
      setError('System Error: Unable to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full p-3 border border-input rounded-xl text-xs bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold outline-none text-foreground placeholder:text-muted-foreground";
  const inputIcon = `${inputBase} pl-9`;
  const labelClass = "block text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest";

  return (
    <div className="flex items-start justify-center min-h-screen w-full p-4 sm:p-6 bg-gradient-to-br from-[#0a1f1a] via-[#0d2b23] to-[#0a3328] light:from-emerald-50 light:via-slate-50 light:to-teal-50 overflow-hidden relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="wireframe-reg" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 60 0 L 60 60 L 0 60 Z" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            <path d="M 30 0 L 30 60 M 0 30 L 60 30" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2 3" />
            <circle cx="30" cy="30" r="3" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wireframe-reg)" />
      </svg>
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 max-w-lg w-full relative z-10 overflow-hidden border border-border my-4">
        <div className="p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto">
          <div className="text-center space-y-2">
            <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/90 uppercase block">ISUFST CICT Capstone Project</span>
            <h1 className="text-2xl sm:text-3xl font-black text-card-foreground tracking-tight leading-none">GALLOTRACK</h1>
            <h1 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight leading-tight">FARM OWNER REGISTRATION</h1>
            <p className="text-[10px] text-muted-foreground font-semibold">Create your farm owner account to manage lineage &amp; analytics</p>
            <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full mx-auto"></div>
          </div>

          {error && (
            <div className="text-xs text-rose-300 light:text-rose-600 font-bold text-center bg-rose-500/10 light:bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">{error}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* PERSONAL INFORMATION */}
            <div className="bg-muted/25 border border-border rounded-2xl p-4 sm:p-5 space-y-4">
              <SectionTitle icon={<>👤</>} title="Personal Information" />
              <div>
                <label className={labelClass}>First Name <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="user" />
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputIcon} placeholder="e.g., Juan" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Middle Name <span className="text-muted-foreground/60">(Optional)</span></label>
                <div className="relative">
                  <FieldIcon which="user" />
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputIcon} placeholder="e.g., Santos" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Last Name <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="user" />
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputIcon} placeholder="e.g., Dela Cruz" required />
                </div>
              </div>
            </div>

            {/* FARM / BUSINESS INFORMATION */}
            <div className="bg-muted/25 border border-border rounded-2xl p-4 sm:p-5 space-y-4">
              <SectionTitle icon={<>🏡</>} title="Farm / Business Information" />
              <div>
                <label className={labelClass}>Farm / Yard Name <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="home" />
                  <input type="text" value={farmName} onChange={(e) => setFarmName(e.target.value)} className={inputIcon} placeholder="e.g., Dela Cruz Fighting Stables" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>Contact Number</label>
                <div className="relative">
                  <FieldIcon which="phone" />
                  <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className={inputIcon} placeholder="e.g., 0917 123 4567" />
                </div>
              </div>
            </div>

            {/* ACCOUNT SECURITY */}
            <div className="bg-muted/25 border border-border rounded-2xl p-4 sm:p-5 space-y-4">
              <SectionTitle icon={<>🔒</>} title="Account Security" />
              <div>
                <label className={labelClass}>Email Address <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="mail" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputIcon} placeholder="owner@gmail.com" required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest pointer-events-none">Gmail</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Password <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="lock" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputIcon} pr-11`} placeholder="Minimum 6 characters" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-emerald-400 p-1 rounded-lg transition-colors cursor-pointer">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm Password <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <FieldIcon which="lock" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputIcon} placeholder="Re-enter your password" required />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-4 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/30 cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center justify-center gap-3">
                {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                <span className="text-sm tracking-widest">{loading ? 'Creating Farm Owner...' : 'REGISTER FARM OWNER'}</span>
                {!loading && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                )}
              </span>
            </button>

            <div className="pt-1">
              <Link href="/" className="text-[10px] font-bold text-muted-foreground hover:text-emerald-400 transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400 w-full text-center block">
                Already have an account? Log In
              </Link>
              <p className="text-[9px] text-muted-foreground font-semibold text-center tracking-wide mt-4 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" /></svg>
                Powered by Advanced Gamefowl Analytics
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}