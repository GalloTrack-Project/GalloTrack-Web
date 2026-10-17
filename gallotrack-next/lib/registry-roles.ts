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
export const ROLE_FILTER_OPTIONS: RoleKey[] = [...REGISTRY_ROLES];

/**
 * Display-only labels. The stored value `registry_role = 'Non-Breeding'` (and
 * every tab id, filter value and API payload built from it) never changes —
 * only what the user reads changes. The offspring tab is shown as
 * "Offspring" across the UI.
 */
export const ROLE_LABEL: Record<RegistryRole, string> = {
  'Breeding Male': 'Breeding Male',
  'Breeding Female': 'Breeding Female',
  'Non-Breeding': 'Offspring',
};

/** Display label for a stored role; unknown values pass through unchanged. */
export const roleLabel = (role: string | null | undefined): string => {
  if (!role) return '';
  return ROLE_LABEL[role as RegistryRole] ?? role;
};

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

// ── Shared role-based counts (Dashboard & Registry tabs single source) ────

export interface RegistryCounts {
  /** Total active chickens (the three mutually exclusive roles sum to this). */
  total: number;
  /** Role: Breeding Male (sires). */
  breedingMales: number;
  /** Role: Breeding Female (dams). */
  breedingFemales: number;
  /** Role: Non-Breeding (offspring). */
  nonBreeding: number;
  /** Breeding designation: Sire Material (breeding potential tag, never a fourth role). */
  sireMaterial: number;
  /** Sex: Males (all active roosters/cocks/stags/males). */
  maleSex: number;
  /** Sex: Females (all active hens/pullets/females). */
  femaleSex: number;
  /** Whole flock total (all chickens in database: Active + Archived + Deceased). */
  flockTotal: number;
  /** Whole flock: Archived chickens count. */
  archived: number;
  /** Whole flock: Deceased chickens count. */
  deceased: number;
}

/**
 * Single shared function called by both the Dashboard and the Registry tabs,
 * ensuring role, flock status, and sex counts can never drift out of sync.
 *
 * Invariants:
 * 1. breedingMales + breedingFemales + nonBreeding === total (Active: 3 + 7 + 19 = 29)
 * 2. total + archived + deceased === flockTotal (Total: 29 + 1 + 1 = 31)
 * 3. maleSex + femaleSex === total (Sex: 15 + 14 = 29)
 * 4. breedingMales === registryTabLists(fowls).males.length
 * 5. breedingFemales === registryTabLists(fowls).females.length
 * 6. nonBreeding === registryTabLists(fowls).nonBreeding.length
 */
export function getRegistryCounts(fowls: FowlRecord[]): RegistryCounts {
  const lists = registryTabLists(fowls);
  const maleSex = lists.active.filter((f) => isMale(f.gender)).length;
  const femaleSex = lists.active.filter((f) => isFemale(f.gender)).length;
  return {
    total: lists.active.length,
    breedingMales: lists.males.length,
    breedingFemales: lists.females.length,
    nonBreeding: lists.nonBreeding.length,
    sireMaterial: lists.sireMaterial.length,
    maleSex,
    femaleSex,
    flockTotal: fowls.length,
    archived: lists.archived.length,
    deceased: lists.deceased.length,
  };
}

// ── Inventory tab counts (single vocabulary with the Registry) ─────────────

/**
 * Configurable breeding readiness age thresholds in days.
 * Kept at 240 until farm owner confirms a preferred value.
 * Configured in a single place with built-in support for separate rooster and hen values:
 * - male: minimum days for Roosters / Cocks / Stags
 * - female: minimum days for Hens / Pullets
 * - default: fallback if gender is unspecified
 */
export const MIN_BREEDING_AGE_BY_SEX: { male: number; female: number; default: number } = {
  male: 240,
  female: 240,
  default: 240,
};

export const MIN_BREEDING_AGE_DAYS = MIN_BREEDING_AGE_BY_SEX.default; // Single named constant
export const BREEDING_READY_MIN_DAYS = MIN_BREEDING_AGE_DAYS; // Backward-compatibility alias
export const BREEDING_READY_LOOKAHEAD_DAYS = 30;

