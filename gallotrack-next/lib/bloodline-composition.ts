import type { FowlRecord } from './types';

/**
 * Bloodline composition engine.
 *
 * Computes the per-strain blood percentage (hatian ng dugo) of every fowl by
 * walking its ancestry:
 *
 *   • Foundation / unregistered bird -> 100% of its own listed strain(s).
 *     A multi-strain breed tag ("Hatch, Roundhead") is treated as an already
 *     existing cross and split evenly across those strains.
 *   • Registered offspring          -> 50% of the sire's composition
 *                                    + 50% of the dam's composition.
 *     (50/50 default rule — no historical tree required.)
 *   • A parent that is named but not in the registry contributes an
 *     "Unknown" share so the totals always add up to 100% without inventing
 *     percentages.
 *
 * Example (adviser's cross-breed scenario):
 *   Sire "Kelso" (foundation, 100% Kelso)
 *   Dam  "Hatch-Roundhead" -> breed "Hatch, Roundhead" (50/50)
 *   Offspring -> 50% Kelso / 25% Hatch / 25% Roundhead
 */

export type BloodlineComposition = Record<string, number>;

export const UNKNOWN_BLOODLINE = 'Unknown';

/** Loose tolerance used when checking that a composition sums to 100. */
const EPSILON = 0.11;

const round1 = (n: number): number => Math.round(n * 10) / 10;

const strainKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const isFoundationName = (name?: string | null): boolean => {
  const key = strainKey(String(name ?? ''));
  return key === '' || key === 'foundation stock';
};

/** Merge two compositions, each scaled by its share (shares should total 1). */
export function blendCompositions(
  left: BloodlineComposition,
  right: BloodlineComposition,
  leftShare = 0.5,
  rightShare = 0.5
): BloodlineComposition {
  const out: BloodlineComposition = {};
  const add = (comp: BloodlineComposition, share: number) => {
    for (const [strain, pct] of Object.entries(comp)) {
      const value = pct * share;
      if (value <= 0) continue;
      out[strain] = (out[strain] || 0) + value;
    }
  };
  add(left, leftShare);
  add(right, rightShare);
  return normalizeComposition(out);
}

/**
 * Clean a composition: drop empty/negative entries, round to 1 decimal,
 * merge strains that differ only in casing and re-normalise to 100%.
 */
export function normalizeComposition(raw: BloodlineComposition | null | undefined): BloodlineComposition {
  if (!raw) return {};
  const merged: Record<string, { display: string; value: number }> = {};
  for (const [strain, value] of Object.entries(raw)) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) continue;
    const display = strain.trim();
    if (!display) continue;
    const key = strainKey(display);
    if (!merged[key]) merged[key] = { display, value: 0 };
    merged[key].value += num;
  }

  const entries = Object.values(merged);
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  if (total <= 0) return {};

  const out: BloodlineComposition = {};
  for (const e of entries) {
    const pct = total === 100 ? e.value : (e.value * 100) / total;
    out[e.display] = round1(pct);
  }

  // Absorb rounding drift into the largest share so the total stays 100.
  const sum = Object.values(out).reduce((s, v) => s + v, 0);
  const drift = round1(100 - sum);
  if (Math.abs(drift) >= 0.1) {
    const biggest = Object.keys(out).sort((a, b) => out[b] - out[a])[0];
    out[biggest] = round1(out[biggest] + drift);
  }
  return out;
}

/** Strains listed on a fowl's own breed tag, split on commas/slashes/pipes. */
export function listedStrains(breed?: string | null): string[] {
  return String(breed ?? '')
    .split(/[,/|+&]|\band\b/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && strainKey(s) !== 'foundation stock' && strainKey(s) !== 'unspecified strain');
}

/** Composition of a bird that has no registered ancestry. */
export function baseComposition(f: { breed?: string } | null | undefined): BloodlineComposition {
  const strains = listedStrains(f?.breed);
  if (strains.length === 0) return { [UNKNOWN_BLOODLINE]: 100 };
  const share = round1(100 / strains.length);
  const out: BloodlineComposition = {};
  strains.forEach((s, i) => {
    out[s] = i === strains.length - 1 ? round1(100 - share * (strains.length - 1)) : share;
  });
  return out;
}

const findByName = (fowls: FowlRecord[], name?: string | null): FowlRecord | undefined => {
  if (isFoundationName(name)) return undefined;
  const key = strainKey(String(name ?? ''));
  return fowls.find((f) => strainKey(f.name || '') === key);
};

function resolveComposition(
  fowl: FowlRecord,
  fowls: FowlRecord[],
  memo: Map<string, BloodlineComposition>,
  chain: Set<string>
): BloodlineComposition {
  const key = strainKey(fowl.name || '');
  const cached = key ? memo.get(key) : undefined;
  if (cached) return cached;
  if (key && chain.has(key)) return baseComposition(fowl);

  const sire = findByName(fowls, fowl.sire);
  const dam = findByName(fowls, fowl.dam);

  let comp: BloodlineComposition;
  if (!sire && !dam) {
    comp = baseComposition(fowl);
  } else {
    if (key) chain.add(key);
    const sireComp = sire
      ? resolveComposition(sire, fowls, memo, chain)
      : { [UNKNOWN_BLOODLINE]: 100 };
    const damComp = dam
      ? resolveComposition(dam, fowls, memo, chain)
      : { [UNKNOWN_BLOODLINE]: 100 };
    if (key) chain.delete(key);
    comp = blendCompositions(sireComp, damComp, 0.5, 0.5);
  }

  if (key) memo.set(key, comp);
  return comp;
}

