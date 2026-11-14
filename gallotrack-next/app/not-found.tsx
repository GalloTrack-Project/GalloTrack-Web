'use client';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { CompactLanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import Logo from '@/components/brand/Logo';

export default function NotFound() {
  const { t } = useT();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6 relative">
      <div className="absolute top-4 right-4">
        <CompactLanguageSwitcher />
      </div>
      <title>{`${t('errors.notFoundTitle')} | GalloTrack`}</title>
      <div className="max-w-md w-full text-center space-y-6">
        <Logo variant="mark" size="lg" className="mx-auto" />
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-muted-foreground">{t('errors.notFoundTitle')}</h2>
          <p className="text-sm text-muted-foreground/70">
            {t('errors.notFoundDesc')}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-md text-sm transition-all shadow-lg shadow-emerald-500/30"
        >
          {t('errors.backHome')}
        </Link>
      </div>
    </div>
  );
}