/**
 * Returns the configured minimum breeding age in days.
 * If gender is provided, uses sex-specific threshold from MIN_BREEDING_AGE_BY_SEX;
 * otherwise returns MIN_BREEDING_AGE_DAYS.
 */
export function getMinBreedingAgeDays(gender?: string | null): number {
  if (!gender) return MIN_BREEDING_AGE_BY_SEX.default;
  const g = gender.trim().toLowerCase();
  if (g === 'hen' || g === 'female' || g === 'pullet') {
    return MIN_BREEDING_AGE_BY_SEX.female;
  }
  if (g === 'rooster' || g === 'male' || g === 'cock' || g === 'stag') {
    return MIN_BREEDING_AGE_BY_SEX.male;
  }
  return MIN_BREEDING_AGE_BY_SEX.default;
}

function ageInDays(f: FowlRecord, now: number): number | null {
  const birth = (f.birthdate || '').trim();
  if (!birth) return null;
  const days = (now - new Date(birth).getTime()) / 86400000;
  return Number.isFinite(days) ? days : null;
}

/**
 * Ready to Breed rule:
 * - Active: isActiveStatus(f) is true, activity_status !== 'inactive',
 *   archive_kind !== 'retired'/'inactive'/'sold'
 * - Not retired from breeding: retired_scope !== 'breeding' && retired_scope !== 'both'
 * - Not infertile: condition_status !== 'Infertile' (case-insensitive)
 * - Either an Active Breeder (Breeding Male or Female) OR a Breeding Stock offspring
 *   (Non-Breeding offspring with breeding_role === 'material' | 'breeder')
 * - Age is at or above MIN_BREEDING_AGE_DAYS (missing birth date returns false; does not guess from growth stages).
 * - Growth stage names are never hardcoded to exclude birds that meet the age rule.
 */
export function isBreedingReady(
  f: FowlRecord,
  ctx?: RegistryContext,
  now: number = Date.now(),
): boolean {
  if (!isActiveStatus(f)) return false;
  if (f.activity_status === 'inactive') return false;
  if (f.archive_kind === 'retired' || f.archive_kind === 'inactive' || f.archive_kind === 'sold') return false;
  if (f.retired_scope === 'breeding' || f.retired_scope === 'both') return false;
  if ((f.condition_status || '').trim().toLowerCase() === 'infertile') return false;

  const role = roleOf(f, ctx);
  const isActiveBreeder = role === 'Breeding Male' || role === 'Breeding Female';
  const isBreedingStockOff = role === 'Non-Breeding' && isBreedingStockOffspring(f);
  if (!isActiveBreeder && !isBreedingStockOff) return false;

  const days = ageInDays(f, now);
  if (days === null) return false;
  return days >= getMinBreedingAgeDays(f.gender);
}

/**
 * Whole days left before the MIN_BREEDING_AGE_DAYS maturity threshold (1 = ready tomorrow).
 * null when the chicken is not active, retired, inactive, infertile, not an active breeder or
 * breeding stock offspring, has no usable birthdate, or is already ready.
 */
export function daysUntilBreedingReady(
  f: FowlRecord,
  now: number = Date.now(),
  ctx?: RegistryContext,
): number | null {
  if (!isActiveStatus(f)) return null;
  if (f.activity_status === 'inactive') return null;
  if (f.archive_kind === 'retired' || f.archive_kind === 'inactive' || f.archive_kind === 'sold') return null;
  if (f.retired_scope === 'breeding' || f.retired_scope === 'both') return null;
  if ((f.condition_status || '').trim().toLowerCase() === 'infertile') return null;

  const role = roleOf(f, ctx);
  const isActiveBreeder = role === 'Breeding Male' || role === 'Breeding Female';
  const isBreedingStockOff = role === 'Non-Breeding' && isBreedingStockOffspring(f);
  if (!isActiveBreeder && !isBreedingStockOff) return null;

  const days = ageInDays(f, now);
  if (days === null) return null;
  const remaining = Math.ceil(getMinBreedingAgeDays(f.gender) - days);
  return remaining > 0 ? remaining : null;
}

