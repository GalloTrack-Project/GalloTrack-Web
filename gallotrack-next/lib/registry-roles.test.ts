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
  getRegistryCounts,
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

  it('stored registry_role is respected even with breeding_role designation', () => {
    expect(
      roleOf(
        f({ id: 9, name: 'X', breeding_role: 'material', registry_role: 'Breeding Male' }),
        ctx,
      ),
    ).toBe('Breeding Male');
  });

  it('fallback derivation assigns mutually exclusive single roles', () => {
    expect(roleOf(f({ id: 4, name: 'A', sire: 'Sire One', dam: 'Dam One' }), ctx)).toBe(
      'Non-Breeding',
    );
    expect(roleOf(f({ id: 5, name: 'B' }), ctx)).toBe('Breeding Male');
    expect(roleOf(f({ id: 6, name: 'C', gender: 'Hen' }), ctx)).toBe('Breeding Female');
  });
});

describe('tab membership exclusivity (hard rule)', () => {
  const kids = { sire: 'Sire One', dam: 'Dam One' } as const;
  const ctx = buildRegistryContext([
    f({ id: 1, name: 'Sire One' }),
    f({ id: 2, name: 'Dam One', gender: 'Hen' }),
  ]);

  it('a male offspring in Non-Breeding NEVER appears in Breeding Male', () => {
    const childMale = f({ id: 3, name: 'Kid', ...kids });
    expect(inRegistryTab(childMale, 'Non-Breeding', ctx)).toBe(true);
    expect(inRegistryTab(childMale, 'Breeding Male', ctx)).toBe(false);
  });

  it('a female offspring in Non-Breeding NEVER appears in Breeding Female', () => {
    const childFemale = f({ id: 4, name: 'Kid Female', gender: 'Hen', ...kids });
    expect(inRegistryTab(childFemale, 'Non-Breeding', ctx)).toBe(true);
    expect(inRegistryTab(childFemale, 'Breeding Female', ctx)).toBe(false);
  });

  it('stored roles enforce exclusive membership', () => {
    const childMale = f({ id: 3, name: 'Kid', ...kids, registry_role: 'Non-Breeding' });
    expect(inRegistryTab(childMale, 'Non-Breeding', ctx)).toBe(true);
    expect(inRegistryTab(childMale, 'Breeding Male', ctx)).toBe(false);
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
    expect(inRegistryTab(child, 'Breeding Male', materialCtx)).toBe(false);
  });

  it('a promoted breeder with parents lives ONLY in the Breeding tab', () => {
    const promotedSire = f({
      id: 99,
      name: 'Promoted Champ',
      gender: 'Rooster',
      status: 'Active',
      registry_role: 'Breeding Male',
      sire: 'Iron Lemon',
      dam: 'Golden Pearl',
      birth_code: '1A1',
      chicken_code: '4',
      bird_code: '4',
    });
    const promotedCtx = buildRegistryContext([promotedSire]);
    expect(inRegistryTab(promotedSire, 'Breeding Male', promotedCtx)).toBe(true);
    expect(inRegistryTab(promotedSire, 'Non-Breeding', promotedCtx)).toBe(false);
    expect(inRegistryTab(promotedSire, 'Breeding Female', promotedCtx)).toBe(false);
    expect(roleOf(promotedSire, promotedCtx)).toBe('Breeding Male');
  });

  it('for every active chicken, the number of tabs it appears in is exactly 1; the three tab id-lists have no overlap; Iron Lemon (sire 1) is in Breeding Male only; Lemon Storm (1A#) is in Non-Breeding only', () => {
    const fowls: FowlRecord[] = [
      f({ id: 30, name: 'Iron Lemon', chicken_code: '1', bird_code: '1', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' }),
      f({ id: 31, name: 'Titan Sweater', chicken_code: '2', bird_code: '2', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' }),
      f({ id: 32, name: 'True Hatch', chicken_code: '3', bird_code: '3', gender: 'Rooster', status: 'Active', registry_role: 'Breeding Male' }),
      f({ id: 35, name: 'Golden Pearl', chicken_code: 'A', bird_code: 'A', gender: 'Hen', status: 'Active', registry_role: 'Breeding Female' }),
      f({ id: 36, name: 'Sunrise Queen', chicken_code: 'B', bird_code: 'B', gender: 'Hen', status: 'Active', registry_role: 'Breeding Female' }),
      f({ id: 42, name: 'Lemon Storm', chicken_code: '1A1', bird_code: '1A1', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Active', registry_role: 'Non-Breeding' }),
      f({ id: 43, name: 'Lemon Blaze', chicken_code: '1A2', bird_code: '1A2', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Active', registry_role: 'Non-Breeding' }),
      f({ id: 44, name: 'Lemon Grace', chicken_code: '1A3', bird_code: '1A3', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Hen', status: 'Active', registry_role: 'Non-Breeding' }),
      f({ id: 60, name: 'Lemon Duke II', chicken_code: '1G3', bird_code: '1G3', gender: 'Rooster', status: 'Deceased', registry_role: 'Non-Breeding' }),
      f({ id: 61, name: 'Sweater Crimson', chicken_code: '0X1', bird_code: '0X1', gender: 'Rooster', status: 'Archived', registry_role: 'Non-Breeding' }),
    ];

    const lists = registryTabLists(fowls);
    const maleIds = new Set(lists.males.map((x) => x.id));
    const femaleIds = new Set(lists.females.map((x) => x.id));
    const nbIds = new Set(lists.nonBreeding.map((x) => x.id));

    // Three tab lists have no overlap
    for (const id of maleIds) {
      expect(femaleIds.has(id)).toBe(false);
      expect(nbIds.has(id)).toBe(false);
    }
    for (const id of femaleIds) {
      expect(maleIds.has(id)).toBe(false);
      expect(nbIds.has(id)).toBe(false);
    }
    for (const id of nbIds) {
      expect(maleIds.has(id)).toBe(false);
      expect(femaleIds.has(id)).toBe(false);
    }

    // For every active chicken, the number of tabs it appears in is exactly 1
    for (const bird of lists.active) {
      let tabCount = 0;
      if (maleIds.has(bird.id)) tabCount++;
      if (femaleIds.has(bird.id)) tabCount++;
      if (nbIds.has(bird.id)) tabCount++;
      expect(tabCount).toBe(1);
    }

    // Iron Lemon (sire 1) is in Breeding Male only
    expect(maleIds.has(30)).toBe(true);
    expect(femaleIds.has(30)).toBe(false);
    expect(nbIds.has(30)).toBe(false);

    // Lemon Storm (1A#) is in Non-Breeding only
    expect(nbIds.has(42)).toBe(true);
    expect(maleIds.has(42)).toBe(false);
    expect(femaleIds.has(42)).toBe(false);
  });
});

describe('invariant: Registry(M + F + Non-Breeding) = Active with zero overlap', () => {
  it('holds once every active bird has an exclusive role', () => {
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
    expect(report.registryTabSum).toBe(5);
    expect(report.activeCount).toBe(5);
    expect(report.registryRuleOk).toBe(true);
    expect(report.pendingRoleCount).toBe(0);
    expect(report.overlappingChickenIds.length).toBe(0);

    // each active bird sits in exactly one tab
    const lists = registryTabLists(fowls);
    expect(lists.males.length).toBe(2);
    expect(lists.females.length).toBe(1);
    expect(lists.nonBreeding.length).toBe(2);
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

describe('getRegistryCounts invariant (Dashboard & Registry tab single source of truth)', () => {
  it('Dashboard role counts equal Registry tab counts; three role counts add up to total; sex counts add up to total', () => {
    const fowls: FowlRecord[] = [
      // 3 Breeding Males (foundation sires)
      f({ id: 30, name: 'Iron Lemon', gender: 'Rooster', status: 'Active', breeding_role: 'material' }),
      f({ id: 31, name: 'Titan Sweater', gender: 'Rooster', status: 'Active' }),
      f({ id: 32, name: 'True Hatch', gender: 'Rooster', status: 'Active' }),
      // 7 Breeding Females (foundation dams)
      f({ id: 35, name: 'Golden Pearl', gender: 'Hen', status: 'Active' }),
      f({ id: 36, name: 'Sunrise Queen', gender: 'Hen', status: 'Active' }),
      f({ id: 37, name: 'Mountain Rose', gender: 'Hen', status: 'Active' }),
      f({ id: 38, name: 'Silver Princess', gender: 'Hen', status: 'Active' }),
      f({ id: 39, name: 'Crimson Belle', gender: 'Hen', status: 'Active' }),
      f({ id: 40, name: 'White Flame', gender: 'Hen', status: 'Active' }),
      f({ id: 41, name: 'Alta daw', gender: 'Hen', status: 'Active' }),
      // 19 Non-Breeding Offspring (12 male + 7 female)
      // 12 male offspring (including 3 with breeding_role: 'material')
      f({ id: 42, name: 'Lemon Storm', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Active' }),
      f({ id: 43, name: 'Lemon Blaze', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Active' }),
      f({ id: 45, name: 'Lemon Duke', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Active' }),
      f({ id: 47, name: 'Sweater Flash', sire: 'Titan Sweater', dam: 'Sunrise Queen', gender: 'Rooster', status: 'Active' }),
      f({ id: 48, name: 'Sweater Bolt', sire: 'Titan Sweater', dam: 'Sunrise Queen', gender: 'Rooster', status: 'Active', breeding_role: 'material' }),
      f({ id: 51, name: 'Hatch Thunder', sire: 'True Hatch', dam: 'Mountain Rose', gender: 'Rooster', status: 'Active' }),
      f({ id: 52, name: 'Hatch Storm', sire: 'True Hatch', dam: 'Mountain Rose', gender: 'Rooster', status: 'Active' }),
      f({ id: 54, name: 'Hatch Mountain', sire: 'True Hatch', dam: 'Mountain Rose', gender: 'Rooster', status: 'Active' }),
      f({ id: 55, name: 'Hatch Silver', sire: 'True Hatch', dam: 'Silver Princess', gender: 'Rooster', status: 'Active', breeding_role: 'material' }),
      f({ id: 57, name: 'Hatch Crown', sire: 'True Hatch', dam: 'Silver Princess', gender: 'Rooster', status: 'Active' }),
      f({ id: 58, name: 'Lemon Roundhead King', sire: 'Iron Lemon', dam: 'Silver Princess', gender: 'Rooster', status: 'Active' }),
      f({ id: 62, name: 'Sweater Red Storm', sire: 'Titan Sweater', dam: 'Crimson Belle', gender: 'Rooster', status: 'Active', breeding_role: 'material' }),
      // 7 female offspring
      f({ id: 44, name: 'Lemon Grace', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Hen', status: 'Active' }),
      f({ id: 46, name: 'Lemon Queen', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Hen', status: 'Active' }),
      f({ id: 49, name: 'Sweater Belle', sire: 'Titan Sweater', dam: 'Sunrise Queen', gender: 'Hen', status: 'Active' }),
      f({ id: 50, name: 'Sweater Pearl', sire: 'Titan Sweater', dam: 'Sunrise Queen', gender: 'Hen', status: 'Active' }),
      f({ id: 53, name: 'Hatch Rose', sire: 'True Hatch', dam: 'Mountain Rose', gender: 'Hen', status: 'Active' }),
      f({ id: 56, name: 'Hatch Ruby', sire: 'True Hatch', dam: 'Silver Princess', gender: 'Hen', status: 'Active' }),
      f({ id: 59, name: 'Lemon Princess', sire: 'Iron Lemon', dam: 'Crimson Belle', gender: 'Hen', status: 'Active' }),
      // Inactive birds (1 Archived, 1 Deceased) that must NOT be counted in active registry
      f({ id: 60, name: 'Lemon Duke II', sire: 'Iron Lemon', dam: 'Golden Pearl', gender: 'Rooster', status: 'Deceased' }),
      f({ id: 61, name: 'Sweater Crimson', sire: 'Titan Sweater', dam: 'Crimson Belle', gender: 'Rooster', status: 'Archived' }),
    ];

    const tabLists = registryTabLists(fowls);
    const counts = getRegistryCounts(fowls);

    // 1. Dashboard role counts equal Registry tab counts
    expect(counts.breedingMales).toBe(tabLists.males.length);
    expect(counts.breedingFemales).toBe(tabLists.females.length);
    expect(counts.nonBreeding).toBe(tabLists.nonBreeding.length);
    expect(counts.sireMaterial).toBe(tabLists.sireMaterial.length);

    // Concrete numbers match the user scenario exactly
    expect(counts.total).toBe(29);
    expect(counts.breedingMales).toBe(3);
    expect(counts.breedingFemales).toBe(7);
    expect(counts.nonBreeding).toBe(19);
    expect(counts.sireMaterial).toBe(4);

    // 2. The three role counts add up to the active total:
    // Breeding Male + Breeding Female + Non-Breeding = Active (3 + 7 + 19 = 29)
    expect(counts.breedingMales + counts.breedingFemales + counts.nonBreeding).toBe(counts.total);
    expect(counts.total).toBe(tabLists.active.length);

    // 3. Whole flock reconciliation:
    // Active + Archived + Deceased = Total (29 + 1 + 1 = 31)
    expect(counts.archived).toBe(1);
    expect(counts.deceased).toBe(1);
    expect(counts.flockTotal).toBe(31);
    expect(counts.total + counts.archived + counts.deceased).toBe(counts.flockTotal);

    // 4. Sex counts add up to the active total:
    // Male + Female = Active (15 + 14 = 29)
    expect(counts.maleSex).toBe(15);
    expect(counts.femaleSex).toBe(14);
    expect(counts.maleSex + counts.femaleSex).toBe(counts.total);

    // 5. Sire Material location verification (never counted as an additive 4th role):
    // Out of the 4 Sire Material chickens:
    // - 1 is counted inside Breeding Male (Iron Lemon, foundation sire)
    // - 3 are counted inside Non-Breeding (Sweater Bolt, Hatch Silver, Sweater Red Storm)
    const sireMaterialIds = new Set(tabLists.sireMaterial.map((x) => x.id));
    expect(sireMaterialIds.size).toBe(4);
    const inBreedingMales = tabLists.males.filter((x) => sireMaterialIds.has(x.id)).length;
    const inNonBreeding = tabLists.nonBreeding.filter((x) => sireMaterialIds.has(x.id)).length;
    const inBreedingFemales = tabLists.females.filter((x) => sireMaterialIds.has(x.id)).length;
    expect(inBreedingMales).toBe(1);
    expect(inNonBreeding).toBe(3);
    expect(inBreedingFemales).toBe(0);
    // Confirm no double counting occurs
    expect(inBreedingMales + inNonBreeding).toBe(4);
  });
});
