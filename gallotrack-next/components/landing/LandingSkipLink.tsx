'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';

export default function LandingSkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  const t = useT();

  return (
    <Link
      href={`#${targetId}`}
      className="bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background sr-only rounded-md px-4 py-3 text-sm font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {t('landing.skipToContent')}
    </Link>
  );
}
