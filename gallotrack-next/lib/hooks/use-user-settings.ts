'use client';
import { useEffect, useState } from 'react';
import { fetchUserSettings } from '@/lib/services/settings-service';
import { DEFAULT_SETTINGS, type UserSettings } from '@/lib/settings';

/** Per-farm settings with server overrides; falls back to app defaults. */
export function useUserSettings(): UserSettings {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let live = true;
    fetchUserSettings().then((s) => {
      if (live) setSettings(s);
    });
    return () => {
      live = false;
    };
  }, []);

  return settings;
}
