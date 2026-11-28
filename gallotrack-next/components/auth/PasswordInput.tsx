'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string;
  label: string;
  error?: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { id, label, error, showPassword, onToggleVisibility, ...inputProps },
  ref,
) {
  const t = useT();
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="text-foreground flex items-center gap-2 text-sm font-extrabold"
      >
        <Lock className="text-brand-red h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </label>
      <div className="relative mt-2">
        <KeyRound
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          {...inputProps}
          ref={ref}
          id={id}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="border-input-border bg-muted/60 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/10 w-full rounded-full border py-3.5 pr-14 pl-11 text-sm font-semibold transition-all focus:ring-4 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          className="text-muted-foreground hover:text-brand-red focus-visible:ring-ring focus-visible:ring-offset-card absolute top-1/2 right-1 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="auth-error-shake text-danger mt-2 text-xs font-bold">
          {error}
        </p>
      )}
    </div>
  );
});

export default PasswordInput;