/** True when the chicken becomes ready to breed within BREEDING_READY_LOOKAHEAD_DAYS (inclusive). */
export function isBreedingReadySoon(
  f: FowlRecord,
  now: number = Date.now(),
  ctx?: RegistryContext,
): boolean {
  const remaining = daysUntilBreedingReady(f, now, ctx);
  return remaining !== null && remaining >= 1 && remaining <= BREEDING_READY_LOOKAHEAD_DAYS;
}

/**
 * The breeding herd behind the "Active Breeders" (formerly Breeders Stock) inventory tab:
 * living birds whose registry role is Breeding Male or Breeding Female.
 * Offspring chickens designated for breeding (breeding_role = 'material' | 'breeder')
 * stay under the Registry Offspring "Breeding Stock" pill until promoted to Breeding Male or Breeding Female.
 */
export function isBreederStock(f: FowlRecord, ctx?: RegistryContext): boolean {
  if (!isActiveStatus(f)) return false;
  const role = roleOf(f, ctx);
  return role === 'Breeding Male' || role === 'Breeding Female';
}

export interface InventoryCounts {
  all: number;
  active: number;
  /** Living breeding herd (Active Breeders tab): excludes all Offspring / Fight Prospects. */
  breedersStock: number;
  breedingReady: number;
  archived: number;
  deceased: number;
}

export function inventoryCounts(fowls: FowlRecord[], ctx?: RegistryContext): InventoryCounts {
  return {
    all: fowls.length,
    active: fowls.filter(isActiveStatus).length,
    breedersStock: fowls.filter((f) => isBreederStock(f, ctx)).length,
    breedingReady: fowls.filter((f) => isBreedingReady(f, ctx)).length,
    archived: fowls.filter(isArchivedStatus).length,
    deceased: fowls.filter(isDeceasedStatus).length,
  };
}

// ── Birth Date Validation ─────────────────────────────────────────────────

export interface BirthdateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates offspring birth date against parent records:
 * - Error (blocking): Offspring birth date cannot be earlier than either parent's birth date.
 * - Warning (non-blocking): Warn if a parent was younger than MIN_BREEDING_AGE_DAYS at offspring birth.
 */
export function validateOffspringBirthdate(
  birthdate: string | null | undefined,
  sireNameOrCode: string | null | undefined,
  damNameOrCode: string | null | undefined,
  fowls: FowlRecord[],
): BirthdateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawBd = (birthdate || '').trim();
  if (!rawBd) {
    return { valid: true, errors, warnings };
  }

  const childTime = new Date(rawBd).getTime();
  if (isNaN(childTime)) {
    return { valid: false, errors: ['Invalid birth date format.'], warnings };
  }

  const checkParent = (nameOrCode: string | null | undefined, roleLabel: 'Sire' | 'Dam') => {
    const raw = (nameOrCode || '').trim();
    if (!raw || raw.toLowerCase() === 'foundation stock') return;
    const lower = raw.toLowerCase();
    const parent = fowls.find(
      (f) =>
        (f.name || '').trim().toLowerCase() === lower ||
        (f.bird_code || '').trim().toLowerCase() === lower,
    );
    if (!parent || !parent.birthdate) return;

    const parentTime = new Date(parent.birthdate).getTime();
    if (isNaN(parentTime)) return;

    if (childTime < parentTime) {
      errors.push(
        `Birth date cannot be earlier than ${roleLabel}'s birth date (${parent.name || parent.bird_code} was born on ${parent.birthdate}).`,
      );
    } else {
      const parentAgeDays = Math.floor((childTime - parentTime) / 86400000);
      const minAge = getMinBreedingAgeDays(parent.gender || (roleLabel === 'Sire' ? 'Male' : 'Female'));
      if (parentAgeDays < minAge) {
        warnings.push(
          `${roleLabel} (${parent.name || parent.bird_code}) was only ${parentAgeDays} days old when this offspring was born (recommended minimum breeding age is ${minAge} days).`,
        );
      }
    }
  };

  checkParent(sireNameOrCode, 'Sire');
  checkParent(damNameOrCode, 'Dam');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
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

