'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, fullNameFromMetadata } from '@/lib/registry';
import { Dna, BarChart3, Building2, ShieldCheck } from 'lucide-react';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useT } from '@/lib/i18n';

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
    <span className="text-success pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
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
  const { t } = useT();
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
    document.title = `${t('auth.registerTitle')} | GalloTrack`;
  }, [t]);

  useEffect(() => {
    fetch('/api/admin/system-settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.allow_registrations === false) {
          setSystemBlocked(true);
          setError('New registrations are currently disabled by the administrator.');
        }
        if (s.system_status === 'Maintenance') {
          setMaintenanceMsg(
            s.maintenance_message ||
              'System is currently under maintenance. Registration may be unavailable.',
          );
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
      const fullName = fullNameFromMetadata({
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
      });

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
    'w-full p-3 border border-input-border rounded-md text-sm bg-muted/60 focus:bg-muted focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-foreground placeholder:text-muted-foreground';
  const inputIcon = `${inputBase} pl-9`;
  const labelClass =
    'block text-xs font-black text-muted-foreground mb-2 uppercase tracking-widest';

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* LEFT PANEL — Branding. Mirrors the login page so the two entry points read as one product. */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 lg:flex lg:w-1/2">
        <div className="absolute inset-0 opacity-[0.07]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern id="grid-reg" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-reg)" />
          </svg>
        </div>
        <div className="absolute top-0 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"></div>

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm">
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
                aria-hidden="true"
              >
                <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight text-white">
                GALLO<span className="text-emerald-200">TRACK</span>
              </p>
              <span className="block font-mono text-xs font-medium tracking-widest text-emerald-200/70 uppercase">
                v1.0.0
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-200/80 uppercase">
                ISUFST CICI Capstone Project
              </p>
              <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-white xl:text-5xl">
                Set up your
                <br />
                <span className="text-emerald-200">farm</span>
                <br />
                in three steps
              </h1>
              <p className="max-w-md text-sm leading-relaxed font-medium text-emerald-100/80">
                Create your farm owner account to manage lineage, match performance and flock
                records in one place.
              </p>
            </div>

            <div className="grid max-w-lg grid-cols-2 gap-3">
              {[
                { icon: Dna, title: 'Lineage Tracking', desc: 'Map ancestry to the source' },
                { icon: BarChart3, title: 'Match Analytics', desc: 'Win rates and trends' },
                { icon: Building2, title: 'Farm Profile', desc: 'Your farm, your records' },
                { icon: ShieldCheck, title: 'Private by Default', desc: 'Your data stays yours' },
              ].map((f) => (
                <div
                  key={f.title}
                  className="space-y-1.5 rounded-md border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm"
                >
                  <f.icon className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs font-medium text-emerald-200/70">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs font-medium text-emerald-200/70">
            Already registered?{' '}
            <Link
              href="/login"
              className="text-emerald-100 underline decoration-emerald-200/50 underline-offset-2 transition-colors hover:decoration-emerald-100"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Registration form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl"></div>
        <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-400/5 blur-3xl"></div>

        <div className="bg-card border-border relative z-10 my-4 w-full max-w-md rounded-lg border shadow-xl">
          <div className="space-y-5 p-6 sm:p-8">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
                  <div className="bg-accent/15 border-accent/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent"
                      aria-hidden="true"
                    >
                      <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
                    </svg>
                  </div>
                  <p className="text-card-foreground hidden text-base font-semibold tracking-tight sm:inline">
                    GALLO<span className="text-accent">TRACK</span>
                  </p>
                </div>
                <CompactLanguageSwitcher />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-card-foreground text-2xl leading-tight font-semibold tracking-tight">
                  {t('auth.registerTitle')}
                </h1>
                <p className="text-muted-foreground text-sm">{t('auth.registerSubtitle')}</p>
              </div>
            </div>

            {maintenanceMsg && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm font-bold text-amber-700 dark:text-amber-300">
                {maintenanceMsg}
              </div>
            )}

            {/* Step Indicator */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 sm:gap-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex min-w-0 flex-col items-center gap-1.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-black transition-all duration-300 sm:h-10 sm:w-10 ${
                        step > s.id
                          ? 'bg-emerald-500 text-white'
                          : step === s.id
                            ? 'text-success border-2 border-emerald-500 bg-emerald-500/20'
                            : 'bg-muted border-border text-muted-foreground border'
                      }`}
                    >
                      {step > s.id ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {ICONS.check}
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
                          {ICONS[s.icon]}
                        </svg>
                      )}
                    </div>
                    <span
                      className={`max-w-[72px] text-center text-xs leading-tight font-bold tracking-wider break-words sm:max-w-none ${step === s.id ? 'text-success' : 'text-muted-foreground'}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mb-5 h-0.5 w-5 rounded-full transition-all duration-300 sm:w-12 ${step > s.id ? 'bg-emerald-500' : 'bg-border'}`}
                    ></div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="text-danger light:text-danger light:bg-rose-500/10 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-center text-sm font-bold">
                {error}
              </div>
            )}

            <form
              onSubmit={
                step === 3
                  ? handleRegister
                  : (e) => {
                      e.preventDefault();
                      handleNext();
                    }
              }
              className="space-y-4"
            >
              {/* Step 1: Personal Information */}
              {step === 1 && (
                <div className="animate-enter-right space-y-4">
                  <div className="bg-muted/25 border-border space-y-4 rounded-lg border p-4 sm:p-5">
                    <h2 className="text-card-foreground border-border flex items-center gap-2.5 border-b pb-2.5 text-xs font-black tracking-widest uppercase">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-emerald-500/30 bg-emerald-500/15 text-xs">
                        👤
                      </span>
                      Personal Information
                    </h2>
                    <div>
                      <label className={labelClass} htmlFor="first-name">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="user" />
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          required
                          id="first-name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="middle-name">
                        Middle Name <span className="text-muted-foreground/60">(Optional)</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="user" />
                        <input
                          type="text"
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          id="middle-name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="last-name">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="user" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          required
                          id="last-name"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Farm / Business Information */}
              {step === 2 && (
                <div className="animate-enter-right space-y-4">
                  <div className="bg-muted/25 border-border space-y-4 rounded-lg border p-4 sm:p-5">
                    <h2 className="text-card-foreground border-border flex items-center gap-2.5 border-b pb-2.5 text-xs font-black tracking-widest uppercase">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-emerald-500/30 bg-emerald-500/15 text-xs">
                        🏡
                      </span>
                      Farm / Business Information
                    </h2>
                    <div>
                      <label className={labelClass} htmlFor="farm-yard-name">
                        Farm / Yard Name <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="home" />
                        <input
                          type="text"
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          required
                          id="farm-yard-name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="contact-number">
                        Contact Number
                      </label>
                      <div className="relative">
                        <FieldIcon which="phone" />
                        <input
                          type="tel"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          id="contact-number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Account Security */}
              {step === 3 && (
                <div className="animate-enter-right space-y-4">
                  <div className="bg-muted/25 border-border space-y-4 rounded-lg border p-4 sm:p-5">
                    <h2 className="text-card-foreground border-border flex items-center gap-2.5 border-b pb-2.5 text-xs font-black tracking-widest uppercase">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-emerald-500/30 bg-emerald-500/15 text-xs">
                        🔒
                      </span>
                      Account Security
                    </h2>
                    <div>
                      <label className={labelClass} htmlFor="email-address">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="mail" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          autoComplete="off"
                          required
                          id="email-address"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="password">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="lock" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={`${inputIcon} pr-11`}
                          autoComplete="new-password"
                          required
                          id="password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-muted-foreground hover:text-success absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-sm p-1 transition-colors"
                        >
                          {showPassword ? (
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
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
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
                              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                              <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                              <line x1="2" x2="22" y1="2" y2="22" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="confirm-password">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <div className="relative">
                        <FieldIcon which="lock" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className={inputIcon}
                          autoComplete="new-password"
                          required
                          id="confirm-password"
                        />
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
                    className="border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-card-foreground flex cursor-pointer items-center justify-center gap-2 rounded-md border px-5 py-3.5 text-sm font-bold transition-all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {ICONS.chevronLeft}
                    </svg>
                    Back
                  </button>
                )}
                <button
                  type={step === 3 ? 'submit' : 'button'}
                  onClick={step < 3 ? handleNext : undefined}
                  disabled={loading || systemBlocked}
                  className="group relative flex-1 cursor-pointer overflow-hidden rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 py-3.5 font-black text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    {loading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    ) : step < 3 ? (
                      <>
                        <span className="text-sm tracking-widest">NEXT</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {ICONS.chevronRight}
                        </svg>
                      </>
                    ) : (
                      <>
                        <span className="text-sm tracking-widest">
                          {loading ? t('auth.signingUp') : t('auth.signUpButton')}
                        </span>
                        {!loading && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        )}
                      </>
                    )}
                  </span>
                </button>
              </div>

              <div className="pt-1">
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-success decoration-muted-foreground/50 block w-full cursor-pointer text-center text-xs font-bold tracking-wide underline underline-offset-2 transition-colors hover:decoration-emerald-400"
                >
                  {t('auth.haveAccountPrompt')} {t('auth.signInLink')}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
