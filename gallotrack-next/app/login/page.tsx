'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGaloTrack } from '@/lib/context';
import ForgotPasswordModal from '@/components/modals/ForgotPasswordModal';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';
import { useT } from '@/lib/i18n';
import LandingSkipLink from '@/components/landing/LandingSkipLink';
import LandingThemeScope from '@/components/landing/LandingThemeScope';
import AuthLayout from '@/components/auth/AuthLayout';
import BrandingPanel from '@/components/auth/BrandingPanel';
import LoginCard from '@/components/auth/LoginCard';
import type { LoginCredentials } from '@/lib/contexts/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const store = useGaloTrack();
  const {
    currentUserId,
    handleLogin,
    loading,
    error,
    showPassword,
    setShowPassword,
    rememberMe,
    successMessage,
    showForgotPasswordModal,
    setShowForgotPasswordModal,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    setForgotSent,
    forgotError,
    setForgotError,
    forgotLoading,
    handleSendResetLink,
  } = store;

  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    document.title = `${t('auth.loginTitle')} | GalloTrack`;
  }, [t]);

  useEffect(() => {
    fetch('/api/admin/system-settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.system_status === 'Maintenance') {
          setMaintenanceMsg(
            s.maintenance_message ||
              'System is currently under maintenance. Some features may be unavailable.',
          );
        }
      })
      .catch(() => {});
  }, []);

  const rawRedirect =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirect')
      : null;
  const safeRedirect = sanitizeRedirectPath(rawRedirect, '/dashboard');

  useEffect(() => {
    if (currentUserId) {
      router.push(safeRedirect);
    }
  }, [currentUserId, router, safeRedirect]);

  if (currentUserId) return null;

  const openForgotPassword = () => {
    setShowForgotPasswordModal(true);
    setForgotEmail('');
    setForgotSent(false);
    setForgotError('');
  };

  const handleCredentials = async (credentials: LoginCredentials) => {
    await handleLogin(undefined, credentials);
  };

  return (
    <LandingThemeScope>
      <LandingSkipLink />
      <AuthLayout branding={<BrandingPanel />}>
        <LoginCard
          onLogin={handleCredentials}
          loading={loading}
          error={error}
          successMessage={successMessage}
          rememberMe={rememberMe}
          maintenanceMsg={maintenanceMsg}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onForgotPassword={openForgotPassword}
        />
      </AuthLayout>

      {showForgotPasswordModal && (
        <ForgotPasswordModal
          showForgotPasswordModal={showForgotPasswordModal}
          setShowForgotPasswordModal={setShowForgotPasswordModal}
          handleSendResetLink={handleSendResetLink}
          forgotEmail={forgotEmail}
          setForgotEmail={setForgotEmail}
          forgotLoading={forgotLoading}
          forgotSent={forgotSent}
          forgotError={forgotError}
        />
      )}
    </LandingThemeScope>
  );
}