// ── Offspring Breeding Classification & Fighting Status ─────────────

/**
 * Mutually exclusive breeding classifications for Offspring:
 * - 'all': All registered offspring (default)
 * - 'breeding-stock': Offspring designated as future breeders (Sire Material or breeding_role === 'breeder')
 * - 'non-breeding': Offspring not designated for breeding
 *
 * Invariant: breedingStock + nonBreeding === all.
 * Every offspring chicken has exactly one classification.
 */
export type BreedingClassification = 'all' | 'breeding-stock' | 'non-breeding';
export const BREEDING_CLASSIFICATIONS: readonly BreedingClassification[] = [
  'all',
  'breeding-stock',
  'non-breeding',
] as const;

export interface BreedingClassificationCounts {
  all: number;
  breedingStock: number;
  nonBreeding: number;
}

/**
 * Fighting status filter values (independent dimension from breeding classification):
 * - 'all': All chickens (default)
 * - 'without': No fight record (0 rows in match table)
 * - 'with': Has fight record (>= 1 row in match table)
 */
export type FightStatusFilter = 'all' | 'with' | 'without';
export const FIGHT_STATUS_FILTERS: readonly FightStatusFilter[] = ['all', 'with', 'without'] as const;

/**
 * Backward compatibility type alias for any legacy imports.
 */
export type ProspectCategory = BreedingClassification | 'fight-prospects';
export const PROSPECT_CATEGORIES = BREEDING_CLASSIFICATIONS;

export interface ProspectCategoryCounts extends BreedingClassificationCounts {
  /** @deprecated legacy alias */
  fightProspects?: number;
  /** @deprecated legacy alias */
  noFight?: number;
}

/**
 * Rule for "Breeding Stock" offspring in the Offspring tab:
 * Offspring chickens designated as future breeders:
 * - Stored via breeding_role === 'material' (Sire Material prospect) or
 *   breeding_role === 'breeder'
 * - Status is Active (archived/deceased are in Inventory).
 */
export function isBreedingStockOffspring(fowl: FowlRecord): boolean {
  if (!isActiveStatus(fowl)) return false;
  if (fowl.retired_scope === 'breeding' || fowl.retired_scope === 'both') return false;
  if (fowl.archive_kind === 'retired' || fowl.archive_kind === 'inactive' || fowl.archive_kind === 'sold') return false;
  if (fowl.activity_status === 'inactive') return false;
  return fowl.breeding_role === 'material' || fowl.breeding_role === 'breeder';
}

/**
 * Rule for "Non-Breeding" offspring in the Offspring tab:
 * Offspring chickens not designated for breeding.
 * Strictly mutually exclusive with isBreedingStockOffspring:
 * breedingStock + nonBreeding = all offspring.
 * Safe default: NULL/unassigned breeding_role defaults to non-breeding.
 */
export function isNonBreedingOffspring(fowl: FowlRecord): boolean {
  return !isBreedingStockOffspring(fowl);
}

/**
 * Backward-compatible alias for isNonBreedingOffspring.
 */
export const isNonBreedingProspect = isNonBreedingOffspring;

/**
 * Extract set of fought fowl IDs (and names fallback) from match records.
 * Primary foreign key is match.fowl_id.
 */
export function extractFoughtLookups(matchHistory: MatchRecord[]): {
  foughtFowlIds: Set<number>;
  foughtNames: Set<string>;
} {
  const foughtFowlIds = new Set<number>();
  const foughtNames = new Set<string>();
  for (const m of matchHistory) {
    if (m.fowl_id != null && typeof m.fowl_id === 'number') {
      foughtFowlIds.add(m.fowl_id);
    }
    // Orphan matches (fowl_id == null) are historical entries and do not attach to chickens by name fallback
  }
  return { foughtFowlIds, foughtNames };
}

/**
 * Determines whether a chicken has a fight record in `match`.
 * Evaluates `fowl_id` strictly (foreign key in match).
 */
