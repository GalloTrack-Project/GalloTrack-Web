'use client';
import React from 'react';
import { useTheme } from 'next-themes';
import { UIProvider, useUI } from './contexts/ui-context';
import { AuthProvider, useAuth } from './contexts/auth-context';
import { FowlProvider, useFowl } from './contexts/fowl-context';

/**
 * Unified facade context that preserves backward compatibility.
 * Components using `useGaloTrack()` continue to work without changes.
 * New components should prefer useUI(), useAuth(), or useFowl() directly.
 */
export function useGaloTrack() {
  const ui = useUI();
  const auth = useAuth();
  const fowl = useFowl();

  return {
    ...ui,
    ...auth,
    ...fowl,
  };
}

export function GalloTrackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <UIProvider theme={theme || 'dark'} setTheme={setTheme}>
      <AuthProvider>
        <FowlProvider>
          {children}
        </FowlProvider>
      </AuthProvider>
    </UIProvider>
  );
}
