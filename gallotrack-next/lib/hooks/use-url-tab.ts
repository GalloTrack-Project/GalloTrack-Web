'use client';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type UseUrlTabOptions<T extends string> = {
  param: string;
  values: readonly T[];
  defaultValue: T;
};

/** How the current value came to be. 'mount' + paramPresent distinguishes
 * "URL opened with a shareable tab" (apply) from "navigated here clean"
 * (keep whatever state the caller already set, e.g. navigate(page, subTab)). */
export type UrlTabChange = 'mount' | 'popstate' | 'user';

export type UrlTabMeta = {
  paramPresent: boolean;
  change: UrlTabChange;
};

/**
 * Two-way URL <-> state sync for page tabs. Reads `?param=` on mount and on
 * popstate; invalid or missing values fall back to defaultValue. setValue
 * writes the param with router.replace({ scroll: false }) and preserves
 * unrelated params. Uses window.location.search (like LineageDirectory)
 * instead of useSearchParams so statically prerendered pages need no
 * Suspense boundary.
 */
export function useUrlTab<T extends string>({
  param,
  values,
  defaultValue,
}: UseUrlTabOptions<T>): [T, (next: T) => void, UrlTabMeta] {
  const pathname = usePathname();
  const router = useRouter();

  const read = useCallback((): { value: T; paramPresent: boolean } => {
    if (typeof window === 'undefined') return { value: defaultValue, paramPresent: false };
    const raw = new URLSearchParams(window.location.search).get(param);
    const valid = raw !== null && (values as readonly string[]).includes(raw);
    return { value: valid ? (raw as T) : defaultValue, paramPresent: valid };
  }, [param, values, defaultValue]);

  const [state, setState] = useState<{ value: T; paramPresent: boolean; change: UrlTabChange }>(() => ({
    value: defaultValue,
    paramPresent: false,
    change: 'mount',
  }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.location is only readable client-side; the mount read must run post-hydration (same pattern as LineageDirectory's ?tab= sync) to avoid a hydration mismatch.
    setState({ ...read(), change: 'mount' });
    const onPop = () => setState({ ...read(), change: 'popstate' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [read]);

  const setValue = useCallback(
    (next: T) => {
      setState({ value: next, paramPresent: next !== defaultValue, change: 'user' });
      const params = new URLSearchParams(window.location.search);
      if (next === defaultValue) params.delete(param);
      else params.set(param, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [param, pathname, router, defaultValue],
  );

  return [state.value, setValue, { paramPresent: state.paramPresent, change: state.change }];
}
