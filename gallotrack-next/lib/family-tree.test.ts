import { describe, it, expect } from 'vitest';
import type { FowlRecord } from './types';
import {
  buildBreedingPairs,
  buildOffspringIndex,
  collectDescendants,
  filterBreedingPairs,
  flattenDescendants,
  isKnownParent,
  matchesQuery,
  nameKey,
  normalizeParentName,
  offspringOf,
} from './family-tree';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

/**
 * Sire 1 + Dam A
 *  ├── Offspring 1A1
 *  ├── Offspring 1A2
 *  └── Offspring 1A3
 *       └── Grandchild (1A1 x Dam C)
 */
const family = (): FowlRecord[] => [
  bird({ id: 1, name: 'Sire 1', gender: 'Rooster' }),
  bird({ id: 2, name: 'Dam A', gender: 'Hen' }),
  bird({ id: 3, name: 'Offspring 1A1', gender: 'Rooster', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 4, name: 'Offspring 1A2', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 5, name: 'Offspring 1A3', gender: 'Hen', sire: 'Sire 1', dam: 'Dam A' }),
  bird({ id: 6, name: 'Dam C', gender: 'Hen' }),
  bird({ id: 7, name: 'Grandchild', gender: 'Rooster', sire: 'Offspring 1A1', dam: 'Dam C' }),
];

describe('family-tree', () => {
  describe('parent helpers', () => {
    it('trims and lowercases names for lookups', () => {
      expect(normalizeParentName('  Sire 1 ')).toBe('Sire 1');
      expect(nameKey('  Sire 1 ')).toBe('sire 1');
      expect(nameKey(null)).toBe('');
    });

    it('treats blank and Foundation Stock as unknown parents', () => {
      expect(isKnownParent('Sire 1')).toBe(true);
      expect(isKnownParent('')).toBe(false);
      expect(isKnownParent('   ')).toBe(false);
      expect(isKnownParent('Foundation Stock')).toBe(false);
      expect(isKnownParent('foundation stock')).toBe(false);
    });
  });

  describe('buildBreedingPairs', () => {
    it('groups full siblings under one sire + dam pair', () => {
      const pairs = buildBreedingPairs(family());
      expect(pairs.map((p) => `${p.sire} x ${p.dam}`)).toEqual([
        'Sire 1 x Dam A',
        'Offspring 1A1 x Dam C',
      ]);
      expect(pairs[0].sire).toBe('Sire 1');
      expect(pairs[0].dam).toBe('Dam A');
      expect(pairs[0].members.map((m) => m.name)).toEqual([
        'Offspring 1A1',
        'Offspring 1A2',
        'Offspring 1A3',
      ]);
    });

    it('ignores chickens without both parents known', () => {
      const pairs = buildBreedingPairs([
        bird({ id: 1, name: 'Only sire', sire: 'Sire 1', dam: '' }),
        bird({ id: 2, name: 'Foundation kid', sire: 'Foundation Stock', dam: 'Dam A' }),
      ]);
      expect(pairs).toHaveLength(0);
    });

    it('keeps pairs case-insensitively together', () => {
      const pairs = buildBreedingPairs([
        bird({ id: 1, name: 'A1', sire: 'Sire 1', dam: 'Dam A' }),
        bird({ id: 2, name: 'A2', sire: 'SIRE 1', dam: 'dam a' }),
      ]);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].members).toHaveLength(2);
    });

    it('sorts the biggest family first', () => {
      const pairs = buildBreedingPairs([
        bird({ id: 1, name: 'Small', sire: 'S2', dam: 'D2' }),
        bird({ id: 2, name: 'Big 1', sire: 'S1', dam: 'D1' }),
        bird({ id: 3, name: 'Big 2', sire: 'S1', dam: 'D1' }),
      ]);
      expect(pairs[0].sire).toBe('S1');
      expect(pairs[0].members).toHaveLength(2);
    });
  });

  describe('buildOffspringIndex', () => {
    it('indexes children by sire and dam name', () => {
      const index = buildOffspringIndex(family());
      expect(offspringOf(index, 'Sire 1').map((f) => f.name)).toEqual([
        'Offspring 1A1',
        'Offspring 1A2',
        'Offspring 1A3',
      ]);
      expect(offspringOf(index, 'Dam A')).toHaveLength(3);
      expect(offspringOf(index, 'Offspring 1A1').map((f) => f.name)).toEqual(['Grandchild']);
      expect(offspringOf(index, 'Walang ganito')).toHaveLength(0);
    });

    it('never indexes a chicken as its own child', () => {
      const index = buildOffspringIndex([
        bird({ id: 1, name: 'Loop', sire: 'Loop', dam: 'Dam A' }),
      ]);
      expect(offspringOf(index, 'Loop')).toHaveLength(0);
    });
  });

  describe('collectDescendants', () => {
    it('returns direct offspring only at depth 1', () => {
      const index = buildOffspringIndex(family());
      const nodes = collectDescendants('Offspring 1A1', index, 1);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].fowl.name).toBe('Grandchild');
      expect(nodes[0].children).toHaveLength(0);
    });

    it('returns nothing past maxDepth', () => {
      const index = buildOffspringIndex(family());
      expect(collectDescendants('Offspring 1A1', index, 0)).toHaveLength(0);
      expect(collectDescendants('Dam A', index, 1)).toHaveLength(3);
    });

    it('does not loop on circular parent data', () => {
      const index = buildOffspringIndex([
        bird({ id: 1, name: 'A', sire: 'B', dam: 'D1' }),
        bird({ id: 2, name: 'B', sire: 'A', dam: 'D2' }),
      ]);
      const nodes = collectDescendants('A', index, 10);
      expect(flattenDescendants(nodes).map((f) => f.name)).toEqual(['B', 'A']);
      expect(nodes[0].children[0].children).toHaveLength(0);
    });

    it('accepts a fowl record as the root', () => {
      const fowls = family();
      const index = buildOffspringIndex(fowls);
      const root = fowls[0];
      expect(flattenDescendants(collectDescendants(root, index, 3))).toHaveLength(4);
    });
  });

  describe('query helpers', () => {
    it('matches case-insensitively across fields', () => {
      expect(matchesQuery('sire 1', 'Sire 1', 'Dam A')).toBe(true);
      expect(matchesQuery('dam a', 'Sire 1', 'Dam A')).toBe(true);
      expect(matchesQuery('', 'Sire 1')).toBe(true);
      expect(matchesQuery('walter', 'Sire 1')).toBe(false);
    });

    it('keeps the whole pair when sire or dam matches', () => {
      const pairs = buildBreedingPairs(family());
      const filtered = filterBreedingPairs(pairs, 'dam a');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].members).toHaveLength(3);
    });

    it('keeps only matching offspring when a chicken name matches', () => {
      const pairs = buildBreedingPairs(family());
      const filtered = filterBreedingPairs(pairs, '1a2');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].members.map((m) => m.name)).toEqual(['Offspring 1A2']);
    });

    it('drops pairs that do not match at all', () => {
      const pairs = buildBreedingPairs(family());
      expect(filterBreedingPairs(pairs, 'hindi exist')).toHaveLength(0);
      expect(filterBreedingPairs(pairs, '  ')).toHaveLength(2);
    });
  });
});
