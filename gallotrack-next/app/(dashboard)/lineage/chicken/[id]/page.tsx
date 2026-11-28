'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import FowlDetailsModal from '@/components/modals/FowlDetailsModal';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/contexts/auth-context';
import { useFowl } from '@/lib/contexts/fowl-context';

export default function ChickenProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { authChecked, currentUserId } = useAuth();
  const fowlStore = useFowl();
  const { fetchDatabaseResources, loadError, loading } = fowlStore;
  const fowlCount = fowlStore.fowls.length;
  const [graceExpired, setGraceExpired] = useState(false);
  const fetchStarted = useRef(false);

  const rawId = params?.id ?? '';
  const fowlId = Number(rawId);
  const idValid = rawId !== '' && Number.isInteger(fowlId) && fowlId > 0;
  const fowl = idValid ? fowlStore.fowls.find((bird) => bird.id === fowlId) : undefined;

  useEffect(() => {
    if (!authChecked) return;
    const timer = setTimeout(() => setGraceExpired(true), 3000);
    return () => clearTimeout(timer);
  }, [authChecked, rawId]);

  useEffect(() => {
    if (!idValid) router.replace('/catalog');
  }, [idValid, router]);

  useEffect(() => {
    if (authChecked && !currentUserId) {
      router.replace(`/login?redirect=${encodeURIComponent(`/lineage/chicken/${rawId}`)}`);
    }
  }, [authChecked, currentUserId, rawId, router]);

  useEffect(() => {
    if (!authChecked || !currentUserId || fetchStarted.current) return;
    if (fowlCount > 0 || loading) return;
    fetchStarted.current = true;
    void fetchDatabaseResources();
  }, [authChecked, currentUserId, fetchDatabaseResources, fowlCount, loading]);

  useEffect(() => {
    if (!fowl) return;
    const previousTitle = document.title;
    document.title = `${fowl.name} · GalloTrack`;
    return () => {
      document.title = previousTitle;
    };
  }, [fowl]);

  if (!idValid) return null;

  if (!authChecked || (authChecked && !currentUserId)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
          <Spinner className="h-5 w-5" label="Checking session" />
          Checking session...
        </div>
      </div>
    );
  }

  const registryReady = fowlCount > 0 || (!loading && graceExpired);

  if (!fowl) {
    if (!registryReady) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
            <Spinner className="h-5 w-5" label="Loading chicken profile" />
            Loading chicken profile...
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div
          role="alert"
          className="mx-auto max-w-xl space-y-3 rounded-lg border border-amber-300/70 bg-amber-50 p-4 dark:bg-amber-950/40"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-xs font-black tracking-widest text-amber-700 uppercase dark:text-amber-400">
                Registry unavailable
              </p>
              <p className="text-muted-foreground text-sm font-semibold">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchDatabaseResources()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-amber-300 px-3 py-1.5 text-xs font-black tracking-wider text-amber-700 uppercase transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/40"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="border-border bg-card mx-auto max-w-xl space-y-3 rounded-lg border p-6 text-center shadow-sm">
        <p className="text-lg font-black">Chicken not found</p>
        <p className="text-muted-foreground text-sm font-semibold">
          This chicken may have been removed or is not available in your registry.
        </p>
        <Link
          href="/catalog"
          className="bg-sidebar text-sidebar-foreground hover:bg-sidebar-active inline-flex min-h-10 items-center rounded-full px-4 text-xs font-black transition-colors"
        >
          Back to Chicken Inventory
        </Link>
      </div>
    );
  }

  return (
    <FowlDetailsModal
      presentation="page"
      selectedFowlForDetails={fowl}
      setSelectedFowlForDetails={(next) => {
        if (next) {
          router.push(`/lineage/chicken/${next.id}`);
        } else {
          router.back();
        }
      }}
      matchHistory={fowlStore.matchHistory}
      fowls={fowlStore.fowls}
      getAgeParts={fowlStore.getAgeParts}
      getAgeLabel={fowlStore.getAgeLabel}
      getAgeExact={fowlStore.getAgeExact}
      getAgeMetrics={fowlStore.getAgeMetrics}
      generationOf={fowlStore.generationOf}
      generationPurity={fowlStore.generationPurity}
      generationInfo={fowlStore.generationInfo}
      bloodlineOf={fowlStore.bloodlineOf}
      getSiblingRelations={fowlStore.getSiblingRelations}
      getMilestoneInfo={fowlStore.getMilestoneInfo}
      getArchiveBadgeStyle={fowlStore.getArchiveBadgeStyle}
      pairingAnalytics={fowlStore.pairingAnalytics}
    />
  );
}
