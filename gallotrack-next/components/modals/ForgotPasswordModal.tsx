'use client';
import React from 'react';

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
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[22px] max-w-sm w-full overflow-hidden shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/80">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-base shrink-0 shadow-inner">🔑</div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white">Reset Your Password</h3>
                <p className="text-[10px] text-emerald-200/70 font-bold tracking-wider uppercase mt-0.5">Secure Recovery Link</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">
          {forgotSent ? (
            <div className="flex flex-col items-center text-center space-y-3 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></svg>
              </div>
              <p className="text-sm font-extrabold text-slate-800 tracking-tight">Check your inbox</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                A secure password reset link has been sent to <strong className="text-slate-600">{forgotEmail.trim()}</strong>. Follow the instructions in the email to set a new password.
              </p>
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="w-full mt-2 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-lg shrink-0">✉️</div>
                <div>
                  <p className="text-sm text-slate-800 font-extrabold leading-relaxed tracking-tight">Enter your registered email</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                    We will send you a secure link to reset your GalloTrack password.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-3 border border-slate-200/90 rounded-xl text-xs bg-slate-50/50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-semibold"
                  placeholder="you@example.com"
                  required
                />
              </div>
              {forgotError && (
                <div className="text-[11px] text-rose-600 font-bold text-center bg-rose-50 border border-rose-200/60 p-3 rounded-xl">{forgotError}</div>
              )}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
