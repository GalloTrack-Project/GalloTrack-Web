import { describe, it, expect } from 'vitest';
import { matchSearchItems, matchBirds, birdSearchHint, type SearchableItem } from './nav-search';
import { resolveBirdCodes } from './bird-code';
import type { FowlRecord } from './types';

const ITEMS: SearchableItem[] = [
  { id: '1', label: 'Chicken Inventory', hint: '/catalog', href: '/catalog' },
  { id: '2', label: 'Chicken Registry', hint: '/profiling', href: '/profiling' },
  { id: '3', label: 'Log a match', hint: 'Match logs', href: '/profiling?tab=matchForm' },
  { id: '4', label: 'Marketplace', hint: '/marketplace', href: '/marketplace' },
];

describe('matchSearchItems', () => {
  it('returns everything for an empty or whitespace query', () => {
    expect(matchSearchItems(ITEMS, '')).toEqual(ITEMS);
    expect(matchSearchItems(ITEMS, '   ')).toEqual(ITEMS);
  });

  it('matches case-insensitively on the label', () => {
    const result = matchSearchItems(ITEMS, 'invent');
    expect(result.map((i) => i.id)).toEqual(['1']);
    expect(matchSearchItems(ITEMS, 'CHICKEN').map((i) => i.id)).toEqual(['1', '2']);
  });

  it('ranks exact label above prefix above substring', () => {
    const ranked = matchSearchItems(ITEMS, 'marketplace');
    expect(ranked[0].id).toBe('4');
  });

  it('matches on hint and href when the label does not match', () => {
    expect(matchSearchItems(ITEMS, 'matchform').map((i) => i.id)).toEqual(['3']);
    expect(matchSearchItems(ITEMS, 'match logs').map((i) => i.id)).toEqual(['3']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(matchSearchItems(ITEMS, 'zzz')).toEqual([]);
  });
});

describe('matchBirds', () => {
  const fowls = [
    { id: 1, name: 'Sweater Crimson', bird_code: '1A1', wing_band: 'WB-01', status: 'Active' },
    { id: 2, name: 'Crimson Belle', bird_code: 'A', wing_band: 'WB-99', status: 'Active' },
    { id: 3, name: 'Iron Thunder', bird_code: '2B1', wing_band: '', status: 'Active' },
  ] as FowlRecord[];

  it('returns nothing for an empty query', () => {
    expect(matchBirds(fowls, '')).toEqual([]);
    expect(matchBirds(fowls, '   ')).toEqual([]);
  });

  it('matches by name with prefix ranked above substring', () => {
    expect(matchBirds(fowls, 'crim').map((f) => f.id)).toEqual([2, 1]);
    expect(matchBirds(fowls, 'IRON').map((f) => f.id)).toEqual([3]);
  });

  it('matches by bird code and wing band', () => {
    expect(matchBirds(fowls, '1a1').map((f) => f.id)).toEqual([1]);
    expect(matchBirds(fowls, 'wb-99').map((f) => f.id)).toEqual([2]);
    expect(matchBirds(fowls, 'wb-').map((f) => f.id)).toEqual([1, 2]);
  });

  it('respects the result limit', () => {
    expect(matchBirds(fowls, 'c', 1).map((f) => f.id)).toEqual([2]);
  });

  it('birdSearchHint joins code and wing band', () => {
    const codes = resolveBirdCodes(fowls);
    expect(birdSearchHint(fowls[0], codes)).toBe('1A1 · WB-01');
    expect(birdSearchHint(fowls[2], codes)).toBe('2B1');
  });
});
