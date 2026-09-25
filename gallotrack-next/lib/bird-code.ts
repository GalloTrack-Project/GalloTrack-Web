import type { FowlRecord } from './types';

/**
 * Standardized bird tagging / coding scheme.
 *
 * Adviser convention:
 *   Sires     -> 1A, 2A, 3A ...   (A = sire / male line)
 *   Dams      -> 1B, 2B, 3B ...   (B = dam / female line)
 *   Offspring -> parent-code combination, e.g. 1A x 1B -> "1Ax1B"
 *                (a "-2", "-3" suffix is appended for later clutch mates)
 *
 * Codes are auto-generated but may be overridden manually by the breeder.
 */

export const BIRD_CODE_MAX_LENGTH = 24;

export const BIRD_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9x.\-]*$/;

export const BIRD_CODE_HINT = 'Letters, numbers, x, - and . only. Example: 1A, 2B, 1Ax1B';

export const isFemaleCode = (gender?: string | null): boolean => {
  const g = String(gender ?? '').trim().toLowerCase();
  return g === 'hen' || g === 'pullet' || g === 'female';
};

export const suffixForGender = (gender?: string | null): 'A' | 'B' => (isFemaleCode(gender) ? 'B' : 'A');

export const normalizeBirdCode = (value: unknown): string =>
  String(value ?? '')
    .replace(/\s+/g, '')
    .slice(0, BIRD_CODE_MAX_LENGTH);

export const isValidBirdCode = (value: unknown): boolean => {
  const raw = String(value ?? '').replace(/\s+/g, '');
  if (raw.length === 0 || raw.length > BIRD_CODE_MAX_LENGTH) return false;
  return BIRD_CODE_PATTERN.test(raw);
};

/** Case-insensitive comparison key. */
export const birdCodeKey = (value: unknown): string => normalizeBirdCode(value).toLowerCase();

export type CodeSet = Set<string>;

/** Build the set of codes already in use (case-insensitive keys). */
export function buildCodeSet(codes: Array<string | undefined | null>): CodeSet {
  const set: CodeSet = new Set();
  codes.forEach((c) => {
    const key = birdCodeKey(c);
    if (key) set.add(key);
  });
  return set;
}

/** Highest leading sequence for a suffix, e.g. from "1A","3A" -> 3. */
function maxSequence(suffix: 'A' | 'B', taken: CodeSet): number {
  let max = 0;
  taken.forEach((key) => {
    const m = /^(\d+)([ab])$/.exec(key);
    if (m && m[2] === suffix.toLowerCase()) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  });
  return max;
}

function nextFree(base: string, taken: CodeSet): string {
  if (!taken.has(base.toLowerCase())) return base;
  let k = 2;
  while (taken.has(`${base}-${k}`.toLowerCase())) k++;
  return `${base}-${k}`;
}

/**
 * Generate a bird code.
 * Returns a code that is guaranteed not to collide with `taken`.
 */
export function generateBirdCode(params: {
  gender?: string | null;
  sireCode?: string | null;
  damCode?: string | null;
  taken: CodeSet;
}): string {
  const { gender, sireCode, damCode, taken } = params;
  const sire = normalizeBirdCode(sireCode);
  const dam = normalizeBirdCode(damCode);

  if (isValidBirdCode(sire) && isValidBirdCode(dam)) {
    return nextFree(`${sire}x${dam}`, taken);
  }

  const suffix = suffixForGender(gender);
  const n = maxSequence(suffix, taken) + 1;
  return nextFree(`${n}${suffix}`, taken);
}

/** Depth used to make sure parents receive codes before their offspring. */
function ancestryDepth(f: FowlRecord, byName: Map<string, FowlRecord>, chain: Set<string>): number {
  const key = (f.name || '').trim().toLowerCase();
  if (!key || chain.has(key)) return 0;
  const sireName = (f.sire || '').trim().toLowerCase();
  const damName = (f.dam || '').trim().toLowerCase();
  const sire = sireName && sireName !== 'foundation stock' ? byName.get(sireName) : undefined;
  const dam = damName && damName !== 'foundation stock' ? byName.get(damName) : undefined;
  if (!sire && !dam) return 0;
  chain.add(key);
  const depth =
    Math.max(sire ? ancestryDepth(sire, byName, chain) : 0, dam ? ancestryDepth(dam, byName, chain) : 0) + 1;
  chain.delete(key);
  return depth;
}

/**
 * Resolve a display code for every fowl in the registry.
 * Stored codes always win; birds without one get a deterministic auto code.
 */
export function resolveBirdCodes(fowls: FowlRecord[]): Map<string, string> {
  const out = new Map<string, string>();
  const byName = new Map<string, FowlRecord>();
  fowls.forEach((f) => {
    const key = (f.name || '').trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, f);
  });

  const taken: CodeSet = new Set();
  const pending: FowlRecord[] = [];

  fowls.forEach((f) => {
    if (isValidBirdCode(f.bird_code)) {
      const code = normalizeBirdCode(f.bird_code);
      const key = code.toLowerCase();
      if (taken.has(key)) {
        pending.push(f);
      } else {
        taken.add(key);
        out.set(String(f.id), code);
      }
    } else {
      pending.push(f);
    }
  });

  pending
    .slice()
    .sort((a, b) => {
      const da = ancestryDepth(a, byName, new Set());
      const db = ancestryDepth(b, byName, new Set());
      if (da !== db) return da - db;
      return (a.created_at || '').localeCompare(b.created_at || '') || a.id - b.id;
    })
    .forEach((f) => {
      const sire = byName.get((f.sire || '').trim().toLowerCase());
      const dam = byName.get((f.dam || '').trim().toLowerCase());
      const code = generateBirdCode({
        gender: f.gender,
        sireCode: sire ? out.get(String(sire.id)) || sire.bird_code : null,
        damCode: dam ? out.get(String(dam.id)) || dam.bird_code : null,
        taken,
      });
      taken.add(code.toLowerCase());
      out.set(String(f.id), code);
    });

  return out;
}

/** Code for one fowl (stored first, auto-derived second). */
export function birdCodeOf(fowl: FowlRecord | null | undefined, fowls: FowlRecord[]): string {
  if (!fowl) return '';
  if (isValidBirdCode(fowl.bird_code)) return normalizeBirdCode(fowl.bird_code);
  return resolveBirdCodes(fowls).get(String(fowl.id)) || '';
}

/** Code for a fowl that does not exist in the registry yet (encode form). */
export function previewBirdCode(params: {
  gender?: string | null;
  sireName?: string | null;
  damName?: string | null;
  fowls: FowlRecord[];
  taken?: CodeSet;
}): string {
  const { gender, sireName, damName, fowls } = params;
  const byName = new Map<string, FowlRecord>();
  fowls.forEach((f) => {
    const key = (f.name || '').trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, f);
  });
  const codes = resolveBirdCodes(fowls);
  const taken = params.taken || buildCodeSet(Array.from(codes.values()));
  const sire = byName.get(String(sireName ?? '').trim().toLowerCase());
  const dam = byName.get(String(damName ?? '').trim().toLowerCase());
  return generateBirdCode({
    gender,
    sireCode: sire ? codes.get(String(sire.id)) || sire.bird_code : null,
    damCode: dam ? codes.get(String(dam.id)) || dam.bird_code : null,
    taken,
  });
}
