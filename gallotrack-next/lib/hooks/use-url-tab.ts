'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type UseUrlTabOptions<T extends string> = {
  param: string;
  values: readonly T[];
  defaultValue: T;
  aliases?: Record<string, T>;
  legacyParams?: string[];
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
  aliases,
  legacyParams,
}: UseUrlTabOptions<T>): [T, (next: T) => void, UrlTabMeta] {
  const pathname = usePathname();
  const router = useRouter();

  const valuesRef = useRef(values);
  const aliasesRef = useRef(aliases);
  const legacyParamsRef = useRef(legacyParams);

  useEffect(() => {
    valuesRef.current = values;
    aliasesRef.current = aliases;
    legacyParamsRef.current = legacyParams;
  });

  const read = useCallback((): { value: T; paramPresent: boolean } => {
    if (typeof window === 'undefined') return { value: defaultValue, paramPresent: false };
    const search = new URLSearchParams(window.location.search);
    let raw = search.get(param);
    if (raw === null && legacyParamsRef.current) {
      for (const lp of legacyParamsRef.current) {
        const val = search.get(lp);
        if (val !== null) {
          raw = val;
          break;
        }
      }
    }
    const resolved = raw !== null && aliasesRef.current && raw in aliasesRef.current ? aliasesRef.current[raw] : raw;
    const valid = resolved !== null && (valuesRef.current as readonly string[]).includes(resolved);
    return { value: valid ? (resolved as T) : defaultValue, paramPresent: valid };
  }, [param, defaultValue]);

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
      if (legacyParamsRef.current) {
        for (const lp of legacyParamsRef.current) {
          params.delete(lp);
        }
      }
      if (next === defaultValue) params.delete(param);
      else params.set(param, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [param, pathname, router, defaultValue],
  );

  return [state.value, setValue, { paramPresent: state.paramPresent, change: state.change }];
}
