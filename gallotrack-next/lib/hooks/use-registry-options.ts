'use client';
import { useCallback, useEffect, useState } from 'react';
import type { RegistryOption } from '@/lib/types';
import { fetchRegistryOptions } from '@/lib/services/options-service';

/**
 * Loads the farm's editable option rows once per mount and exposes a manual
 * reload. Callers shape the rows with mergeOptions(listKey, currentValue).
 */
export function useRegistryOptions() {
  const [rows, setRows] = useState<RegistryOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const next = await fetchRegistryOptions();
    setRows(next);
    setLoaded(true);
    return next;
  }, []);

  useEffect(() => {
    let live = true;
    fetchRegistryOptions().then((next) => {
      if (!live) return;
      setRows(next);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return { rows, loaded, reload };
}
