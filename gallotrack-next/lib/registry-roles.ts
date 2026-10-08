import type { FowlRecord, MatchRecord } from './types';
import { isMale, isFemale } from './helpers';
import { compareBirdCodesNatural, resolveBirdCodes } from './bird-code';

/**
 * Single source of truth for lifecycle status and registry role.
 *
 * Rules (Task A de-duplication between Chicken Registry and Chicken Inventory):
 * - ONE lifecycle status field: Active | Archived | Deceased (+ archive reasons).
 *   'Sire Material' is NOT a status — it is a breeding designation carried by
 *   breeding_role = 'material' (legacy status rows are pending normalization).
 * - ONE registry role field: Breeding Male | Breeding Female | Non-Breeding
 *   (fowl.registry_role, NULL = pending backfill). While NULL, tab membership
 *   falls back to the legacy derivation so nothing moves before approval.
 * - Both pages read from the selectors in this file; no page keeps its own copy.
 */

export type LifecycleStatus = 'Active' | 'Archived' | 'Deceased';
export type RegistryRole = 'Breeding Male' | 'Breeding Female' | 'Non-Breeding';
export type RoleKey = RegistryRole | 'Sire Material';

export const LIFECYCLE_STATUSES: LifecycleStatus[] = ['Active', 'Archived', 'Deceased'];
export const REGISTRY_ROLES: RegistryRole[] = ['Breeding Male', 'Breeding Female', 'Non-Breeding'];
export const ROLE_FILTER_OPTIONS: RoleKey[] = [...REGISTRY_ROLES, 'Sire Material'];

// ── status predicates (single lifecycle status vocabulary) ─────────────────

export const isActiveStatus = (f: Pick<FowlRecord, 'status'>): boolean =>
  f.status === 'Active' || !f.status || f.status === 'active';

export const isArchivedStatus = (f: Pick<FowlRecord, 'status'>): boolean => f.status === 'Archived';

export const isDeceasedStatus = (f: Pick<FowlRecord, 'status'>): boolean => f.status === 'Deceased';

/** Legacy status value kept only until the pending normalization SQL runs. */
export const isLegacySireMaterialStatus = (f: Pick<FowlRecord, 'status'>): boolean =>
  f.status === 'Sire Material';

/** Sire Material is a ROLE (breeding_role = material), never a lifecycle status. */
export const isSireMaterialRole = (f: Pick<FowlRecord, 'breeding_role'>): boolean =>
  f.breeding_role === 'material';

// ── role predicates ────────────────────────────────────────────────────────

export function normalizeRegistryRole(value: unknown): RegistryRole | null {
  const v = String(value ?? '').trim();
  if (v === 'Breeding Male' || v === 'Breeding Female' || v === 'Non-Breeding') return v;
  return null;
}

/** The stored role field, or NULL while the backfill is still pending. */
export const storedRegistryRole = (f: Pick<FowlRecord, 'registry_role'>): RegistryRole | null =>
  normalizeRegistryRole(f.registry_role);

export interface RegistryContext {
  /**
   * Lowercase names of birds that have registered offspring in this farm.
   */
  parentNames: Set<string>;
}

/** Child of a registered active parent. */
export const isRegisteredChild = (
  f: Pick<FowlRecord, 'sire' | 'dam'>,
  ctx?: RegistryContext,
): boolean => {
  const s = (f.sire || '').trim().toLowerCase();
  const d = (f.dam || '').trim().toLowerCase();
  if (ctx) {
    return (!!s && ctx.parentNames.has(s)) || (!!d && ctx.parentNames.has(d));
  }
  return (!!s && s !== 'foundation stock') || (!!d && d !== 'foundation stock');
};

/**
 * Exclusive role for one bird (hard rule: one chicken has exactly one role).
 *
 * Source of truth: stored registry_role.
 * Fallback (deterministic single-role derivation):
 * - If the bird is a registered parent of offspring in this farm OR
 *   is Foundation Stock (no registered parents):
 *   Male -> 'Breeding Male', Female -> 'Breeding Female'
 * - Else (offspring of a breeding pair without registered children of its own):
 *   'Non-Breeding'
 */
