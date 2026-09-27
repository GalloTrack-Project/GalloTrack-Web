import type { FowlRecord } from './types';

/**
 * Standardized bird tagging / coding scheme (adviser convention).
 *
 *   Sires     -> 1, 2, 3 ...        (number)
 *   Dams      -> A, B, C ...        (letter)
 *   Offspring -> sire number + dam letter + sibling index,
 *                e.g. sire 1 x dam A -> 1A1, 1A2, 1A3
 *                (displayed with a subscript: 1A₁, 1A₂, 1A₃)
 *
 * Legacy tags from the old scheme (1A / 1B foundation tags) are still accepted
 * and kept as stored codes; they are converted by the companion SQL migration.
 *
 * Codes are auto-generated but may be overridden manually by the breeder.
 */

export const BIRD_CODE_MAX_LENGTH = 24;

export const BIRD_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9x.\-]*$/;

export const BIRD_CODE_HINT = 'Letters, numbers, x, - and . only. Example: 1, A, 1A1';

/** Offspring tag: base (sire number + dam letter) followed by the sibling index. */
const OFFSPRING_CODE_PATTERN = /^(\d+[A-Za-z])(\d+)$/;

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] as const;

export const isFemaleCode = (gender?: string | null): boolean => {
  const g = String(gender ?? '').trim().toLowerCase();
  return g === 'hen' || g === 'pullet' || g === 'female';
};

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

/** 1 -> A, 2 -> B, ... 26 -> Z, 27 -> AA (spreadsheet style). */
export function numberToLetter(n: number): string {
  let value = Math.max(1, Math.floor(Number(n) || 1));
  let out = '';
  while (value > 0) {
    value -= 1;
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26);
  }
  return out;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Sire half of an offspring tag: his number ("1A" -> "1", "12" -> "12"). */
function sirePart(code: string): string {
  const digits = /^(\d+)/.exec(code);
  if (digits) return digits[1];
  return code;
}

/** Dam half of an offspring tag: her number as a letter ("1B" -> "A", "A" -> "A"). */
function damPart(code: string): string {
  const digits = /^(\d+)/.exec(code);
  if (digits) return numberToLetter(Number(digits[1]));
  const letters = /^([A-Za-z]+)/.exec(code);
  if (letters) return letters[1].toUpperCase();
  return code;
}

/** Offspring base tag (sire number + dam letter), or null when unusable. */
function offspringBase(sireCode: string, damCode: string): string | null {
  const sire = sirePart(sireCode);
  const dam = damPart(damCode);
  if (!sire || !dam) return null;
  return `${sire}${dam}`;
}

/** Next sibling index for a base tag: 1A1, 1A2, 1A3 ... */
function nextSiblingIndex(base: string, taken: CodeSet): number {
  const pattern = new RegExp(`^${escapeRegExp(base.toLowerCase())}(\\d+)$`);
  let max = 0;
  taken.forEach((key) => {
    const m = pattern.exec(key);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > max) max = n;
    }
  });
  return max + 1;
}

/**
 * Foundation (no parents) tag: sires count 1, 2, 3 ... and dams letter A, B, C ...
 * Legacy tags (1A, 1B ...) still occupying a number/letter are respected so the
 * app stays collision-free before the conversion migration is run.
 */
function nextFoundationCode(gender: string | null | undefined, taken: CodeSet): string {
  if (isFemaleCode(gender)) {
    for (let n = 1; n < 100000; n += 1) {
      const letter = numberToLetter(n).toLowerCase();
      if (!taken.has(letter) && !taken.has(`${n}b`)) return letter.toUpperCase();
    }
    return 'A';
  }
  for (let n = 1; n < 100000; n += 1) {
    const code = String(n);
    if (!taken.has(code) && !taken.has(`${n}a`)) return code;
  }
  return '1';
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
    const base = offspringBase(sire, dam);
    if (base && isValidBirdCode(`${base}1`)) {
      return `${base}${nextSiblingIndex(base, taken)}`;
    }
  }

  return nextFoundationCode(gender, taken);
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

/**
 * Render a tag for display: the sibling index of an offspring tag becomes a
 * subscript (1A1 -> 1A₁). Stored / editable codes stay plain text.
 */
export function formatBirdCodeForDisplay(value: unknown): string {
  const code = normalizeBirdCode(value);
  if (!code) return '';
  const m = OFFSPRING_CODE_PATTERN.exec(code);
  if (!m) return code;
  const subscript = m[2]
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[Number(d)] ?? d)
    .join('');
  return `${m[1]}${subscript}`;
}
