import { describe, it, expect } from 'vitest';
import { matchSearchItems, type SearchableItem } from './nav-search';

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
