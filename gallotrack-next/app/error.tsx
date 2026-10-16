'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';

function getErrorId(error: Error & { digest?: string }): string {
  if (error.digest) return error.digest;
  const str = `${error.name || 'Error'}:${error.message || 'unknown'}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).substring(0, 8) || 'err-unknown';
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const errorId = useMemo(() => getErrorId(error), [error]);

  useEffect(() => {
    console.error(`[AppRootError] Error ID: ${errorId}`, error);
    if (error.stack) {
      console.error('[AppRootError] Stack:', error.stack);
    }
  }, [error, errorId]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/40 rounded-lg flex items-center justify-center text-4xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-danger">Something went wrong</h1>
          <p className="text-sm text-muted-foreground/70">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <p className="text-xs font-mono text-muted-foreground/50">
            Error ID: {errorId}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="w-full sm:w-auto inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-2.5 px-6 rounded-md text-sm transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-block bg-slate-200 dark:bg-muted hover:bg-slate-300 dark:hover:bg-muted/80 text-foreground font-bold py-2.5 px-6 rounded-md text-sm transition-all cursor-pointer"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
