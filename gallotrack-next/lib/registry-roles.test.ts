import { describe, it, expect } from 'vitest';
import type { FowlRecord, MatchRecord } from './types';
import {
  isActiveStatus,
  isArchivedStatus,
  isDeceasedStatus,
  isSireMaterialRole,
  roleOf,
  inRegistryTab,
  registryTabLists,
  buildRegistryContext,
  inventoryCounts,
  isBreedingReady,
  countRuleCheck,
  makeRegistryComparator,
} from './registry-roles';

const f = (over: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    gender: 'Rooster',
    status: 'Active',
    breeding_role: 'none',
    growth_stage: 'Cock',
    birthdate: '',
    sire: '',
    dam: '',
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }) as FowlRecord;

describe('status predicates (single lifecycle status vocabulary)', () => {
  it('accepts Active, empty and lowercase active', () => {
    expect(isActiveStatus({ status: 'Active' })).toBe(true);
    expect(isActiveStatus({ status: '' })).toBe(true);
    expect(isActiveStatus({ status: 'active' })).toBe(true);
  });

  it('recognizes Archived and Deceased and nothing else as active', () => {
    expect(isArchivedStatus({ status: 'Archived' })).toBe(true);
    expect(isDeceasedStatus({ status: 'Deceased' })).toBe(true);
    expect(isActiveStatus({ status: 'Archived' })).toBe(false);
    expect(isActiveStatus({ status: 'Sire Material' })).toBe(false);
  });

  it("treats breeding_role = material as Sire Material, regardless of status", () => {
    expect(isSireMaterialRole({ breeding_role: 'material' })).toBe(true);
    expect(isSireMaterialRole({ breeding_role: 'none' })).toBe(false);
    expect(isSireMaterialRole({})).toBe(false);
  });
});

describe('role assignment', () => {
  const ctx = buildRegistryContext([
    f({ id: 1, name: 'Sire One' }),
    f({ id: 2, name: 'Dam One', gender: 'Hen' }),
    f({ id: 3, name: 'Kid One', sire: 'Sire One', dam: 'Dam One' }),
  ]);

  it('stored registry_role always wins', () => {
    expect(
      roleOf(f({ id: 9, name: 'X', registry_role: 'Non-Breeding' }), ctx),
    ).toBe('Non-Breeding');
    expect(
      roleOf(f({ id: 9, name: 'X', gender: 'Hen', registry_role: 'Breeding Male' }), ctx),
    ).toBe('Breeding Male');
  });

  it('Sire Material role wins over everything', () => {
    expect(
      roleOf(
        f({ id: 9, name: 'X', breeding_role: 'material', registry_role: 'Breeding Male' }),
        ctx,
      ),
    ).toBe('Sire Material');
  });

  it('falls back to legacy derivation while backfill is pending', () => {
    expect(roleOf(f({ id: 4, name: 'A', sire: 'Sire One', dam: 'Dam One' }), ctx)).toBe(
      'Non-Breeding',
    );
    expect(roleOf(f({ id: 5, name: 'B' }), ctx)).toBe('Breeding Male');
    expect(roleOf(f({ id: 6, name: 'C', gender: 'Hen' }), ctx)).toBe('Breeding Female');
    expect(roleOf(f({ id: 7, name: 'D', gender: 'Weird' }), ctx)).toBe('Undecided');
  });
});

describe('tab membership', () => {
  const kids = { sire: 'Sire One', dam: 'Dam One' } as const;
  const ctx = buildRegistryContext([
    f({ id: 1, name: 'Sire One' }),
    f({ id: 2, name: 'Dam One', gender: 'Hen' }),
  ]);

  it('legacy fallback keeps current overlapping behaviour (no moves before approval)', () => {
    const childMale = f({ id: 3, name: 'Kid', ...kids });
    expect(inRegistryTab(childMale, 'Breeding Male', ctx)).toBe(true);
    expect(inRegistryTab(childMale, 'Non-Breeding', ctx)).toBe(true);
  });

  it('stored roles make membership exclusive', () => {
    const childMale = f({ id: 3, name: 'Kid', ...kids, registry_role: 'Non-Breeding' });
    expect(inRegistryTab(childMale, 'Non-Breeding', ctx)).toBe(true);
    expect(inRegistryTab(childMale, 'Breeding Male', ctx)).toBe(false);
  });

  it('Sire Material birds live only in the Sire Material tab', () => {
    const material = f({ id: 4, name: 'Proven', breeding_role: 'material', ...kids });
    expect(inRegistryTab(material, 'Sire Material', ctx)).toBe(true);
    expect(inRegistryTab(material, 'Breeding Male', ctx)).toBe(false);
    expect(inRegistryTab(material, 'Non-Breeding', ctx)).toBe(false);
  });

  it('Registry is active-only: archived and deceased never appear in role tabs', () => {
    const archivedKid = f({ id: 5, name: 'Gone', status: 'Archived', ...kids });
    expect(inRegistryTab(archivedKid, 'Non-Breeding', ctx)).toBe(false);
    expect(inRegistryTab(archivedKid, 'Breeding Male', ctx)).toBe(false);
    const deadKid = f({ id: 6, name: 'Dead', status: 'Deceased', ...kids });
    expect(inRegistryTab(deadKid, 'Non-Breeding', ctx)).toBe(false);
  });

  it('children of a Sire Material father still count as Non-Breeding', () => {
    const materialCtx = buildRegistryContext([
      f({ id: 1, name: 'Material Sire', breeding_role: 'material' }),
    ]);
    const child = f({ id: 7, name: 'Child', sire: 'Material Sire' });
    expect(inRegistryTab(child, 'Non-Breeding', materialCtx)).toBe(true);
  });
});

