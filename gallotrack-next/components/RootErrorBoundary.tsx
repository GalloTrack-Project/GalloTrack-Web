'use client';
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function RootErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary label="Application">
      {children}
    </ErrorBoundary>
  );
}
