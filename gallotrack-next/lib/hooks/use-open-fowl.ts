'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { FowlRecord } from '@/lib/types';

/**
 * Opens a chicken's dedicated profile page at /lineage/chicken/[id].
 * Replaces the old FowlDetailsModal so every "view this bird" action
 * shares one navigable, deep-linkable URL.
 */
export function useOpenFowl() {
  const router = useRouter();
  return useCallback(
    (fowl: FowlRecord | null | undefined) => {
      if (!fowl) return;
      router.push(`/lineage/chicken/${fowl.id}`);
    },
    [router],
  );
}
