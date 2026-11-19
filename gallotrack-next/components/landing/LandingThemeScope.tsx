'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ACTIVE_THEME_PRESET,
  getThemeTokens,
  themeCssVariables,
} from '@/lib/theme/heritage';

export default function LandingThemeScope({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mode = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const themeVars = useMemo(
    () => themeCssVariables(getThemeTokens(ACTIVE_THEME_PRESET, mode)),
    [mode],
  );

  return (
    <div
      data-theme-preset={ACTIVE_THEME_PRESET}
      data-theme-mode={mode}
      style={{ ...themeVars, colorScheme: mode } as React.CSSProperties}
      className="bg-background text-foreground selection:bg-primary selection:text-primary-foreground flex min-h-screen w-full flex-col [overflow-wrap:anywhere]"
    >
      {children}
    </div>
  );
}
