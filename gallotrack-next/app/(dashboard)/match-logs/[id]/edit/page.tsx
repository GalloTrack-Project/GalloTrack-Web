'use client';
import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import MatchRecordForm from '@/components/match/MatchRecordForm';
import { fetchMatchById } from '@/lib/services/match-service';
import { useFowl } from '@/lib/contexts/fowl-context';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';
import type { MatchRecord } from '@/lib/types';

function EditMatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { matchHistory, loading: contextLoading } = useFowl();

  const idParam = params?.id;
  const matchId = idParam ? Number(idParam) : null;
  const returnTo = sanitizeRedirectPath(searchParams?.get('returnTo'), '/match-logs');

  const [record, setRecord] = useState<MatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId || isNaN(matchId)) {
      setLoading(false);
      setError('Invalid match record ID.');
      return;
    }

    let isMounted = true;

    // Fast path: find in matchHistory context
    const inHistory = matchHistory.find((m) => m.id === matchId);
    if (inHistory) {
      setRecord(inHistory);
      setLoading(false);
    }

    // Always fetch latest authoritative data from matchService
    fetchMatchById(matchId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setRecord(data);
          setError(null);
        } else if (!inHistory) {
          setError('Match record not found or you do not have permission to access it.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (!inHistory) {
          setError(err instanceof Error ? err.message : 'Failed to load match record.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [matchId, matchHistory]);

  if (loading || contextLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-10 w-72 bg-muted rounded" />
        <div className="h-[600px] w-full bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-danger border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-foreground">Record Not Found</h2>
          <p className="text-sm text-muted-foreground font-semibold max-w-md mx-auto">
            {error || `Match record #${matchId} does not exist or has been removed.`}
          </p>
          <div className="pt-2">
            <Link
              href={returnTo}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Previous Page</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <MatchRecordForm mode="edit" initialRecord={record} onSuccessRedirect={returnTo} />
    </div>
  );
}

export default function EditMatchLogPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-72 bg-muted rounded" />
          <div className="h-[600px] w-full bg-muted rounded-xl" />
        </div>
      }
    >
      <EditMatchContent />
    </Suspense>
  );
}
