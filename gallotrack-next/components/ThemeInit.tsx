'use client';
import { useEffect } from 'react';

export default function ThemeInit() {
  useEffect(() => {
    try {
      const t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') {
        document.documentElement.classList.add(t);
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {
      document.documentElement.classList.add('dark');
    }
  }, []);
  return null;
}
