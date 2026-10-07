import type { FowlRecord } from './types';

/** Placeholder parent value used by the encode form when no parent is known. */
export const FOUNDATION_STOCK = 'foundation stock';

/** Trimmed display value of a parent name. */
export const normalizeParentName = (value?: string | null): string => String(value ?? '').trim();

/** Case-insensitive lookup key for a chicken name / parent name. */
export const nameKey = (value?: string | null): string => normalizeParentName(value).toLowerCase();

/** True when the value points at a real parent (not blank, not "Foundation Stock"). */
export const isKnownParent = (value?: string | null): boolean => {
  const key = nameKey(value);
  return key !== '' && key !== FOUNDATION_STOCK;
};

export interface BreedingPair {
  /** `sireKey|||damKey` — stable identity of the pair. */
  key: string;
  sire: string;
  dam: string;
  /** Offspring of exactly this sire + dam (full siblings). */
  members: FowlRecord[];
}

export interface DescendantNode {
  fowl: FowlRecord;
  children: DescendantNode[];
}

/**
 * Group chickens into breeding pairs (sire x dam).
 * Records without both parents known are skipped — they are covered by the
 * sire-only / dam-only trees instead.
 */
export function buildBreedingPairs(fowls: FowlRecord[]): BreedingPair[] {
  const map = new Map<string, BreedingPair>();
  fowls.forEach((fowl) => {
    if (!isKnownParent(fowl.sire) || !isKnownParent(fowl.dam)) return;
    const sire = normalizeParentName(fowl.sire);
    const dam = normalizeParentName(fowl.dam);
    const key = `${nameKey(fowl.sire)}|||${nameKey(fowl.dam)}`;
    const pair = map.get(key) || { key, sire, dam, members: [] };
    pair.members.push(fowl);
    map.set(key, pair);
  });
  return Array.from(map.values()).sort(
    (a, b) =>
      b.members.length - a.members.length ||
      a.sire.localeCompare(b.sire) ||
      a.dam.localeCompare(b.dam)
  );
}

/**
 * parentNameKey -> chickens where that parent is the sire or the dam.
 * Self references are dropped so bad data cannot create a loop.
 */
export function buildOffspringIndex(fowls: FowlRecord[]): Map<string, FowlRecord[]> {
  const index = new Map<string, FowlRecord[]>();
  fowls.forEach((fowl) => {
    const childKey = nameKey(fowl.name);
    [
      { parent: fowl.sire, role: 'sire' as const },
      { parent: fowl.dam, role: 'dam' as const },
    ].forEach(({ parent }) => {
      const parentKey = nameKey(parent);
      if (!parentKey || parentKey === childKey) return;
      const bucket = index.get(parentKey) || [];
      if (!bucket.some((c) => c.id === fowl.id)) bucket.push(fowl);
      index.set(parentKey, bucket);
    });
  });
  return index;
}

/** Chickens registered under this parent (sire or dam side), or []. */
export function offspringOf(index: Map<string, FowlRecord[]>, parent: FowlRecord | string): FowlRecord[] {
  const key = typeof parent === 'string' ? nameKey(parent) : nameKey(parent.name);
  return key ? index.get(key) || [] : [];
}

/**
 * Descendants of a chicken, level by level.
 * maxDepth 1 = direct offspring only, 2 = adds grandchildren, ...
 * Cycles (a chicken listed as its own ancestor) stop at the visited set.
 */
export function collectDescendants(
  root: FowlRecord | string,
  index: Map<string, FowlRecord[]>,
  maxDepth: number
): DescendantNode[] {
  if (maxDepth < 1) return [];
  const walk = (node: FowlRecord | string, depth: number, visited: Set<string>): DescendantNode[] => {
    if (depth > maxDepth) return [];
    const key = nameKey(typeof node === 'string' ? node : node.name);
    if (!key || visited.has(key)) return [];
    const next = new Set(visited);
    next.add(key);
    return offspringOf(index, key).map((fowl) => ({
      fowl,
      children: walk(fowl, depth + 1, next),
    }));
  };
  return walk(root, 1, new Set());
}

/** Flatten a descendant tree (depth-first) — handy for counting / tests. */
export function flattenDescendants(nodes: DescendantNode[]): FowlRecord[] {
  const out: FowlRecord[] = [];
  nodes.forEach((node) => {
    out.push(node.fowl);
    out.push(...flattenDescendants(node.children));
  });
  return out;
}

/** Case-insensitive "does this chicken / parent name match the query" test. */
export function matchesQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => String(field ?? '').toLowerCase().includes(q));
}

/**
 * Breeding pairs related to the query.
 * A pair matched by sire/dam keeps all of its offspring; otherwise only the
 * matching offspring are kept.
 */
export function filterBreedingPairs(pairs: BreedingPair[], query: string): BreedingPair[] {
  if (!query.trim()) return pairs;
  const out: BreedingPair[] = [];
  pairs.forEach((pair) => {
    if (matchesQuery(query, pair.sire, pair.dam)) {
      out.push(pair);
      return;
    }
    const members = pair.members.filter((m) => matchesQuery(query, m.name, m.bird_code, m.wing_band));
    if (members.length > 0) out.push({ ...pair, members });
  });
  return out;
}
