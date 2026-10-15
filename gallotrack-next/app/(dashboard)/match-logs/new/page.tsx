'use client';
import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchRecordForm from '@/components/match/MatchRecordForm';

function AddMatchRecordContent() {
  const searchParams = useSearchParams();
  const fowlIdParam = searchParams.get('fowlId');
  const initialFowlId = fowlIdParam ? Number(fowlIdParam) : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <MatchRecordForm mode="add" initialFowlId={initialFowlId} />
    </div>
  );
}

export default function NewMatchLogPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-4xl mx-auto space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-10 w-72 bg-muted rounded" />
          <div className="h-96 w-full bg-muted rounded-lg" />
        </div>
      }
    >
      <AddMatchRecordContent />
    </Suspense>
  );
}
