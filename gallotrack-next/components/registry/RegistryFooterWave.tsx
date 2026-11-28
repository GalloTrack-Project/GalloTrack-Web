'use client';

import ChickenIcon from '@/components/ChickenIcon';
import { useT } from '@/lib/i18n';

export default function RegistryFooterWave() {
  const t = useT();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mt-8 hidden h-24 overflow-hidden rounded-t-[28px] sm:block"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-24 w-full"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 64C168 40 326 50 500 72C694 97 888 99 1080 76C1216 60 1346 58 1440 69V140H0V64Z"
          fill="var(--brand-orange)"
          opacity="0.7"
        />
        <path
          d="M0 84C194 63 376 71 560 92C760 115 968 116 1162 94C1268 82 1362 81 1440 87V140H0V84Z"
          fill="var(--brand-red)"
          opacity="0.9"
        />
        <path
          d="M0 106C224 90 430 96 638 114C848 132 1060 132 1260 113C1334 107 1396 107 1440 109V140H0V106Z"
          fill="var(--sidebar-end)"
        />
        <path
          d="M0 83C194 62 378 70 566 91C762 113 972 114 1164 92C1270 80 1362 80 1440 85"
          stroke="var(--brand-gold)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>

      <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-2 text-sidebar-foreground">
        <ChickenIcon className="h-5 w-5" />
        <span className="font-serif text-sm font-semibold tracking-wide italic sm:text-base">
          {t('registry.footerTagline')}
        </span>
      </div>
    </div>
  );
}
