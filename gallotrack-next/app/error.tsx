'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center text-4xl mx-auto">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-rose-500">Something went wrong</h1>
          <p className="text-sm text-muted-foreground/70">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
