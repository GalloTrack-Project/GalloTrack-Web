'use client';
import React, { Suspense } from 'react';
import MatchLogsView from '@/components/match/MatchLogsView';

export default function MatchLogsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-16 w-full bg-muted rounded-lg" />
            <div className="h-96 w-full bg-muted rounded-lg" />
          </div>
        }
      >
        <MatchLogsView />
      </Suspense>
    </div>
  );
}