export function hasFightRecord(
  fowl: FowlRecord,
  foughtFowlIds: Set<number>,
  _foughtNames?: Set<string>,
): boolean {
  return foughtFowlIds.has(fowl.id);
}

/**
 * Predicate: true if chicken qualifies as a Retired Fighter:
 * 1. Has at least one recorded fight in `match` (hasFightRecord is true).
 * 2. Is currently designated for breeding:
 *    - Active Breeder (roleOf is 'Breeding Male' or 'Breeding Female'), OR
 *    - Offspring Breeding Stock (roleOf is 'Non-Breeding' and f.breeding_role === 'material' or 'breeder').
 */
export function isRetiredFighter(
  fowl: FowlRecord,
  foughtFowlIds: Set<number>,
  foughtNames?: Set<string>,
  ctx?: RegistryContext,
): boolean {
  if (!hasFightRecord(fowl, foughtFowlIds, foughtNames)) return false;
  const role = roleOf(fowl, ctx);
  if (role === 'Breeding Male' || role === 'Breeding Female') {
    return true;
  }
  if (role === 'Non-Breeding') {
    return fowl.breeding_role === 'material' || fowl.breeding_role === 'breeder';
  }
  return false;
}

/**
 * Predicate: true if chicken has NO fight record.
 */
export function isFightProspect(
  fowl: FowlRecord,
  foughtFowlIdsOrNames: Set<number | string>,
  fallbackNames?: Set<string>,
): boolean {
  for (const item of foughtFowlIdsOrNames) {
    if (typeof item === 'number') {
      return !hasFightRecord(fowl, foughtFowlIdsOrNames as unknown as Set<number>, fallbackNames);
    }
    break;
  }
  const nameSet = (fallbackNames || foughtFowlIdsOrNames) as unknown as Set<string>;
  return !nameSet.has((fowl.name || '').trim().toLowerCase());
}

/**
 * Filter a list of offspring chickens by BreedingClassification.
 */
export function filterOffspringByClassification(
  offspring: FowlRecord[],
  classification: BreedingClassification | string,
): FowlRecord[] {
  if (classification === 'breeding-stock') {
    return offspring.filter(isBreedingStockOffspring);
  }
  if (classification === 'non-breeding') {
    return offspring.filter(isNonBreedingOffspring);
  }
  return offspring;
}

/**
 * Backward compatibility alias for filterProspectsByCategory.
 */
export function filterProspectsByCategory(
  prospects: FowlRecord[],
  category: string,
  foughtNames?: Set<string>,
): FowlRecord[] {
  if (category === 'breeding-stock') return filterOffspringByClassification(prospects, 'breeding-stock');
  if (category === 'non-breeding') return filterOffspringByClassification(prospects, 'non-breeding');
  if (category === 'fight-prospects' || category === 'no-fight') {
    return prospects.filter((f) => isFightProspect(f, foughtNames || new Set<string>()));
  }
  return prospects;
}

/**
 * Compute counts for all offspring breeding classifications in a single pass.
 * Strictly guarantees: breedingStock + nonBreeding === all.
 */
export function getOffspringClassificationCounts(
  offspring: FowlRecord[],
): BreedingClassificationCounts {
  let breedingStock = 0;
  let nonBreeding = 0;
  for (const f of offspring) {
    if (isBreedingStockOffspring(f)) {
      breedingStock++;
    } else {
      nonBreeding++;
    }
  }
  return {
    all: offspring.length,
    breedingStock,
    nonBreeding,
  };
}

/**
 * Backward compatibility alias for getProspectCategoryCounts.
 */
export function getProspectCategoryCounts(
  prospects: FowlRecord[],
  foughtNames?: Set<string>,
): ProspectCategoryCounts {
  const counts = getOffspringClassificationCounts(prospects);
  let fightProspects = 0;
  if (foughtNames) {
    for (const f of prospects) {
      if (!foughtNames.has((f.name || '').trim().toLowerCase())) fightProspects++;
    }
  }
  return {
    ...counts,
    fightProspects,
    noFight: fightProspects,
  };
}
