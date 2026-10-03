'use client';
import React from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '@/components/ui';

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
    <Modal
      open
      onClose={() => setShowLogoutModal(false)}
      title="Log Out Confirmation"
      description="Secure session termination"
      icon={<LogOut className="w-5 h-5" />}
      iconClassName="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-success dark:text-emerald-400"
      className="max-w-sm"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-sm bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 text-success dark:text-emerald-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-card-foreground font-semibold leading-relaxed">
            Are you sure you want to log out?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            Your active session and local tokens will be securely terminated. You will need to sign
            in again to access your farm dashboard.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={() => setShowLogoutModal(false)}
          className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground font-semibold px-5 py-3 rounded-sm text-sm transition-colors cursor-pointer border border-border"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            setShowLogoutModal(false);
            handleLogout();
          }}
          className="flex-1 bg-danger hover:bg-danger/90 text-danger-foreground font-semibold px-5 py-3 rounded-sm text-sm transition-colors cursor-pointer shadow-md"
        >
          Yes, Log Out
        </button>
      </div>
    </Modal>
  );
}
