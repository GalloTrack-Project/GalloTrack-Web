'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFowl } from '@/lib/contexts/fowl-context';
import { useUI } from '@/lib/contexts/ui-context';
import FowlDetailsPage from '@/components/FowlDetailsPage';
import { Spinner } from '@/components/ui';

export default function FowlProfileRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { authChecked } = useAuth();
  const ui = useUI();
  const { fowls, loading, loadError, fetchDatabaseResources } = useFowl();

  // The registry fetch starts only after auth restores the session, so
  // `loading` can still be false on the very first render. A short grace
  // window keeps an empty registry distinguishable from "still fetching".
  const [graceExpired, setGraceExpired] = useState(false);

  const rawId = params?.id ?? '';
  const parsedId = Number(rawId);
  const idValid = rawId !== '' && Number.isInteger(parsedId) && parsedId > 0;

  useEffect(() => {
    const timer = setTimeout(() => setGraceExpired(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!idValid) router.replace('/lineage');
  }, [idValid, router]);

  useEffect(() => {
    if (authChecked && ui.currentPage === 'login') {
      router.replace(`/?redirect=${encodeURIComponent(`/lineage/chicken/${rawId}`)}`);
    }
  }, [authChecked, ui.currentPage, rawId, router]);

  const sessionReady = authChecked && ui.currentPage !== 'login';
  const registryReady = fowls.length > 0 || (!loading && graceExpired);
  const ready = sessionReady && registryReady;
  const fowl = ready && idValid ? fowls.find((f) => f.id === parsedId) : undefined;

  useEffect(() => {
    if (ready && idValid && !fowl && !loadError) router.replace('/lineage');
  }, [ready, idValid, fowl, loadError, router]);

  useEffect(() => {
    if (!fowl) return;
    const previousTitle = document.title;
    document.title = `${fowl.name} · GalloTrack`;
    return () => {
      document.title = previousTitle;
    };
  }, [fowl]);

  if (!idValid || (authChecked && ui.currentPage === 'login')) return null;

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Spinner className="h-5 w-5" label="Loading chicken profile" />
          Loading chicken profile…
        </div>
      </div>
    );
  }

  if (fowl) return <FowlDetailsPage fowl={fowl} />;

  if (loadError) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-lg border border-amber-300/70 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Registry unavailable
            </p>
            <p className="text-sm font-semibold text-muted-foreground">{loadError}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchDatabaseResources()}
          className="inline-flex items-center gap-1.5 border border-amber-300 dark:border-amber-700 rounded-sm px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 transition-colors cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return null;
}
