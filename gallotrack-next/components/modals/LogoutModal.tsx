'use client';
import React from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '@/components/ui';
import { useT } from '@/lib/i18n';

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
  const { t } = useT();
  if (!showLogoutModal) return null;

  return (
    <Modal
      open
      onClose={() => setShowLogoutModal(false)}
      title={t('nav.logoutConfirmTitle')}
      description={t('nav.logoutConfirmBody')}
      icon={<LogOut className="h-5 w-5" />}
      iconClassName="border-danger/25 bg-danger/10 text-danger"
      className="max-w-sm"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowLogoutModal(false)}
          className="border-border bg-muted text-card-foreground hover:bg-muted/80 focus-visible:ring-ring flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border px-5 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowLogoutModal(false);
            handleLogout();
          }}
          className="bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-ring flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {t('nav.logout')}
        </button>
      </div>
    </Modal>
  );
}
