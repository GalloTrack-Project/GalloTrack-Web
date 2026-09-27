'use client';
import { useEffect } from 'react';

export default function ThemeInit() {
  useEffect(() => {
    const apply = (t: string) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(t === 'light' ? 'light' : 'dark');
    };
    try {
      const t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') {
        apply(t);
      } else if (t === 'system') {
        apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      } else {
        apply('dark');
      }
    } catch {
      apply('dark');
    }
  }, []);
  return null;
}
