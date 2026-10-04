import { describe, it, expect } from 'vitest';
import type { BreedingPairRecord, FowlRecord } from './types';
import {
  activePartnerOf,
  childrenOf,
  fowlMatchesQuery,
  offspringForPairing,
  originPairingOf,
  pairingCodeFor,
  pairingConflict,
  pairingsFor,
  parentLinkIds,
  parentRecordOf,
  resolveParentId,
} from './lineage';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Stag',
    color: 'Red',
    color_category: 'Red',
    growth_stage: 'Stag',
    behavior_trait: 'Aggressive',
    eye_variant: 'Orange',
    birthdate: '2026-01-01',
    age: '9 mo',
    weight: '2.4',
    height: '40',
    leg_color: 'Yellow',
    sire: '',
    dam: '',
    sire_pct: 0,
    dam_pct: 0,
    bloodline_pct: 100,
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const pairing = (
  partial: Partial<BreedingPairRecord> & { id: number }
): BreedingPairRecord =>
  ({
    sire_name: '',
    dam_name: '',
    outcome: 'Active',
    ...partial,
  }) as BreedingPairRecord;

const sire = bird({ id: 1, name: 'Blue King', bird_code: '1', user_id: 'u1' });
const dam = bird({ id: 2, name: 'Gold Hen', bird_code: 'A', user_id: 'u1' });
const chick = bird({
  id: 3,
  name: 'Spur',
  bird_code: '1A1',
  wing_band: 'WB-003',
  sire_id: 1,
  dam_id: 2,
  sire: 'Blue King',
  dam: 'Gold Hen',
  user_id: 'u1',
});
const flock = [sire, dam, chick];

describe('resolveParentId', () => {
  it('resolves a unique non-self name', () => {
    expect(resolveParentId('Blue King', chick, flock)).toBe(1);
    expect(resolveParentId(' blue king ', chick, flock)).toBe(1);
  });

  it('never resolves foundation stock, blanks, or self', () => {
    expect(resolveParentId('Foundation Stock', chick, flock)).toBeNull();
    expect(resolveParentId('', chick, flock)).toBeNull();
    expect(resolveParentId(null, chick, flock)).toBeNull();
    expect(resolveParentId('Spur', chick, flock)).toBeNull();
  });

  it('refuses ambiguous names', () => {
    const dup = bird({ id: 4, name: 'Blue King', user_id: 'u1' });
    expect(resolveParentId('Blue King', chick, [sire, dam, chick, dup])).toBeNull();
  });

  it('refuses names from another farm', () => {
    const other = bird({ id: 9, name: 'Blue King', user_id: 'u2' });
    expect(resolveParentId('Blue King', chick, [other])).toBeNull();
  });
});

describe('parentLinkIds', () => {
  it('resolves both parents', () => {
    expect(parentLinkIds(chick, 'Blue King', 'Gold Hen', flock)).toEqual({
      sire_id: 1,
      dam_id: 2,
    });
  });

  it('leaves unresolvable sides null', () => {
    expect(parentLinkIds(chick, 'Foundation Stock', 'Gold Hen', flock)).toEqual({
      sire_id: null,
      dam_id: 2,
    });
  });
});

describe('parentRecordOf', () => {
  it('prefers the id link', () => {
    expect(parentRecordOf(chick, 'sire', flock)?.id).toBe(1);
    expect(parentRecordOf(chick, 'dam', flock)?.id).toBe(2);
  });

  it('falls back to a unique name match for legacy rows', () => {
    const legacy = bird({ id: 5, name: 'Legacy', sire: 'Blue King', dam: 'Gold Hen' });
    expect(parentRecordOf(legacy, 'sire', flock)?.id).toBe(1);
    expect(parentRecordOf(legacy, 'dam', flock)?.id).toBe(2);
  });
});

describe('childrenOf', () => {
  it('returns children linked by id', () => {
    expect(childrenOf(sire, flock).map((c) => c.id)).toEqual([3]);
    expect(childrenOf(dam, flock).map((c) => c.id)).toEqual([3]);
  });

  it('falls back to parent names for legacy rows', () => {
    const legacy = bird({ id: 5, name: 'Legacy', sire: 'Blue King', dam: 'Gold Hen' });
    expect(childrenOf(sire, [...flock, legacy]).map((c) => c.id)).toEqual([3, 5]);
  });

  it('ignores unrelated birds', () => {
    const stranger = bird({ id: 6, name: 'Stranger', sire: 'Nobody', dam: 'Nobody' });
    expect(childrenOf(sire, [...flock, stranger]).map((c) => c.id)).toEqual([3]);
  });
});

