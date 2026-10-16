import type { FowlRecord } from './types';
import {
  getFowlBloodlineStats,
  type BloodlineStats,
  UNKNOWN_BLOODLINE,
  isFoundationName,
} from './bloodline-composition';

export type BreedingType = 'Purebred' | 'Crossbred' | 'Unverified';

export interface BreedingClassification {
  type: BreedingType;
  /** Purity percentage: highest single-breed share in the composition (0–100) */
  purityPct: number;
  /** Dominant strain name */
  dominantBreed: string;
  /** Derived breed label, e.g. "Lemon" for Purebred, "Hatch × Sweater" for Crossbred */
  derivedBreed: string;
  /** Type badge label, e.g. "Purebred · 100% Lemon", "Crossbred · 50% Lemon / 50% Hatch" */
  badgeLabel: string;
  /** Compact summary for badges or card subtitles */
  summary: string;
  /** Top breeds (up to 2) */
  topBreeds: Array<{ strain: string; pct: number }>;
  /** All known breeds with their shares */
  allBreeds: Array<{ strain: string; pct: number }>;
  /** Count of remaining breeds beyond top 2 */
  extraBreedsCount: number;
  /** Full breakdown tooltip text */
  tooltipText: string;
}

/** Tolerance for purebred check (100% single breed) and strain presence */
export const PURITY_TOLERANCE = 0.1;

export const UNVERIFIED_LABEL = 'Unverified lineage';

/**
 * Foundation-stock assumption:
 * Foundation stock is treated as 100% of its registered breed.
 * When a bird has no registered parents (or parents explicitly marked as "Foundation Stock"),
 * its declared breed is considered pure (100%) and serves as the baseline genetic root.
 */
export function isFoundationStockRecord(fowl: FowlRecord | null | undefined): boolean {
  if (!fowl) return false;
  const s = (fowl.sire || '').trim();
  const d = (fowl.dam || '').trim();
  const sireIsBase = !s || isFoundationName(s);
  const damIsBase = !d || isFoundationName(d);
  return sireIsBase && damIsBase;
}

/**
 * Derives the BreedingClassification (Purebred / Crossbred / Unverified)
 * based strictly on parent links, foundation declarations, and breed composition.
 *
 * Scoped strictly to the provided user flock (never queries or references other accounts).
 */
