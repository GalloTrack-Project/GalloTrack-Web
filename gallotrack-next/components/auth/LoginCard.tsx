'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, LogIn, Mail, ShieldCheck, UserRound } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { useT } from '@/lib/i18n';
import type { LoginCredentials } from '@/lib/contexts/auth-context';
import PasswordInput from './PasswordInput';

type LoginCardProps = {
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  loading: boolean;
  error: string;
  successMessage: string;
  rememberMe: boolean;
  maintenanceMsg: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
};

export default function LoginCard({
  onLogin,
  loading,
  error,
  successMessage,
  rememberMe,
  maintenanceMsg,
  showPassword,
  onTogglePassword,
  onForgotPassword,
}: LoginCardProps) {
  const t = useT();
  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t('auth.emailRequired'))
      .email(t('auth.emailInvalid')),
    password: z
      .string()
      .min(1, t('auth.passwordRequired'))
      .min(8, t('auth.passwordMin')),
    rememberMe: z.boolean(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe,
    },
    mode: 'onSubmit',
  });

  const displayError =
    error && /incorrect|invalid email or password/i.test(error)
      ? t('auth.invalidCredentials')
      : error;
  const isBusy = loading || isSubmitting;

  return (
    <div className="auth-card-in border-border bg-card relative max-h-none w-full max-w-[540px] overflow-y-auto rounded-[28px] border p-6 shadow-2xl shadow-primary/15 sm:p-10 lg:max-h-[calc(100dvh-2rem)]">
      <div className="flex flex-col items-center text-center">
        <Logo variant="mark" size="xl" />
        <p className="text-foreground mt-1 text-4xl font-black tracking-tight sm:text-[2.75rem]">
          Gallo<span className="text-brand-red">Track</span>
        </p>
        <h2 className="text-foreground mt-5 text-2xl font-black tracking-tight break-words sm:text-[2.1rem]">
          {t('auth.loginTitle')}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm font-medium break-words">
          {t('auth.loginSubtitle')}
        </p>
      </div>

      {maintenanceMsg && (
        <div className="border-warning/30 bg-warning/10 text-warning mt-5 rounded-2xl border p-3 text-center text-sm font-bold">
          {maintenanceMsg}
        </div>
      )}

      <form onSubmit={handleSubmit((values) => onLogin(values))} className="mt-6 space-y-5" noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="text-foreground flex items-center gap-2 text-sm font-extrabold"
          >
            <Mail className="text-brand-red h-4 w-4 shrink-0" aria-hidden="true" />
            {t('auth.emailLabel')}
          </label>
          <div className="relative mt-2">
            <UserRound
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              {...register('email')}
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.emailPlaceholder')}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className="border-input-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/10 w-full rounded-full border py-3.5 pr-4 pl-11 text-sm font-semibold transition-all focus:ring-4 focus:outline-none"
            />
          </div>
          {errors.email && (
            <p
              id="login-email-error"
              role="alert"
              className="auth-error-shake text-danger mt-2 text-xs font-bold"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <PasswordInput
          {...register('password')}
          id="login-password"
          label={t('auth.passwordLabel')}
          placeholder={t('auth.passwordPlaceholder')}
          autoComplete="current-password"
          showPassword={showPassword}
          onToggleVisibility={onTogglePassword}
          error={errors.password?.message}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            htmlFor="remember-me-login"
            className="group flex cursor-pointer items-center gap-2.5 select-none"
          >
            <input
              {...register('rememberMe')}
              type="checkbox"
              id="remember-me-login"
              className="peer sr-only"
            />
            <span className="border-input-border bg-muted peer-checked:border-primary peer-checked:bg-primary flex h-5 w-5 items-center justify-center rounded-sm border transition-colors peer-checked:[&>svg]:opacity-100">
              <svg
                className="text-primary-foreground h-3 w-3 opacity-0 transition-opacity"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="text-muted-foreground group-hover:text-foreground text-sm font-semibold transition-colors">
              {t('auth.rememberMe')}
            </span>
          </label>

          <button
            type="button"
            onClick={onForgotPassword}
            className="text-brand-red hover:text-sidebar-active focus-visible:ring-ring rounded-sm text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {t('auth.forgotPassword')}
          </button>
        </div>

        {displayError && (
          <div
            role="alert"
            className="auth-error-shake border-danger/20 bg-danger/10 text-danger rounded-2xl border p-3.5 text-center text-sm font-bold"
          >
            {displayError}
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="border-success/20 bg-success/10 text-success rounded-2xl border p-3.5 text-center text-sm font-bold"
          >
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="from-sidebar to-sidebar-active focus-visible:ring-ring focus-visible:ring-offset-card relative inline-flex min-h-[58px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r px-6 text-base font-black text-white shadow-lg shadow-primary/25 transition-all duration-[250ms] hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="bg-brand-gold/70 absolute inset-x-10 bottom-1.5 h-0.5 rounded-full"
          />
          {isBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <LogIn className="h-5 w-5" aria-hidden="true" />
          )}
          <span>{isBusy ? t('auth.signingIn') : t('auth.signInButton')}</span>
        </button>
      </form>

      <p className="text-muted-foreground mt-5 text-center text-sm font-medium">
        {t('auth.noAccountPrompt')}{' '}
        <Link
          href="/register"
          className="text-brand-red hover:text-sidebar-active font-bold transition-colors"
        >
          {t('auth.signUpLink')}
        </Link>
      </p>

      <div className="mt-5 flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-[10px] font-black tracking-[0.2em] uppercase">
          {t('auth.or')}
        </span>
        <span className="bg-border h-px flex-1" />
      </div>

      <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold">
        <ShieldCheck className="text-success h-4 w-4 shrink-0" aria-hidden="true" />
        {t('landing.footerCapstone')}
      </p>
    </div>
  );
}