describe('pairings / partner / offspring', () => {
  const pair = pairing({
    id: 10,
    sire_id: 1,
    dam_id: 2,
    sire_name: 'Blue King',
    dam_name: 'Gold Hen',
    pairing_code: '1A',
    offspring_seq: 1,
  });

  it('finds pairings for either bird', () => {
    expect(pairingsFor(sire, [pair]).map((p) => p.id)).toEqual([10]);
    expect(pairingsFor(dam, [pair]).map((p) => p.id)).toEqual([10]);
    expect(pairingsFor(chick, [pair])).toEqual([]);
  });

  it('resolves the active partner', () => {
    expect(activePartnerOf(sire, [pair], flock)?.partner?.id).toBe(2);
    expect(activePartnerOf(dam, [pair], flock)?.partner?.id).toBe(1);
    expect(activePartnerOf(chick, [pair], flock)).toBeNull();
  });

  it('returns null when there is no active pairing', () => {
    const done = pairing({ ...pair, outcome: 'Completed' });
    expect(activePartnerOf(sire, [done], flock)).toBeNull();
  });

  it('lists offspring by pairing id, then by couple, then by names', () => {
    expect(offspringForPairing(pair, flock).map((c) => c.id)).toEqual([3]);

    const noLink = { ...chick, sire_id: null, dam_id: null, pairing_id: null };
    expect(offspringForPairing(pair, [sire, dam, noLink]).map((c) => c.id)).toEqual([3]);

    const coupleOnly = {
      ...pair,
      id: 11,
      sire_id: null,
      dam_id: null,
    };
    expect(offspringForPairing(coupleOnly, [sire, dam, noLink]).map((c) => c.id)).toEqual([3]);
  });
});

describe('pairingCodeFor', () => {
  it('joins normalized codes', () => {
    expect(pairingCodeFor('1', 'A')).toBe('1A');
    expect(pairingCodeFor(' 1B ', 'x')).toBe('1Bx');
  });

  it('is null when either code is missing', () => {
    expect(pairingCodeFor('1', '')).toBeNull();
    expect(pairingCodeFor(null, 'A')).toBeNull();
  });
});

describe('fowlMatchesQuery', () => {
  it('matches name, wing band, codes, parents, breed and color', () => {
    expect(fowlMatchesQuery(chick, 'spur')).toBe(true);
    expect(fowlMatchesQuery(chick, 'wb-003')).toBe(true);
    expect(fowlMatchesQuery(chick, '1A1')).toBe(true);
    expect(fowlMatchesQuery(chick, 'blue king')).toBe(true);
    expect(fowlMatchesQuery(chick, 'kelso')).toBe(true);
    expect(fowlMatchesQuery(chick, 'red')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(fowlMatchesQuery(chick, 'hatch')).toBe(false);
  });

  it('matches everything on an empty query', () => {
    expect(fowlMatchesQuery(chick, '   ')).toBe(true);
  });
});

describe('pairingConflict', () => {
  const couple = pairing({
    id: 10,
    sire_id: 1,
    dam_id: 2,
    sire_name: 'Blue King',
    dam_name: 'Gold Hen',
    pairing_code: '1A',
  });

  it('is null when neither bird is paired', () => {
    expect(pairingConflict([], sire, dam)).toBeNull();
    expect(pairingConflict(null as unknown as BreedingPairRecord[], null, dam)).toBeNull();
  });

  it('reports the exact couple when it is already on file', () => {
    const done = pairing({ ...couple, outcome: 'Completed' });
    const conflict = pairingConflict([done], sire, dam);
    expect(conflict).toEqual({ kind: 'couple', pairing: done });
  });

  it('treats the couple Active pairing as already recorded, not occupied', () => {
    const conflict = pairingConflict([couple], sire, dam);
    expect(conflict?.kind).toBe('couple');
  });

  it('blocks when the sire has a different Active partner', () => {
    const rival = pairing({ id: 11, sire_id: 1, dam_id: 7, dam_name: 'Other Hen', outcome: 'Active' });
    const conflict = pairingConflict([rival], sire, dam);
    expect(conflict).toEqual({ kind: 'occupied', bird: 'sire', partnerName: 'Other Hen', pairing: rival });
  });

  it('blocks when the dam has a different Active partner', () => {
    const rival = pairing({ id: 12, sire_id: 7, dam_id: 2, sire_name: 'Other Hen', outcome: 'Active' });
    const conflict = pairingConflict([rival], sire, dam);
    expect(conflict).toEqual({ kind: 'occupied', bird: 'dam', partnerName: 'Other Hen', pairing: rival });
  });

  it('matches legacy name-only couple rows', () => {
    const legacy = pairing({ id: 13, sire_id: null, dam_id: null, sire_name: 'Blue King', dam_name: 'Gold Hen' });
    expect(pairingConflict([legacy], sire, dam)?.kind).toBe('couple');
  });

  it('ignores Completed pairings of other couples', () => {
    const old = pairing({ id: 14, sire_id: 1, dam_id: 7, outcome: 'Completed' });
    expect(pairingConflict([old], sire, dam)).toBeNull();
  });
});

describe('originPairingOf', () => {
  const born = pairing({ id: 10, pairing_code: '1A', outcome: 'Active' });

  it('finds the pairing by fowl.pairing_id', () => {
    expect(originPairingOf({ ...chick, pairing_id: 10 }, [born])?.id).toBe(10);
  });

  it('returns null when unlinked or not loaded', () => {
    expect(originPairingOf({ ...chick, pairing_id: null }, [born])).toBeNull();
    expect(originPairingOf({ ...chick, pairing_id: 99 }, [born])).toBeNull();
  });
});