/** Blood percentage breakdown (per strain) for a single fowl. */
export function computeBloodlineComposition(fowl: FowlRecord, fowls: FowlRecord[]): BloodlineComposition {
  if (!fowl) return {};
  return resolveComposition(fowl, fowls, new Map<string, BloodlineComposition>(), new Set<string>());
}

/** Pre-computed compositions for an entire registry (single ancestry walk). */
export function computeAllCompositions(fowls: FowlRecord[]): Map<string, BloodlineComposition> {
  const memo = new Map<string, BloodlineComposition>();
  const chain = new Set<string>();
  const out = new Map<string, BloodlineComposition>();
  fowls.forEach((f) => {
    const comp = resolveComposition(f, fowls, memo, chain);
    out.set(String(f.id), comp);
  });
  return out;
}

/** Rebuild a composition from a persisted jsonb value. */
export function parseComposition(raw: unknown): BloodlineComposition | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const comp = normalizeComposition(raw as BloodlineComposition);
  return Object.keys(comp).length > 0 ? comp : null;
}

export type BloodlineEntry = {
  strain: string;
  pct: number;
  isUnknown: boolean;
};

export type BloodlineStats = {
  composition: BloodlineComposition;
  entries: BloodlineEntry[];
  dominant: BloodlineEntry;
  /** Specific (dominant) bloodline percentage — what gets stored in `bloodline_pct`. */
  specificPct: number;
  knownPct: number;
  unknownPct: number;
  strainCount: number;
  isMixed: boolean;
  isDiluted: boolean;
  /** Human-readable breakdown, e.g. "50% Kelso · 25% Hatch · 25% Roundhead". */
  summary: string;
};

const DILUTION_STRAIN_COUNT = 4;
const DILUTION_DOMINANT_PCT = 40;

/** Sort: biggest share first, unknown last on ties, alphabetical as tiebreak. */
function sortEntries(comp: BloodlineComposition): BloodlineEntry[] {
  return Object.entries(comp)
    .map(([strain, pct]) => ({ strain, pct, isUnknown: strainKey(strain) === strainKey(UNKNOWN_BLOODLINE) }))
    .sort((a, b) => {
      if (Math.abs(b.pct - a.pct) > 0.001) return b.pct - a.pct;
      if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
      return a.strain.localeCompare(b.strain);
    });
}

export function getBloodlineStats(composition: BloodlineComposition | null | undefined): BloodlineStats | null {
  if (!composition) return null;
  const normalized = normalizeComposition(composition);
  const entries = sortEntries(normalized);
  if (entries.length === 0) return null;

  const dominant = entries[0];
  const knownPct = round1(entries.filter((e) => !e.isUnknown).reduce((s, e) => s + e.pct, 0));
  const unknownPct = round1(entries.filter((e) => e.isUnknown).reduce((s, e) => s + e.pct, 0));
  const strainCount = entries.filter((e) => !e.isUnknown).length;

  return {
    composition: normalized,
    entries,
    dominant,
    specificPct: dominant.pct,
    knownPct,
    unknownPct,
    strainCount,
    isMixed: strainCount > 1,
    isDiluted: strainCount >= DILUTION_STRAIN_COUNT || (strainCount > 1 && dominant.pct < DILUTION_DOMINANT_PCT),
    summary: entries.map((e) => `${round1(e.pct)}% ${e.strain}`).join(' · '),
  };
}

/** Stats for a stored fowl record; recomputes from ancestry when not persisted yet. */
export function getFowlBloodlineStats(fowl: FowlRecord | null | undefined, fowls: FowlRecord[] = []): BloodlineStats | null {
  if (!fowl) return null;
  const stored = parseComposition(fowl.bloodline_composition);
  if (stored) return getBloodlineStats(stored);
  return getBloodlineStats(computeBloodlineComposition(fowl, fowls));
}

/** Convenience: the dominant strain share (0–100) for a composition. */
export function specificBloodlinePct(composition: BloodlineComposition | null | undefined): number {
  const entries = sortEntries(normalizeComposition(composition || null));
  return entries.length > 0 ? entries[0].pct : 0;
}

export function compositionIsStale(stored: unknown, computed: BloodlineComposition): boolean {
  const a = parseComposition(stored);
  if (!a) return Object.keys(computed).length > 0;
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(computed).sort();
  if (keysA.length !== keysB.length) return true;
  if (keysA.some((k, i) => k !== keysB[i])) return true;
  return keysA.some((k) => Math.abs((a[k] || 0) - (computed[k] || 0)) > EPSILON);
}
