'use client';
import React from 'react';
import { LogOut } from 'lucide-react';

type LogoutModalProps = {
  showLogoutModal: boolean;
  setShowLogoutModal: (v: boolean) => void;
  handleLogout: () => void;
};

export default function LogoutModal({
  showLogoutModal,
  setShowLogoutModal,
  handleLogout,
}: LogoutModalProps) {
  if (!showLogoutModal) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-card rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm"><LogOut className="w-5 h-5 text-white" /></div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white">Log Out Confirmation</h3>
                <p className="text-[9px] text-emerald-100/70 font-bold tracking-[0.15em] uppercase mt-0.5">Secure Session Termination</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 text-white/70 hover:text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-lg shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </div>
            <div>
              <p className="text-sm text-card-foreground font-extrabold leading-relaxed tracking-tight">
                Are you sure you want to log out?
              </p>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-1">
                Your active session and local tokens will be securely terminated. You will need to sign in again to access your farm dashboard.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] border border-border"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setShowLogoutModal(false); handleLogout(); }}
              className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-rose-500/25"
            >
              Yes, Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
