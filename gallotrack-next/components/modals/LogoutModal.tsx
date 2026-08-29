'use client';
import React from 'react';

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
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[22px] max-w-sm w-full overflow-hidden shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/80">
        <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-base shrink-0 shadow-inner">🚪</div>
              <div>
                <h3 className="text-sm font-black tracking-tight text-white">Log Out Confirmation</h3>
                <p className="text-[10px] text-emerald-200/70 font-bold tracking-wider uppercase mt-0.5">Secure Session Termination</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-lg shrink-0">🚪</div>
            <div>
              <p className="text-sm text-slate-800 font-extrabold leading-relaxed tracking-tight">
                Are you sure you want to log out?
              </p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                Your active session and local tokens will be securely terminated. You will need to sign in again to access the cluster.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setShowLogoutModal(false); handleLogout(); }}
              className="flex-1 bg-slate-900 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/20"
            >
              Yes, Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
