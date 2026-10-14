import type { FowlRecord } from './types';
import { formatBirdCodeForDisplay, resolveBirdCodes } from './bird-code';

export type SearchableItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
};

/** How many chicken results the global palette shows at most. */
export const BIRD_SEARCH_LIMIT = 8;

/**
 * Case-insensitive matcher for the global search palette. Empty/whitespace
 * queries return everything (the palette shows all pages and actions).
 * Ranking: exact label > label prefix > label contains > hint contains >
 * href contains. Ties keep their original order (Array#sort is stable).
 */
export function matchSearchItems<T extends SearchableItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return items;

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const hint = (item.hint ?? '').toLowerCase();
    const href = item.href.toLowerCase();
    let score = -1;
    if (label === q) score = 0;
    else if (label.startsWith(q)) score = 1;
    else if (label.includes(q)) score = 2;
    else if (hint.includes(q)) score = 3;
    else if (href.includes(q)) score = 4;
    if (score >= 0) scored.push({ item, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((entry) => entry.item);
}

/**
 * Chicken search across name, bird code and wing band for the global
 * palette. Ranking: exact name > name prefix > bird code > wing band >
 * name substring. Empty query returns nothing (the palette never dumps the
 * whole roster).
 */
export function matchBirds(fowls: FowlRecord[], query: string, limit = BIRD_SEARCH_LIMIT): FowlRecord[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return [];
  const codes = resolveBirdCodes(fowls);
  const scored: { fowl: FowlRecord; score: number }[] = [];
  for (const fowl of fowls) {
    const name = (fowl.name ?? '').trim().toLowerCase();
    const code = formatBirdCodeForDisplay(codes.get(String(fowl.id)) ?? fowl.bird_code).toLowerCase();
    const wing = (fowl.wing_band ?? '').trim().toLowerCase();
    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (code.includes(q)) score = 2;
    else if (wing.includes(q)) score = 3;
    else if (name.includes(q)) score = 4;
    if (score >= 0) scored.push({ fowl, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((entry) => entry.fowl);
}

/** "1A1 · WB-01" style hint for a chicken palette result. */
export function birdSearchHint(fowl: FowlRecord, codes: Map<string, string>): string {
  const code = formatBirdCodeForDisplay(codes.get(String(fowl.id)) ?? fowl.bird_code);
  return [code, fowl.wing_band].filter(Boolean).join(' · ');
}