export function roleOf(
  f: FowlRecord,
  ctx?: RegistryContext,
): RegistryRole {
  const stored = storedRegistryRole(f);
  if (stored) return stored;

  const s = (f.sire || '').trim().toLowerCase();
  const d = (f.dam || '').trim().toLowerCase();
  const hasParents = (!!s && s !== 'foundation stock') || (!!d && d !== 'foundation stock');
  const nameKey = (f.name || '').trim().toLowerCase();
  const isParent = ctx ? ctx.parentNames.has(nameKey) : false;

  if (!hasParents || isParent) {
    return isMale(f.gender) ? 'Breeding Male' : 'Breeding Female';
  }
  return 'Non-Breeding';
}

/**
 * Startup / CI assertion: fails if the same chicken ID appears in more than one tab's results.
 */
export function assertTabExclusivity(
  males: FowlRecord[],
  females: FowlRecord[],
  nonBreeding: FowlRecord[],
): void {
  const seen = new Map<number, string>();
  for (const m of males) {
    if (seen.has(m.id)) {
      throw new Error(
        `Tab exclusivity hard rule violated: Chicken #${m.id} ("${m.name}") appears in multiple tabs (${seen.get(m.id)} and Breeding Male)`,
      );
    }
    seen.set(m.id, 'Breeding Male');
  }
  for (const f of females) {
    if (seen.has(f.id)) {
      throw new Error(
        `Tab exclusivity hard rule violated: Chicken #${f.id} ("${f.name}") appears in multiple tabs (${seen.get(f.id)} and Breeding Female)`,
      );
    }
    seen.set(f.id, 'Breeding Female');
  }
  for (const nb of nonBreeding) {
    if (seen.has(nb.id)) {
      throw new Error(
        `Tab exclusivity hard rule violated: Chicken #${nb.id} ("${nb.name}") appears in multiple tabs (${seen.get(nb.id)} and Non-Breeding)`,
      );
    }
    seen.set(nb.id, 'Non-Breeding');
  }
}

/**
 * Tab membership for the Registry (and the Inventory role filter).
 *
 * Hard rule:
 * - Active only (status = Active)
 * - Filter strictly by role = X. Roles are mutually exclusive.
 * - A chicken in Breeding Male or Breeding Female NEVER appears in Non-Breeding.
 * - An offspring in Non-Breeding NEVER appears in Breeding Male or Female.
 */
export function inRegistryTab(f: FowlRecord, tab: RoleKey, ctx: RegistryContext): boolean {
  if (tab === 'Sire Material') {
    return isSireMaterialRole(f) && (isActiveStatus(f) || isLegacySireMaterialStatus(f));
  }
  if (!isActiveStatus(f)) return false;
  return roleOf(f, ctx) === tab;
}

// ── selectors (both pages read from here) ─────────────────────────────────

export interface RegistryLists {
  active: FowlRecord[];
  archived: FowlRecord[];
  deceased: FowlRecord[];
  males: FowlRecord[];
  females: FowlRecord[];
  nonBreeding: FowlRecord[];
  sireMaterial: FowlRecord[];
  undecided: FowlRecord[];
  parentNames: Set<string>;
  ctx: RegistryContext;
}

export function buildRegistryContext(fowls: FowlRecord[]): RegistryContext {
  const parentNames = new Set<string>();
  fowls.forEach((f) => {
    const s = (f.sire || '').trim().toLowerCase();
    const d = (f.dam || '').trim().toLowerCase();
    if (s && s !== 'foundation stock') parentNames.add(s);
    if (d && d !== 'foundation stock') parentNames.add(d);
  });
  return { parentNames };
}

