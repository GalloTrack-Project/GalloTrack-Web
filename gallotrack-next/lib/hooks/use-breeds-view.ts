'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUI } from '@/lib/contexts/ui-context';

export const BREEDS_VIEW_PARAM = 'view';
export const BREEDS_VIEW_VALUE = 'breeds';

export function useBreedsView() {
  const router = useRouter();
  const pathname = usePathname();
  const { breedsViewOpen, setBreedsViewOpen, profilingSubTab, setProfilingSubTab } = useUI();
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    routerRef.current = router;
    pathnameRef.current = pathname;
  });

  // Read the URL only on mount and on browser Back/Forward. Re-reading after
  // every render would undo openBreeds() when the router object identity changes.
  useEffect(() => {
    const sync = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const legacyTab = params.get('tab') === 'breeds';
      if (legacyTab) {
        params.set('tab', 'males');
        params.set(BREEDS_VIEW_PARAM, BREEDS_VIEW_VALUE);
        const search = params.toString();
        routerRef.current.replace(
          search ? `${pathnameRef.current}?${search}` : pathnameRef.current,
          { scroll: false },
        );
        setProfilingSubTab('males');
      }
      setBreedsViewOpen(
        params.get(BREEDS_VIEW_PARAM) === BREEDS_VIEW_VALUE || legacyTab,
      );
    };

    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [setBreedsViewOpen, setProfilingSubTab]);

  // Leaving the Chicken Registry closes the Breeds view. This also keeps a
  // later return to /profiling from reopening a stale view.
  useEffect(() => {
    if (pathname !== '/profiling') setBreedsViewOpen(false);
  }, [pathname, setBreedsViewOpen]);

  const openBreeds = useCallback(() => {
    setBreedsViewOpen(true);
    const params = new URLSearchParams(pathname === '/profiling' ? window.location.search : '');
    params.set(BREEDS_VIEW_PARAM, BREEDS_VIEW_VALUE);
    if (profilingSubTab === 'breeds') params.delete('tab');
    else params.set('tab', profilingSubTab);
    const search = params.toString();
    router.push(search ? `/profiling?${search}` : '/profiling', { scroll: false });
  }, [pathname, profilingSubTab, router, setBreedsViewOpen]);

  const closeBreeds = useCallback(() => {
    setBreedsViewOpen(false);
    const params = new URLSearchParams(window.location.search);
    const legacyTab = params.get('tab') === 'breeds';
    params.delete(BREEDS_VIEW_PARAM);
    if (legacyTab) {
      params.set('tab', 'males');
      setProfilingSubTab('males');
    }
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [pathname, router, setBreedsViewOpen, setProfilingSubTab]);

  return {
    breedsViewOpen: breedsViewOpen || profilingSubTab === 'breeds',
    openBreeds,
    closeBreeds,
  };
}
