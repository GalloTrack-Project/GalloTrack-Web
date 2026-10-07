import type { BreedingPairRecord, FowlRecord } from './types';
import { isKnownParent, nameKey, normalizeParentName } from './family-tree';
import { normalizeBirdCode } from './bird-code';
import { offspringBaseCode } from './breeding';

/** 'foundation stock' and blank names never resolve to a registry row. */
export const isResolvableParentName = (value?: string | null): boolean =>
  normalizeParentName(value) !== '' && isKnownParent(value);

const sameFarm = (
  a: { user_id?: string | number } | null | undefined,
  b: { user_id?: string | number } | null | undefined
): boolean => {
  if (a?.user_id == null || b?.user_id == null) return true;
  return String(a.user_id) === String(b.user_id);
};

/** Unique, non-self, same-farm name match — the only case we trust as an id link. */
export function resolveParentId(
  parentName: string | null | undefined,
  child: { id?: number; user_id?: string | number } | null | undefined,
  fowls: FowlRecord[]
): number | null {
  const key = nameKey(parentName);
  if (!key || !isKnownParent(parentName)) return null;
  const matches = fowls.filter(
    (f) =>
      nameKey(f.name) === key &&
      (child?.id == null || f.id !== child.id) &&
      sameFarm(f, child)
  );
  return matches.length === 1 ? matches[0].id : null;
}

/** Resolved parent ids for a child being created/edited from sire/dam names. */
export function parentLinkIds(
  child: { id?: number; user_id?: string | number },
  sireName: string | null | undefined,
  damName: string | null | undefined,
  fowls: FowlRecord[]
): { sire_id: number | null; dam_id: number | null } {
  return {
    sire_id: resolveParentId(sireName, child, fowls),
    dam_id: resolveParentId(damName, child, fowls),
  };
}

/** Parent row: id link first, unambiguous name match as legacy fallback. */
export function parentRecordOf(
  child: FowlRecord,
  role: 'sire' | 'dam',
  fowls: FowlRecord[]
): FowlRecord | null {
  const linkedId = role === 'sire' ? child.sire_id : child.dam_id;
  if (linkedId != null) {
    const linked = fowls.find((f) => f.id === linkedId);
    if (linked) return linked;
  }
  const id = resolveParentId(role === 'sire' ? child.sire : child.dam, child, fowls);
  return id != null ? fowls.find((f) => f.id === id) ?? null : null;
}

/** Children of a bird — id link first, parent-name match for legacy rows. */
export function childrenOf(parent: FowlRecord, fowls: FowlRecord[]): FowlRecord[] {
  const key = nameKey(parent.name);
  return fowls.filter((c) => {
    if (c.sire_id != null || c.dam_id != null) {
      return c.sire_id === parent.id || c.dam_id === parent.id;
    }
    return nameKey(c.sire) === key || nameKey(c.dam) === key;
  });
}

/** Pairings where this bird is the sire or the dam (id link, name fallback). */
export function pairingsFor(bird: FowlRecord, pairings: BreedingPairRecord[]): BreedingPairRecord[] {
  const key = nameKey(bird.name);
  return pairings.filter(
    (p) =>
      p.sire_id === bird.id ||
      p.dam_id === bird.id ||
      (p.sire_id == null && nameKey(p.sire_name) === key) ||
      (p.dam_id == null && nameKey(p.dam_name) === key)
  );
}

/** The bird's current partner, if it has one 'Active' pairing. */
export function activePartnerOf(
  bird: FowlRecord,
  pairings: BreedingPairRecord[],
  fowls: FowlRecord[]
): { partner: FowlRecord | null; pairing: BreedingPairRecord } | null {
  const active = pairingsFor(bird, pairings).find((p) => p.outcome === 'Active');
  if (!active) return null;

  const birdKey = nameKey(bird.name);
  const isSire =
    active.sire_id === bird.id ||
    (active.sire_id == null && nameKey(active.sire_name) === birdKey);
  const partnerId = isSire ? active.dam_id : active.sire_id;
  const partnerName = isSire ? active.dam_name : active.sire_name;

  let partner =
    partnerId != null ? fowls.find((f) => f.id === partnerId) ?? null : null;
  if (!partner) {
    const id = resolveParentId(partnerName, bird, fowls);
    partner = id != null ? fowls.find((f) => f.id === id) ?? null : null;
  }
  return { partner, pairing: active };
}

/** Offspring recorded for a pairing — pairing_id link, couple match as fallback. */
export function offspringForPairing(
  pairing: BreedingPairRecord,
  fowls: FowlRecord[]
): FowlRecord[] {
  return fowls.filter((c) => {
    if (c.pairing_id != null) return c.pairing_id === pairing.id;
    const coupleMatches =
      pairing.sire_id != null &&
      pairing.dam_id != null &&
      c.sire_id === pairing.sire_id &&
      c.dam_id === pairing.dam_id;
    if (coupleMatches) return true;
    return (
      nameKey(c.sire) === nameKey(pairing.sire_name) &&
      nameKey(c.dam) === nameKey(pairing.dam_name) &&
      isKnownParent(pairing.sire_name) &&
      isKnownParent(pairing.dam_name)
    );
  });
}

/** Auto pairing code: sire bird_code + dam bird_code (e.g. '1A'). */
export function pairingCodeFor(
  sireCode: string | null | undefined,
  damCode: string | null | undefined
): string | null {
  const code = offspringBaseCode(normalizeBirdCode(sireCode), normalizeBirdCode(damCode));
  return code || null;
}

/** Why a new pairing cannot be inserted as-is, or that it already exists. */
export type PairingConflict =
  | { kind: 'occupied'; bird: 'sire' | 'dam'; partnerName: string; pairing: BreedingPairRecord }
  | { kind: 'couple'; pairing: BreedingPairRecord };

