'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchRecordForm from '@/components/match/MatchRecordForm';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';

function AddMatchRecordContent() {
  const searchParams = useSearchParams();
  const fowlIdParam = searchParams.get('fowlId');
  const initialFowlId = fowlIdParam ? Number(fowlIdParam) : null;
  const returnTo = sanitizeRedirectPath(searchParams.get('returnTo'), '/profiling?tab=matchForm');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <MatchRecordForm
        mode="add"
        initialFowlId={initialFowlId}
        onSuccessRedirect={returnTo}
      />
    </div>
  );
}

export default function NewMatchLogPage() {
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
      <AddMatchRecordContent />
    </Suspense>
  );
}