/** Every list the Chicken Registry renders — one call, strict mutual exclusivity. */
export function registryTabLists(fowls: FowlRecord[]): RegistryLists {
  const ctx = buildRegistryContext(fowls);
  const active: FowlRecord[] = [];
  const archived: FowlRecord[] = [];
  const deceased: FowlRecord[] = [];
  fowls.forEach((f) => {
    if (isActiveStatus(f)) active.push(f);
    else if (isArchivedStatus(f)) archived.push(f);
    else if (isDeceasedStatus(f)) deceased.push(f);
  });
  const males = active.filter((f) => inRegistryTab(f, 'Breeding Male', ctx));
  const females = active.filter((f) => inRegistryTab(f, 'Breeding Female', ctx));
  const nonBreeding = active.filter((f) => inRegistryTab(f, 'Non-Breeding', ctx));
  const sireMaterial = active.filter((f) => inRegistryTab(f, 'Sire Material', ctx));
  const undecided: FowlRecord[] = [];

  // Exclusivity check: hard assertion fails if any chicken ID appears in > 1 tab
  assertTabExclusivity(males, females, nonBreeding);

  return { active, archived, deceased, males, females, nonBreeding, sireMaterial, undecided, parentNames: ctx.parentNames, ctx };
}

// ── Inventory tab counts (single vocabulary with the Registry) ─────────────

const BREEDING_READY_MIN_DAYS = 240; // ~8 months: mature enough to breed
const MATURE_STAGES = new Set(['cock', 'hen', 'bull stag', 'senior hen', 'broodcock', 'broodhen', 'mature']);

/**
 * Active + at least 8 months old; when no birthdate is recorded, fall back to a mature growth stage.
 */
export function isBreedingReady(f: FowlRecord): boolean {
  if (!isActiveStatus(f)) return false;
  const birth = (f.birthdate || '').trim();
  if (birth) {
    const days = (Date.now() - new Date(birth).getTime()) / 86400000;
    if (Number.isFinite(days)) return days >= BREEDING_READY_MIN_DAYS;
  }
  return MATURE_STAGES.has((f.growth_stage || '').trim().toLowerCase());
}

export interface InventoryCounts {
  all: number;
  active: number;
  breedingReady: number;
  archived: number;
  deceased: number;
}

export function inventoryCounts(fowls: FowlRecord[]): InventoryCounts {
  return {
    all: fowls.length,
    active: fowls.filter(isActiveStatus).length,
    breedingReady: fowls.filter(isBreedingReady).length,
    archived: fowls.filter(isArchivedStatus).length,
    deceased: fowls.filter(isDeceasedStatus).length,
  };
}

// ── invariants (enforced by lib/registry-roles.test.ts) ────────────────────

export interface CountRuleReport {
  /** M + F + Non-Breeding as the Registry shows them. */
  registryTabSum: number;
  /** Total active chickens. */
  activeCount: number;
  registryRuleOk: boolean;
  /** Active birds whose registry_role is still NULL (backfill pending). */
  pendingRoleCount: number;
  /** Inventory: Active + Archived + Deceased. */
  inventoryLifecycleSum: number;
  inventoryAll: number;
  inventoryRuleOk: boolean;
  /** Rows still carrying the legacy 'Sire Material' status (normalization pending). */
  legacySireMaterialStatusCount: number;
  overlappingChickenIds: number[];
}

export function countRuleCheck(fowls: FowlRecord[]): CountRuleReport {
  const lists = registryTabLists(fowls);
  const registryTabSum = lists.males.length + lists.females.length + lists.nonBreeding.length;
  const activeCount = lists.active.length;
  const pendingRoleCount = lists.active.filter((f) => !storedRegistryRole(f)).length;
  const inventoryLifecycleSum =
    lists.active.length + lists.archived.length + lists.deceased.length;
  const legacySireMaterialStatusCount = fowls.filter(isLegacySireMaterialStatus).length;

  const maleIds = new Set(lists.males.map((f) => f.id));
  const femaleIds = new Set(lists.females.map((f) => f.id));
  const nbIds = new Set(lists.nonBreeding.map((f) => f.id));

  const overlaps: number[] = [];
  lists.active.forEach((f) => {
    let hits = 0;
    if (maleIds.has(f.id)) hits++;
    if (femaleIds.has(f.id)) hits++;
    if (nbIds.has(f.id)) hits++;
    if (hits > 1) overlaps.push(f.id);
  });

  return {
    registryTabSum,
    activeCount,
    registryRuleOk: registryTabSum === activeCount && overlaps.length === 0,
    pendingRoleCount,
    inventoryLifecycleSum,
    inventoryAll: fowls.length,
    inventoryRuleOk: inventoryLifecycleSum === fowls.length,
    legacySireMaterialStatusCount,
    overlappingChickenIds: overlaps,
  };
}