/**
 * Pre-flight check for recording a sire x dam pairing:
 * - 'occupied' — one of the birds already has a DIFFERENT Active partner
 *   (the unique index would reject the insert; the user must end that pairing).
 * - 'couple'   — this exact couple is already on file (an existing row should be
 *   reactivated / updated instead of inserting a duplicate).
 */
export function pairingConflict(
  pairings: BreedingPairRecord[],
  sire: FowlRecord | null | undefined,
  dam: FowlRecord | null | undefined
): PairingConflict | null {
  if (!sire || !dam) return null;

  const sameCouple = (p: BreedingPairRecord): boolean =>
    (p.sire_id != null && p.dam_id != null && p.sire_id === sire.id && p.dam_id === dam.id) ||
    (p.sire_id == null &&
      p.dam_id == null &&
      nameKey(p.sire_name) === nameKey(sire.name) &&
      nameKey(p.dam_name) === nameKey(dam.name));

  const occupiedByOther = (
    bird: FowlRecord,
    role: 'sire' | 'dam'
  ): PairingConflict | null => {
    const clash = pairingsFor(bird, pairings).find(
      (p) => p.outcome === 'Active' && !sameCouple(p)
    );
    if (!clash) return null;
    return {
      kind: 'occupied',
      bird: role,
      partnerName: role === 'sire' ? clash.dam_name : clash.sire_name,
      pairing: clash,
    };
  };

  return occupiedByOther(sire, 'sire') ?? occupiedByOther(dam, 'dam') ?? (() => {
    const couple = pairings.find(sameCouple);
    return couple ? { kind: 'couple', pairing: couple } : null;
  })();
}

/** The pairing this bird was produced by (`fowl.pairing_id`), if it is loaded. */
export function originPairingOf(
  bird: FowlRecord,
  pairings: BreedingPairRecord[]
): BreedingPairRecord | null {
  if (bird.pairing_id == null) return null;
  return pairings.find((p) => p.id === bird.pairing_id) ?? null;
}

/**
 * Normalizes text for search: removes excess whitespace, converts subscripts to digits, and lowercases.
 */
export function normalizeSearchTerm(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2080-\u2089]/g, (c) => String(c.charCodeAt(0) - 0x2080));
}

export interface FowlMatchOptions {
  includeParents?: boolean;
}

export type FowlMatchReason = 'self' | 'sire' | 'dam' | null;

export interface FowlMatchResult {
  matched: boolean;
  reason: FowlMatchReason;
  parentHint?: string;
  nameStarts: boolean;
  nameContains: boolean;
}

/**
 * Detailed inspection of how a fowl matches a search query.
 * By default, matches ONLY the chicken's own fields:
 * - Chicken name
 * - Unique identifier (e.g. 1A1; "1A" matches offspring of that pair)
 * - Wing band number
 * If includeParents is true, also matches sire and dam.
 */
export function inspectFowlMatch(
  fowl: FowlRecord,
  query: string,
  resolvedCode?: string | null,
  options?: FowlMatchOptions
): FowlMatchResult {
  const q = normalizeSearchTerm(query);
  if (!q) {
    return {
      matched: true,
      reason: null,
      nameStarts: false,
      nameContains: false,
    };
  }

  const code = resolvedCode || fowl.bird_code;
  const normName = normalizeSearchTerm(fowl.name);
  const normCode = normalizeSearchTerm(code);
  const normWing = normalizeSearchTerm(fowl.wing_band);

  const nameStarts = normName.startsWith(q);
  const nameContains = normName.includes(q);
  const codeMatches = normCode ? normCode.includes(q) : false;
  const wingMatches = normWing ? normWing.includes(q) : false;

  // 1. Own fields have highest priority
  if (nameContains || codeMatches || wingMatches) {
    return {
      matched: true,
      reason: 'self',
      nameStarts,
      nameContains,
    };
  }

  // 2. Optional: Parents search
  if (options?.includeParents) {
    const normDam = normalizeSearchTerm(fowl.dam);
    if (normDam && normDam.includes(q)) {
      return {
        matched: true,
        reason: 'dam',
        parentHint: `Dam: ${fowl.dam}`,
        nameStarts: false,
        nameContains: false,
      };
    }
    const normSire = normalizeSearchTerm(fowl.sire);
    if (normSire && normSire.includes(q)) {
      return {
        matched: true,
        reason: 'sire',
        parentHint: `Sire: ${fowl.sire}`,
        nameStarts: false,
        nameContains: false,
      };
    }
  }

  return {
    matched: false,
    reason: null,
    nameStarts: false,
    nameContains: false,
  };
}

/** Text search across chicken own fields (name, code/identifier, wing band). */
export function fowlMatchesQuery(
  fowl: FowlRecord,
  query: string,
  resolvedCode?: string | null,
  options?: FowlMatchOptions
): boolean {
  return inspectFowlMatch(fowl, query, resolvedCode, options).matched;
}

/**
 * Relevance comparator:
 * 1. Names that START with query
 * 2. Names that merely CONTAIN query
 * 3. Other own-field matches (identifier, wing band)
 * 4. Parent matches (when includeParents is true)
 */
export function compareFowlSearchRelevance(
  matchA: FowlMatchResult,
  matchB: FowlMatchResult
): number {
  const rank = (m: FowlMatchResult) => {
    if (!m.matched) return 99;
    if (m.nameStarts) return 1;
    if (m.nameContains) return 2;
    if (m.reason === 'self') return 3;
    if (m.reason === 'sire' || m.reason === 'dam') return 4;
    return 5;
  };
  return rank(matchA) - rank(matchB);
}
