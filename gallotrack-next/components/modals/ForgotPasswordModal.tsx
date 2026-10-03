'use client';
import React from 'react';
import { Key, Mail } from 'lucide-react';
import { Modal } from '@/components/ui';

type ForgotPasswordModalProps = {
  showForgotPasswordModal: boolean;
  setShowForgotPasswordModal: (v: boolean) => void;
  handleSendResetLink: (e: React.FormEvent) => void;
  forgotEmail: string;
  setForgotEmail: (v: string) => void;
  forgotLoading: boolean;
  forgotSent: boolean;
  forgotError: string;
};

export default function ForgotPasswordModal({
  showForgotPasswordModal,
  setShowForgotPasswordModal,
  handleSendResetLink,
  forgotEmail,
  setForgotEmail,
  forgotLoading,
  forgotSent,
  forgotError,
}: ForgotPasswordModalProps) {
  if (!showForgotPasswordModal) return null;

  return (
    <Modal
      open
      onClose={() => setShowForgotPasswordModal(false)}
      title="Reset Your Password"
      description="Secure recovery link"
      icon={<Key className="w-5 h-5" />}
      iconClassName="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-success dark:text-emerald-400"
      className="max-w-sm"
    >
      {forgotSent ? (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-muted/50 border border-emerald-200 dark:border-border flex items-center justify-center text-success dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4Z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-card-foreground">
            Check your inbox
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A secure password reset link has been sent to{' '}
            <strong className="text-slate-600 dark:text-card-foreground">
              {forgotEmail.trim()}
            </strong>
            . Follow the instructions in the email to set a new password.
          </p>
          <button
            type="button"
            onClick={() => setShowForgotPasswordModal(false)}
            className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3 rounded-sm text-sm transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendResetLink} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-sm bg-emerald-50 dark:bg-muted/50 border border-emerald-200/80 dark:border-border flex items-center justify-center shrink-0 text-success dark:text-emerald-400">
              <Mail className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-slate-800 dark:text-card-foreground font-semibold leading-relaxed">
                Enter your registered email
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                We will send you a secure link to reset your GalloTrack password.
              </p>
            </div>
          </div>
          <div>
            <label
              htmlFor="email-address"
              className="block text-sm font-semibold text-muted-foreground mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email-address"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className="w-full p-3 border border-input-border rounded-sm text-sm bg-slate-50/50 dark:bg-muted/50 focus:bg-white dark:focus:bg-input focus:border-emerald-500 transition-colors font-semibold"
              placeholder="you@example.com"
              required
            />
          </div>
          {forgotError && (
            <div
              role="alert"
              className="text-sm text-danger font-semibold text-center bg-rose-50 dark:bg-muted/50 border border-rose-200/60 dark:border-border p-3 rounded-sm"
            >
              {forgotError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(false)}
              className="flex-1 bg-slate-100 dark:bg-muted hover:bg-slate-200 text-slate-700 dark:text-card-foreground font-semibold px-5 py-3 rounded-sm text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotLoading}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3 rounded-sm text-sm transition-colors cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
