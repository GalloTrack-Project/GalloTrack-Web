'use client';

import { useT } from '@/lib/i18n';
import RoosterHeadSilhouette from './RoosterHeadSilhouette';

export default function InfoCard({ className = '' }: { className?: string }) {
  const t = useT();

  return (
    <div
      className={`border-border bg-card relative overflow-hidden rounded-[20px] border p-6 shadow-xl shadow-primary/5 sm:p-8 ${className}`}
    >
      <RoosterHeadSilhouette className="text-brand-red/5 dark:text-brand-red/10 pointer-events-none absolute -right-10 -bottom-16 h-56 w-56 rotate-6" />
      <div className="relative z-10 space-y-4">
        <p className="text-muted-foreground text-sm leading-relaxed font-medium break-words sm:text-base">
          {t('landing.aboutNarrativeOne')}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed font-medium break-words sm:text-base">
          {t('landing.aboutNarrativeTwo')}
        </p>
      </div>
    </div>
  );
}
