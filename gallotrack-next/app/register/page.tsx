'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, fullNameFromMetadata } from '@/lib/registry';
import { Dna, BarChart3, Building2, ShieldCheck } from 'lucide-react';

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
  check: <path d="M20 6 9 17l-5-5" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
};

function FieldIcon({ which }: { which: keyof typeof ICONS }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-success pointer-events-none">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[which]}
      </svg>
    </span>
  );
}

const STEPS = [
  { id: 1, label: 'Personal', icon: 'user' as const },
  { id: 2, label: 'Farm', icon: 'home' as const },
  { id: 3, label: 'Account', icon: 'lock' as const },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

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
  const [systemBlocked, setSystemBlocked] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/system-settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.allow_registrations === false) {
          setSystemBlocked(true);
          setError('New registrations are currently disabled by the administrator.');
        }
        if (s.system_status === 'Maintenance') {
          setMaintenanceMsg(s.maintenance_message || 'System is currently under maintenance. Registration may be unavailable.');
        }
      })
      .catch(() => {});
  }, []);

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First Name and Last Name are required.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!farmName.trim()) {
      setError('Farm / Yard Name is required.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 3) {
        handleRegister(e as unknown as React.FormEvent);
      } else {
        handleNext();
      }
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateStep3()) return;

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
    "w-full p-3 border border-input-border rounded-md text-sm bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-foreground placeholder:text-muted-foreground";
  const inputIcon = `${inputBase} pl-9`;
  const labelClass = "block text-xs font-black text-muted-foreground mb-2 uppercase tracking-widest";

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* LEFT PANEL — Branding. Mirrors the login page so the two entry points read as one product. */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern id="grid-reg" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-reg)" />
          </svg>
        </div>
        <div className="absolute top-0 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z"/></svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-white tracking-tight">GALLO<span className="text-emerald-200">TRACK</span></p>
              <span className="text-xs font-mono font-medium text-emerald-200/70 tracking-widest uppercase block">v1.0.0</span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-200/80 uppercase">ISUFST CICT Capstone Project</p>
              <h1 className="text-4xl xl:text-5xl font-semibold text-white leading-[1.1] tracking-tight">
                Set up your<br />
                <span className="text-emerald-200">farm</span><br />
                in three steps
              </h1>
              <p className="text-sm text-emerald-100/80 font-medium max-w-md leading-relaxed">
                Create your farm owner account to manage lineage, match performance and flock records in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {[
                { icon: Dna, title: 'Lineage Tracking', desc: 'Map ancestry to the source' },
                { icon: BarChart3, title: 'Match Analytics', desc: 'Win rates and trends' },
                { icon: Building2, title: 'Farm Profile', desc: 'Your farm, your records' },
                { icon: ShieldCheck, title: 'Private by Default', desc: 'Your data stays yours' },
              ].map((f) => (
                <div key={f.title} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-md p-3.5 space-y-1.5">
                  <f.icon className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-emerald-200/70 font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-emerald-200/70 font-medium">
            Already registered?{' '}
            <Link href="/" className="text-emerald-100 underline underline-offset-2 decoration-emerald-200/50 hover:decoration-emerald-100 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Registration form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-teal-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="bg-card rounded-lg shadow-xl border border-border max-w-md w-full relative z-10 my-4">
          <div className="p-6 sm:p-8 space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 lg:hidden">
              <div className="w-9 h-9 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true"><path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z"/></svg>
              </div>
              <p className="text-base font-semibold text-card-foreground tracking-tight">GALLO<span className="text-accent">TRACK</span></p>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold text-card-foreground tracking-tight leading-tight">Farm Owner Registration</h1>
              <p className="text-sm text-muted-foreground">Create your account to manage lineage, analytics and flock records.</p>
            </div>
          </div>

          {maintenanceMsg && (
            <div className="text-sm text-amber-700 dark:text-amber-300 font-bold text-center bg-amber-500/10 border border-amber-500/30 p-3 rounded-md">{maintenanceMsg}</div>
          )}

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-black transition-all duration-300 ${
                      step > s.id
                        ? 'bg-emerald-500 text-white'
                        : step === s.id
                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-success'
                        : 'bg-muted border border-border text-muted-foreground'
                    }`}
                  >
                    {step > s.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{ICONS.check}</svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[s.icon]}</svg>
                    )}
                  </div>
                  <span className={`text-xs font-bold tracking-wider ${step === s.id ? 'text-success' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 rounded-full mb-5 transition-all duration-300 ${step > s.id ? 'bg-emerald-500' : 'bg-border'}`}></div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="text-sm text-danger light:text-danger font-bold text-center bg-rose-500/10 light:bg-rose-500/10 border border-rose-500/30 p-3 rounded-md">{error}</div>
          )}

          <form onSubmit={step === 3 ? handleRegister : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-4 animate-enter-right">
                <div className="bg-muted/25 border border-border rounded-lg p-4 sm:p-5 space-y-4">
                  <h2 className="text-xs font-black text-card-foreground uppercase tracking-widest border-b border-border pb-2.5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-sm bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs shrink-0">👤</span>
                    Personal Information
                  </h2>
                  <div>
                    <label className={labelClass} htmlFor="first-name">First Name <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="user" />
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} required id="first-name" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="middle-name">Middle Name <span className="text-muted-foreground/60">(Optional)</span></label>
                    <div className="relative">
                      <FieldIcon which="user" />
                      <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} id="middle-name" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="last-name">Last Name <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="user" />
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} required id="last-name" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Farm / Business Information */}
            {step === 2 && (
              <div className="space-y-4 animate-enter-right">
                <div className="bg-muted/25 border border-border rounded-lg p-4 sm:p-5 space-y-4">
                  <h2 className="text-xs font-black text-card-foreground uppercase tracking-widest border-b border-border pb-2.5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-sm bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs shrink-0">🏡</span>
                    Farm / Business Information
                  </h2>
                  <div>
                    <label className={labelClass} htmlFor="farm-yard-name">Farm / Yard Name <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="home" />
                      <input type="text" value={farmName} onChange={(e) => setFarmName(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} required id="farm-yard-name" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="contact-number">Contact Number</label>
                    <div className="relative">
                      <FieldIcon which="phone" />
                      <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} id="contact-number" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Account Security */}
            {step === 3 && (
              <div className="space-y-4 animate-enter-right">
                <div className="bg-muted/25 border border-border rounded-lg p-4 sm:p-5 space-y-4">
                  <h2 className="text-xs font-black text-card-foreground uppercase tracking-widest border-b border-border pb-2.5 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-sm bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs shrink-0">🔒</span>
                    Account Security
                  </h2>
                  <div>
                    <label className={labelClass} htmlFor="email-address">Email Address <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="mail" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} autoComplete="off" required id="email-address" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="password">Password <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="lock" />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} className={`${inputIcon} pr-11`} autoComplete="new-password" required id="password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-success p-1 rounded-sm transition-colors cursor-pointer">
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="confirm-password">Confirm Password <span className="text-danger">*</span></label>
                    <div className="relative">
                      <FieldIcon which="lock" />
                      <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={handleKeyDown} className={inputIcon} autoComplete="new-password" required id="confirm-password" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-card-foreground text-sm font-bold transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS.chevronLeft}</svg>
                  Back
                </button>
              )}
              <button
                type={step === 3 ? 'submit' : 'button'}
                onClick={step < 3 ? handleNext : undefined}
                disabled={loading || systemBlocked}
                className="group flex-1 relative bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-white font-black py-3.5 rounded-md transition-all duration-200 shadow-lg shadow-emerald-500/30 cursor-pointer overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : step < 3 ? (
                    <>
                      <span className="text-sm tracking-widest">NEXT</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS.chevronRight}</svg>
                    </>
                  ) : (
                    <>
                      <span className="text-sm tracking-widest">{loading ? 'Creating Account...' : 'REGISTER'}</span>
                      {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>}
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="pt-1">
              <Link href="/" className="text-xs font-bold text-muted-foreground hover:text-success transition-colors tracking-wide cursor-pointer underline underline-offset-2 decoration-muted-foreground/50 hover:decoration-emerald-400 w-full text-center block">
                Already have an account? Log In
              </Link>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
