'use client';

import React from 'react';

export default function StagingBanner() {
  const env = process.env.NEXT_PUBLIC_APP_ENV;
  if (env !== 'staging') return null;

  return (
    <div
      role="region"
      aria-label="Staging Environment Indicator"
      className="w-full bg-amber-500 text-slate-950 px-4 py-1.5 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md z-[9999] shrink-0 border-b border-amber-600"
    >
      <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
      <span>⚠️ STAGING ENVIRONMENT — Test database. Changes do not affect Production.</span>
    </div>
  );
}