describe('invariant: Registry(M + F + Non-Breeding) = Active excluding Sire Material', () => {
  it('holds once every active bird has a stored role', () => {
    const fowls = [
      f({ id: 1, name: 'Sire One', registry_role: 'Breeding Male' }),
      f({ id: 2, name: 'Dam One', gender: 'Hen', registry_role: 'Breeding Female' }),
      f({ id: 3, name: 'Kid One', registry_role: 'Non-Breeding', sire: 'Sire One', dam: 'Dam One' }),
      f({ id: 4, name: 'Kid Two', gender: 'Hen', registry_role: 'Non-Breeding', sire: 'Sire One', dam: 'Dam One' }),
      f({ id: 5, name: 'Material', registry_role: 'Breeding Male', breeding_role: 'material' }),
      f({ id: 6, name: 'Old', status: 'Archived', registry_role: 'Non-Breeding' }),
      f({ id: 7, name: 'RIP', status: 'Deceased', registry_role: 'Breeding Male' }),
    ];
    const report = countRuleCheck(fowls);
    expect(report.registryTabSum).toBe(4);
    expect(report.activeExcludingSireMaterial).toBe(4);
    expect(report.registryRuleOk).toBe(true);
    expect(report.pendingRoleCount).toBe(0);
    // each active bird sits in exactly one tab
    const lists = registryTabLists(fowls);
    expect(lists.males.length).toBe(1);
    expect(lists.females.length).toBe(1);
    expect(lists.nonBreeding.length).toBe(2);
    expect(lists.sireMaterial.length).toBe(1);
  });

  it('flags pending backfill (overlapping legacy membership) instead of hiding it', () => {
    const fowls = [
      f({ id: 1, name: 'Sire One' }),
      f({ id: 2, name: 'Kid One', sire: 'Sire One' }),
    ];
    const report = countRuleCheck(fowls);
    expect(report.registryRuleOk).toBe(false);
    expect(report.pendingRoleCount).toBe(2);
  });
});

describe('invariant: Inventory All = Active + Archived + Deceased', () => {
  it('holds for the three-value status vocabulary', () => {
    const fowls = [
      f({ id: 1, name: 'A' }),
      f({ id: 2, name: 'B', status: 'Archived' }),
      f({ id: 3, name: 'C', status: 'Deceased' }),
      f({ id: 4, name: 'D', breeding_role: 'material' }),
    ];
    const counts = inventoryCounts(fowls);
    expect(counts.all).toBe(4);
    expect(counts.active + counts.archived + counts.deceased).toBe(4);
    expect(countRuleCheck(fowls).inventoryRuleOk).toBe(true);
  });

  it('flags legacy Sire Material status rows for normalization', () => {
    const fowls = [f({ id: 1, name: 'A', status: 'Sire Material', breeding_role: 'material' })];
    const report = countRuleCheck(fowls);
    expect(report.inventoryRuleOk).toBe(false);
    expect(report.legacySireMaterialStatusCount).toBe(1);
  });
});

describe('Breeding Ready (proposed rule)', () => {
  it('is an active, mature (8+ months) chicken', () => {
    const old = new Date(Date.now() - 300 * 86400000).toISOString().slice(0, 10);
    expect(isBreedingReady(f({ id: 1, name: 'A', birthdate: old }))).toBe(true);
    const baby = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
    expect(isBreedingReady(f({ id: 2, name: 'B', birthdate: baby }))).toBe(false);
    expect(isBreedingReady(f({ id: 3, name: 'C', growth_stage: 'Hen' }))).toBe(true);
    expect(isBreedingReady(f({ id: 4, name: 'D', growth_stage: 'Chick' }))).toBe(false);
    expect(isBreedingReady(f({ id: 5, name: 'E', status: 'Archived', growth_stage: 'Hen' }))).toBe(false);
  });
});

describe('sort comparators', () => {
  const matchHistory = [
    { entry_name: 'Winner', outcome: 'Win' },
    { entry_name: 'Winner', outcome: 'Win' },
    { entry_name: 'Loser', outcome: 'Loss' },
  ] as unknown as MatchRecord[];

  it('identifier sort is natural order (1A2 before 1A10)', () => {
    const fowls = [
      f({ id: 1, name: 'Ten', chicken_code: '1A10' }),
      f({ id: 2, name: 'Two', chicken_code: '1A2' }),
      f({ id: 3, name: 'One', chicken_code: '1A1' }),
    ];
    const sorted = [...fowls].sort(makeRegistryComparator('identifier', { fowls, matchHistory }));
    expect(sorted.map((x) => x.name)).toEqual(['One', 'Two', 'Ten']);
  });

  it('name, newest, offspring and wins sorts work', () => {
    const fowls = [
      f({ id: 1, name: 'Bee', created_at: '2026-01-02T00:00:00Z' }),
      f({ id: 2, name: 'Abe', created_at: '2026-01-03T00:00:00Z' }),
      f({ id: 3, name: 'Kid', created_at: '2026-01-01T00:00:00Z', sire: 'Bee' }),
    ];
    const byName = [...fowls].sort(makeRegistryComparator('name', { fowls, matchHistory }));
    expect(byName.map((x) => x.name)).toEqual(['Abe', 'Bee', 'Kid']);
    const newest = [...fowls].sort(makeRegistryComparator('newest', { fowls, matchHistory }));
    expect(newest.map((x) => x.name)).toEqual(['Abe', 'Bee', 'Kid']);
    const byKids = [...fowls].sort(makeRegistryComparator('offspring', { fowls, matchHistory }));
    expect(byKids[0].name).toBe('Bee');
    const byWins = [...fowls].sort(makeRegistryComparator('wins', { fowls, matchHistory }));
    expect(byWins[0].name).toBe('Bee');
  });
});