// ── Sort system (Task B — one comparator set, applied before pagination) ───

export type RegistrySortKey =
  | 'identifier'
  | 'name'
  | 'newest'
  | 'oldest'
  | 'age'
  | 'offspring'
  | 'wins';

export const REGISTRY_SORT_OPTIONS: { value: RegistrySortKey; label: string }[] = [
  { value: 'identifier', label: 'Identifier (1A2 before 1A10)' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'age', label: 'Age' },
  { value: 'offspring', label: 'Most offspring' },
  { value: 'wins', label: 'Most wins' },
];

const ageDays = (birthdate?: string | null): number => {
  const b = (birthdate || '').trim();
  if (!b) return Number.POSITIVE_INFINITY;
  const days = (Date.now() - new Date(b).getTime()) / 86400000;
  return Number.isFinite(days) ? days : Number.POSITIVE_INFINITY;
};

export interface RegistrySortContext {
  fowls: FowlRecord[];
  matchHistory: MatchRecord[];
}

/**
 * Build the comparator for one sort key. Sorting happens AFTER search and
 * filters and BEFORE pagination, so page slices always reflect the chosen
 * order. The natural-order identifier comparison lives in lib/bird-code.ts.
 */
export function makeRegistryComparator(
  key: RegistrySortKey,
  ctx: RegistrySortContext,
): (a: FowlRecord, b: FowlRecord) => number {
  const { fowls, matchHistory } = ctx;
  const codes = resolveBirdCodes(fowls);

  let childCount: Map<string, number> | null = null;
  if (key === 'offspring') {
    childCount = new Map();
    fowls.forEach((f) => {
      [f.sire, f.dam].forEach((p) => {
        const k = (p || '').trim().toLowerCase();
        if (k) childCount!.set(k, (childCount!.get(k) || 0) + 1);
      });
    });
  }

  let winCount: Map<string, number> | null = null;
  if (key === 'wins') {
    winCount = new Map();
    matchHistory.forEach((m) => {
      if ((m.outcome || '').toLowerCase() !== 'win') return;
      const k = (m.entry_name || '').trim().toLowerCase();
      if (k) winCount!.set(k, (winCount!.get(k) || 0) + 1);
    });
  }

  const codeOf = (f: FowlRecord) => codes.get(String(f.id)) || '';
  const tie = (a: FowlRecord, b: FowlRecord) => a.id - b.id;

  return (a, b) => {
    switch (key) {
      case 'identifier': {
        const r = compareBirdCodesNatural(codeOf(a), codeOf(b));
        return r !== 0 ? r : tie(a, b);
      }
      case 'name': {
        const r = a.name.localeCompare(b.name);
        return r !== 0 ? r : tie(a, b);
      }
      case 'newest': {
        const r = String(b.created_at || '').localeCompare(String(a.created_at || ''));
        return r !== 0 ? r : b.id - a.id;
      }
      case 'oldest': {
        const r = String(a.created_at || '').localeCompare(String(b.created_at || ''));
        return r !== 0 ? r : a.id - b.id;
      }
      case 'age': {
        const r = ageDays(a.birthdate) - ageDays(b.birthdate);
        return r !== 0 ? r : tie(a, b);
      }
      case 'offspring': {
        const ca = childCount!.get((a.name || '').trim().toLowerCase()) || 0;
        const cb = childCount!.get((b.name || '').trim().toLowerCase()) || 0;
        return cb - ca || tie(a, b);
      }
      case 'wins': {
        const wa = winCount!.get((a.name || '').trim().toLowerCase()) || 0;
        const wb = winCount!.get((b.name || '').trim().toLowerCase()) || 0;
        return wb - wa || tie(a, b);
      }
      default:
        return tie(a, b);
    }
  };
}
