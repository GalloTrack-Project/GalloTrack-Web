'use client';
import React from 'react';
import MatchRecordForm from '@/components/match/MatchRecordForm';

/**
 * @deprecated Use `components/match/MatchRecordForm` directly.
 * Preserved for backwards compatibility with legacy tests and imports.
 */
export default function MatchForm(props: any) {
  return <MatchRecordForm mode="add" {...props} />;
}
