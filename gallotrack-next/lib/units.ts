'use client';
import { useState, useEffect } from 'react';

export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'inches';

export const lbsToKg = (v: number): number => Math.round((v / 2.20462) * 10) / 10;
export const kgToLbs = (v: number): number => Math.round(v * 2.20462 * 10) / 10;
export const inchesToCm = (v: number): number => Math.round(v * 2.54 * 10) / 10;
export const cmToInches = (v: number): number => Math.round((v / 2.54) * 10) / 10;

export function readLocalUnitPrefs(): { weightUnit: WeightUnit; heightUnit: HeightUnit } {
  try {
    const raw = localStorage.getItem('gallotrack_user_preferences');
    if (raw) {
      const p = JSON.parse(raw);
      return {
        weightUnit: p.weight_unit === 'lbs' ? 'lbs' : 'kg',
        heightUnit: p.height_unit === 'inches' ? 'inches' : 'cm',
      };
    }
  } catch { /* ignore */ }
  return { weightUnit: 'kg', heightUnit: 'cm' };
}

let cachedSystemUnits: { weight_unit?: string; height_unit?: string } | null = null;

async function getSystemUnits(): Promise<{ weight_unit?: string; height_unit?: string }> {
  if (cachedSystemUnits) return cachedSystemUnits;
  try {
    const s = await fetch('/api/admin/system-settings').then((r) => r.json());
    cachedSystemUnits = { weight_unit: s.weight_unit, height_unit: s.height_unit };
  } catch {
    cachedSystemUnits = {};
  }
  return cachedSystemUnits;
}

/** Convert user-entered value (in preferred unit) to storage unit (always kg/cm). */
export function weightToStorage(val: string, unit: WeightUnit): string {
  const n = Number(val.toString().replace(/[^0-9.]/g, ''));
  if (!n) return '';
  return String(unit === 'lbs' ? lbsToKg(n) : Math.round(n * 10) / 10);
}

export function heightToStorage(val: string, unit: HeightUnit): string {
  const n = Number(val.toString().replace(/[^0-9.]/g, ''));
  if (!n) return '';
  return String(unit === 'inches' ? inchesToCm(n) : Math.round(n * 10) / 10);
}

/** Convert stored value (kg/cm) to display string in preferred unit. */
export function weightFromStorage(val: string | undefined, unit: WeightUnit): string {
  if (!val) return '';
  const n = Number(val.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return val;
  return String(unit === 'lbs' ? kgToLbs(n) : n);
}

export function heightFromStorage(val: string | undefined, unit: HeightUnit): string {
  if (!val) return '';
  const n = Number(val.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return val;
  return String(unit === 'inches' ? cmToInches(n) : n);
}

export const weightUnitLabel = (u: WeightUnit): string => (u === 'lbs' ? 'lbs' : 'kg');
export const heightUnitLabel = (u: HeightUnit): string => (u === 'inches' ? 'in' : 'cm');

/** Hydration-safe: starts with kg/cm (matches SSR), syncs from prefs after mount. */
export function useUnitPrefs(): { weightUnit: WeightUnit; heightUnit: HeightUnit } {
  const [prefs, setPrefs] = useState<{ weightUnit: WeightUnit; heightUnit: HeightUnit }>({
    weightUnit: 'kg',
    heightUnit: 'cm',
  });

  useEffect(() => {
    const local = readLocalUnitPrefs();
    const hasLocal = localStorage.getItem('gallotrack_user_preferences');
    if (hasLocal && local) {
      setPrefs(local);
      return;
    }
    getSystemUnits().then((sys) => {
      setPrefs({
        weightUnit: sys.weight_unit === 'lbs' ? 'lbs' : 'kg',
        heightUnit: sys.height_unit === 'inches' ? 'inches' : 'cm',
      });
    });
  }, []);

  return prefs;
}
