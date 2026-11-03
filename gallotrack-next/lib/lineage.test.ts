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
  classifyCrisscross,
  crisscrossAlternation,
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

describe('crisscross classification', () => {
  const lemonSire = bird({ id: 10, name: 'Lemon Sire', gender: 'Rooster', breed: 'Lemon' });
  const hatchDam = bird({ id: 11, name: 'Hatch Dam', gender: 'Hen', breed: 'Hatch' });
  const crossDam = bird({
    id: 12,
    name: 'Cross Dam',
    gender: 'Hen',
    breed: 'Lemon × Hatch',
    sire: 'Lemon Sire',
    dam: 'Hatch Dam',
  });
  const hatchSire = bird({ id: 13, name: 'Hatch Sire', gender: 'Rooster', breed: 'Hatch' });
  const lemonCock = bird({ id: 14, name: 'Lemon Cock', gender: 'Rooster', breed: 'Lemon' });
  const pureDam = bird({
    id: 15,
    name: 'Pure Dam',
    gender: 'Hen',
    breed: 'Lemon',
    sire: 'Lemon Sire',
    dam: 'Lemon Dam',
  });
  const lemonDam = bird({ id: 16, name: 'Lemon Dam', gender: 'Hen', breed: 'Lemon' });
  const unregisteredDam = bird({
    id: 17,
    name: 'Unknown Ancestor Dam',
    gender: 'Hen',
    breed: 'Lemon × Hatch',
    sire: 'Not In Registry',
    dam: 'Hatch Dam',
  });
  const foundationParent = bird({
    id: 18,
    name: 'Foundation Stock',
    gender: 'Rooster',
    breed: 'Lemon',
  });
  const foundationDam = bird({
    id: 19,
    name: 'Foundation Ancestor Dam',
    gender: 'Hen',
    breed: 'Lemon × Hatch',
    sire_id: 18,
    sire: 'Foundation Stock',
    dam: 'Hatch Dam',
  });
  const flock = [
    lemonSire,
    hatchDam,
    crossDam,
    hatchSire,
    lemonCock,
    pureDam,
    lemonDam,
    unregisteredDam,
    foundationParent,
    foundationDam,
  ];

  it('marks a Hatch sire over a Lemon × Hatch dam as crisscross', () => {
    const result = classifyCrisscross(hatchSire, crossDam, flock);
    expect(result.isCrisscross).toBe(true);
    expect(result.status).toBe('crisscross');
    expect(result.sireLine).toBe('Hatch');
    expect(result.damSireLine).toBe('Lemon');
    expect(result.damDamLine).toBe('Hatch');
    expect(result.reason).toMatch(/line alternates/i);
  });

  it('rejects a Lemon sire over the same dam because the line does not alternate', () => {
    const result = classifyCrisscross(lemonCock, crossDam, flock);
    expect(result.isCrisscross).toBe(false);
    expect(result.status).toBe('not-crisscross');
    expect(result.reason).toMatch(/does not alternate/i);
  });

  it('rejects a purebred dam', () => {
    const result = classifyCrisscross(hatchSire, pureDam, flock);
    expect(result.isCrisscross).toBe(false);
    expect(result.status).toBe('not-crisscross');
    expect(result.reason).toMatch(/not crossbred/i);
  });

  it('returns unknown for unregistered or Foundation Stock ancestry', () => {
    const missing = classifyCrisscross(hatchSire, unregisteredDam, flock);
    expect(missing.isCrisscross).toBe(false);
    expect(missing.status).toBe('unknown');
    expect(missing.reason).toMatch(/not registered/i);

    const foundation = classifyCrisscross(hatchSire, foundationDam, flock);
    expect(foundation.isCrisscross).toBe(false);
    expect(foundation.status).toBe('unknown');
    expect(foundation.reason).toMatch(/no recorded line/i);
  });

  it('builds an oldest-to-newest alternation line and stops at an unregistered parent', () => {
    expect(crisscrossAlternation(hatchSire, crossDam, flock)).toBe(
      'Gen 1: Lemon × Hatch -> Gen 2: Cross Dam × Hatch'
    );

    expect(crisscrossAlternation(hatchSire, unregisteredDam, flock)).toMatch(
      /Gen 1: not registered × Hatch -> stopped: unregistered ancestor/
    );
  });
});

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
  it('matches only name, wing band, and codes by default', () => {
    expect(fowlMatchesQuery(chick, 'spur')).toBe(true);
    expect(fowlMatchesQuery(chick, 'wb-003')).toBe(true);
    expect(fowlMatchesQuery(chick, '1A1')).toBe(true);
    expect(fowlMatchesQuery(chick, '1A')).toBe(true);
  });

  it('does NOT match parents, breed, traits, or color by default', () => {
    expect(fowlMatchesQuery(chick, 'blue king')).toBe(false);
    expect(fowlMatchesQuery(chick, 'gold hen')).toBe(false);
    expect(fowlMatchesQuery(chick, 'kelso')).toBe(false);
    expect(fowlMatchesQuery(chick, 'red')).toBe(false);
    expect(fowlMatchesQuery(chick, 'aggressive')).toBe(false);
  });

  it('matches parents only when includeParents option is true', () => {
    expect(fowlMatchesQuery(chick, 'blue king', null, { includeParents: true })).toBe(true);
    expect(fowlMatchesQuery(chick, 'gold hen', null, { includeParents: true })).toBe(true);
    expect(fowlMatchesQuery(chick, 'kelso', null, { includeParents: true })).toBe(false);
  });

  it('matches trait and feather color when includeTraitsAndColors option is true', () => {
    expect(fowlMatchesQuery(chick, 'red', null, { includeTraitsAndColors: true })).toBe(true);
    expect(fowlMatchesQuery(chick, 'aggressive', null, { includeTraitsAndColors: true })).toBe(true);
  });

  it('ignores extra whitespace and case differences', () => {
    expect(fowlMatchesQuery(chick, '   SPUR   ')).toBe(true);
    expect(fowlMatchesQuery(chick, '  wb-003  ')).toBe(true);
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