export function getBreedingClassification(
  fowl: FowlRecord | null | undefined,
  fowls: FowlRecord[] = [],
  memo?: Map<string, BreedingClassification>
): BreedingClassification {
  if (!fowl) {
    return {
      type: 'Unverified',
      purityPct: 0,
      dominantBreed: '—',
      derivedBreed: '—',
      badgeLabel: UNVERIFIED_LABEL,
      summary: UNVERIFIED_LABEL,
      topBreeds: [],
      allBreeds: [],
      extraBreedsCount: 0,
      tooltipText: UNVERIFIED_LABEL,
    };
  }

  const memoKey = String(fowl.id || fowl.name || '');
  if (memo && memoKey && memo.has(memoKey)) {
    return memo.get(memoKey)!;
  }

  const s = (fowl.sire || '').trim();
  const d = (fowl.dam || '').trim();
  const sireIsBase = !s || isFoundationName(s);
  const damIsBase = !d || isFoundationName(d);
  const isFoundation = sireIsBase && damIsBase;

  // Rule: If a parent's breed or ancestry is unknown or missing, do not guess.
  // Foundation stock is declared base stock. For any other bird, both sire and dam
  // must be known and registered in the user's flock.
  const sireKey = s.toLowerCase();
  const damKey = d.toLowerCase();
  const sireInFlock = sireIsBase || fowls.some((f) => (f.name || '').trim().toLowerCase() === sireKey);
  const damInFlock = damIsBase || fowls.some((f) => (f.name || '').trim().toLowerCase() === damKey);

  const hasUnverifiedParentage =
    !isFoundation &&
    (!s || !d || sireIsBase !== damIsBase || !sireInFlock || !damInFlock);

  // Compute composition from the user's flock
  const stats: BloodlineStats | null = getFowlBloodlineStats(fowl, fowls);
  const entries = stats?.entries || [];
  const knownEntries = entries.filter((e) => !e.isUnknown && e.pct > 0);
  const unknownShare = stats?.unknownPct ?? 0;

  // If ancestry contains unregistered/unknown parents (unknownPct > 0) or missing parent
  if (hasUnverifiedParentage || unknownShare > PURITY_TOLERANCE || knownEntries.length === 0) {
    const result: BreedingClassification = {
      type: 'Unverified',
      purityPct: knownEntries.length > 0 ? knownEntries[0].pct : 0,
      dominantBreed: knownEntries.length > 0 ? knownEntries[0].strain : fowl.breed || 'Unverified',
      derivedBreed: fowl.breed || 'Unverified',
      badgeLabel: UNVERIFIED_LABEL,
      summary: UNVERIFIED_LABEL,
      topBreeds: knownEntries.slice(0, 2),
      allBreeds: knownEntries,
      extraBreedsCount: Math.max(0, knownEntries.length - 2),
      tooltipText: 'Parent ancestry is missing or unregistered in the flock registry.',
    };
    if (memo && memoKey) memo.set(memoKey, result);
    return result;
  }

  const dominant = knownEntries[0];
  const purityPct = dominant.pct;
  const isPure = knownEntries.length === 1 && Math.abs(purityPct - 100) <= PURITY_TOLERANCE;

  if (isPure) {
    const breedName = dominant.strain;
    const result: BreedingClassification = {
      type: 'Purebred',
      purityPct: 100,
      dominantBreed: breedName,
      derivedBreed: breedName,
      badgeLabel: `Purebred · 100% ${breedName}`,
      summary: `100% ${breedName}`,
      topBreeds: [{ strain: breedName, pct: 100 }],
      allBreeds: [{ strain: breedName, pct: 100 }],
      extraBreedsCount: 0,
      tooltipText: `Purebred ${breedName} (100% verified single-lineage)`,
    };
    if (memo && memoKey) memo.set(memoKey, result);
    return result;
  }

  // Crossbred: 2 or more breeds in composition
  // Derived breed label: strains joined by " × " in descending order of share
  const derivedBreed = knownEntries.map((e) => e.strain).join(' × ');
  const top2 = knownEntries.slice(0, 2);
  const extraCount = Math.max(0, knownEntries.length - 2);

  const top2BadgeStr = top2.map((e) => `${Math.round(e.pct * 10) / 10}% ${e.strain}`).join(' / ');
  const badgeLabel = extraCount > 0
    ? `Crossbred · ${top2BadgeStr} +${extraCount}`
    : `Crossbred · ${top2BadgeStr}`;

  const fullBreakdownStr = knownEntries.map((e) => `${Math.round(e.pct * 10) / 10}% ${e.strain}`).join(' / ');

  const result: BreedingClassification = {
    type: 'Crossbred',
    purityPct: Math.round(purityPct * 10) / 10,
    dominantBreed: dominant.strain,
    derivedBreed,
    badgeLabel,
    summary: fullBreakdownStr,
    topBreeds: top2,
    allBreeds: knownEntries,
    extraBreedsCount: extraCount,
    tooltipText: `Crossbred (${Math.round(purityPct * 10) / 10}% ${dominant.strain} dominant): ${fullBreakdownStr}`,
  };

  if (memo && memoKey) memo.set(memoKey, result);
  return result;
}

/**
 * Bulk classification helper with memoization over a flock.
 */
export function classifyFlock(
  fowls: FowlRecord[]
): Map<string, BreedingClassification> {
  const memo = new Map<string, BreedingClassification>();
  for (const f of fowls) {
    getBreedingClassification(f, fowls, memo);
  }
  return memo;
}

/**
 * Filter helper for Breeding Type filter.
 */
export function matchesBreedingTypeFilter(
  classification: BreedingClassification,
  filter: 'all' | 'purebred' | 'crossbred' | 'unverified'
): boolean {
  if (filter === 'all') return true;
  if (filter === 'purebred') return classification.type === 'Purebred';
  if (filter === 'crossbred') return classification.type === 'Crossbred';
  if (filter === 'unverified') return classification.type === 'Unverified';
  return true;
}

/**
 * Composition-aware breed matcher (Option 1):
 * Breed = X matches a chicken if:
 * 1. Its stored `breed` equals X (case-insensitive), OR
 * 2. Its composition contains strain X with share above the rounding tolerance (> PURITY_TOLERANCE).
 */
export function matchesBreedFilter(
  fowl: FowlRecord,
  classification: BreedingClassification,
  filterBreed: string
): boolean {
  if (!filterBreed || filterBreed === 'all') return true;
  const target = filterBreed.trim().toLowerCase();
  if ((fowl.breed || '').trim().toLowerCase() === target) return true;
  return classification.allBreeds.some(
    (b) => b.strain.trim().toLowerCase() === target && b.pct > PURITY_TOLERANCE
  );
}
