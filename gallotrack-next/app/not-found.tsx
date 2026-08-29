import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-4xl mx-auto">
          🐓
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">404</h1>
          <h2 className="text-lg font-bold text-muted-foreground">Page Not Found</h2>
          <p className="text-sm text-muted-foreground/70">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
