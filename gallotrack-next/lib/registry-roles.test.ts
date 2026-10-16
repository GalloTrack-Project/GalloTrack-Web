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
  isBreederStock,
  isBreedingReady,
  daysUntilBreedingReady,
  isBreedingReadySoon,
  countRuleCheck,
  getRegistryCounts,
  makeRegistryComparator,
  isNonBreedingProspect,
  getProspectCategoryCounts,
  filterProspectsByCategory,
  ROLE_LABEL,
  isBreedingStockOffspring,
  isNonBreedingOffspring,
  getOffspringClassificationCounts,
  filterOffspringByClassification,
  extractFoughtLookups,
  hasFightRecord,
  isRetiredFighter,
  MIN_BREEDING_AGE_DAYS,
  MIN_BREEDING_AGE_BY_SEX,
  getMinBreedingAgeDays,
  validateOffspringBirthdate,
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

describe('isBreedingReady (Active breeding specification)', () => {
  const NOW = new Date('2026-10-16T00:00:00Z').getTime();
  const day = (n: number) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

  it('requires active status and not archived or deceased', () => {
    expect(isBreedingReady(f({ id: 1, name: 'Active', birthdate: day(300) }), undefined, NOW)).toBe(true);
    expect(isBreedingReady(f({ id: 2, name: 'Archived', status: 'Archived', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 3, name: 'Deceased', status: 'Deceased', birthdate: day(300) }), undefined, NOW)).toBe(false);
  });

  it('excludes inactive activity_status and retired / inactive archive_kinds', () => {
    expect(isBreedingReady(f({ id: 4, name: 'Inactive Activity', activity_status: 'inactive', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 5, name: 'Retired Kind', archive_kind: 'retired', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 6, name: 'Sold Kind', archive_kind: 'sold', birthdate: day(300) }), undefined, NOW)).toBe(false);
  });

  it('excludes birds retired from breeding (retired_scope = breeding or both)', () => {
    expect(isBreedingReady(f({ id: 7, name: 'Retired Breeding', retired_scope: 'breeding', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 8, name: 'Retired Both', retired_scope: 'both', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 9, name: 'Retired Fighting Only', retired_scope: 'fighting', birthdate: day(300) }), undefined, NOW)).toBe(true);
  });

  it('excludes infertile birds (condition_status = Infertile, case-insensitive)', () => {
    expect(isBreedingReady(f({ id: 10, name: 'Infertile 1', condition_status: 'Infertile', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 11, name: 'Infertile 2', condition_status: 'infertile', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 12, name: 'Fit Bird', condition_status: 'Fit / Recovered', birthdate: day(300) }), undefined, NOW)).toBe(true);
  });

  it('requires either an Active Breeder or Breeding Stock offspring', () => {
    // Active Breeder (Breeding Male / Female)
    expect(isBreedingReady(f({ id: 13, name: 'Active Sire', registry_role: 'Breeding Male', birthdate: day(300) }), undefined, NOW)).toBe(true);
    expect(isBreedingReady(f({ id: 14, name: 'Active Dam', registry_role: 'Breeding Female', gender: 'Hen', birthdate: day(300) }), undefined, NOW)).toBe(true);

    // Breeding Stock offspring (material or breeder role)
    expect(isBreedingReady(f({ id: 15, name: 'Stock Offspring', registry_role: 'Non-Breeding', breeding_role: 'material', birthdate: day(300) }), undefined, NOW)).toBe(true);
    expect(isBreedingReady(f({ id: 16, name: 'Promoted Prospect', registry_role: 'Non-Breeding', breeding_role: 'breeder', birthdate: day(300) }), undefined, NOW)).toBe(true);

    // Non-breeding offspring without breeding designation -> NOT ready
    expect(isBreedingReady(f({ id: 17, name: 'Regular Offspring', registry_role: 'Non-Breeding', breeding_role: 'none', birthdate: day(300) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 18, name: 'Unassigned Offspring', registry_role: 'Non-Breeding', birthdate: day(300) }), undefined, NOW)).toBe(false);
  });

  it('enforces age at or above MIN_BREEDING_AGE_DAYS (240)', () => {
    expect(MIN_BREEDING_AGE_DAYS).toBe(240);
    expect(isBreedingReady(f({ id: 19, name: 'Age 240', birthdate: day(240) }), undefined, NOW)).toBe(true);
    expect(isBreedingReady(f({ id: 20, name: 'Age 239', birthdate: day(239) }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 21, name: 'Age 100', birthdate: day(100) }), undefined, NOW)).toBe(false);
  });

  it('supports single-point configuration and sex-specific thresholds for roosters and hens', () => {
    expect(getMinBreedingAgeDays('Rooster')).toBe(240);
    expect(getMinBreedingAgeDays('Hen')).toBe(240);
    expect(getMinBreedingAgeDays(undefined)).toBe(240);

    // Verify it easily supports separate rooster vs hen values if configured
    try {
      MIN_BREEDING_AGE_BY_SEX.male = 270;
      MIN_BREEDING_AGE_BY_SEX.female = 210;
      expect(getMinBreedingAgeDays('Rooster')).toBe(270);
      expect(getMinBreedingAgeDays('Hen')).toBe(210);

      // Hen at 220d is ready under 210d threshold
      expect(isBreedingReady(f({ id: 191, name: 'Hen 220d', gender: 'Hen', birthdate: day(220) }), undefined, NOW)).toBe(true);
      // Rooster at 250d is not ready under 270d threshold
      expect(isBreedingReady(f({ id: 192, name: 'Rooster 250d', gender: 'Rooster', birthdate: day(250) }), undefined, NOW)).toBe(false);
    } finally {
      // Restore baseline
      MIN_BREEDING_AGE_BY_SEX.male = 240;
      MIN_BREEDING_AGE_BY_SEX.female = 240;
    }
  });

  it('returns false when birth date is missing without guessing from growth stages', () => {
    expect(isBreedingReady(f({ id: 22, name: 'No Birthdate Cock', birthdate: '', growth_stage: 'Cock' }), undefined, NOW)).toBe(false);
    expect(isBreedingReady(f({ id: 23, name: 'Null Birthdate Hen', birthdate: undefined, growth_stage: 'Hen' }), undefined, NOW)).toBe(false);
  });

  it('does not hardcode growth-stage name exclusions when age qualifies', () => {
    // If a bird is labeled Chick / Stag / Pullet but has age >= 240 days, age rule qualifies it
    expect(isBreedingReady(f({ id: 24, name: 'Stage Chick but Old', birthdate: day(250), growth_stage: 'Chick' }), undefined, NOW)).toBe(true);
    expect(isBreedingReady(f({ id: 25, name: 'Stage Stag but Old', birthdate: day(250), growth_stage: 'Stag' }), undefined, NOW)).toBe(true);
    // If a bird is labeled Cock but age < 240 days, age rule rejects it
    expect(isBreedingReady(f({ id: 26, name: 'Stage Cock but Young', birthdate: day(200), growth_stage: 'Cock' }), undefined, NOW)).toBe(false);
  });

  it('derives expected Ready to Breed count dynamically from fixtures', () => {
    const fixtureFlock: FowlRecord[] = [
      f({ id: 101, name: 'Ready Breeder 1', registry_role: 'Breeding Male', birthdate: day(300) }), // YES
      f({ id: 102, name: 'Ready Breeder 2', registry_role: 'Breeding Female', gender: 'Hen', birthdate: day(250) }), // YES
      f({ id: 103, name: 'Ready Stock Offspring', registry_role: 'Non-Breeding', breeding_role: 'material', birthdate: day(245) }), // YES
      f({ id: 104, name: 'Young Breeder', registry_role: 'Breeding Male', birthdate: day(180) }), // NO (too young)
      f({ id: 105, name: 'Archived Breeder', registry_role: 'Breeding Male', status: 'Archived', birthdate: day(400) }), // NO (archived)
      f({ id: 106, name: 'Infertile Breeder', registry_role: 'Breeding Female', gender: 'Hen', condition_status: 'Infertile', birthdate: day(400) }), // NO (infertile)
      f({ id: 107, name: 'Retired Scope Breeder', registry_role: 'Breeding Male', retired_scope: 'breeding', birthdate: day(400) }), // NO (retired)
      f({ id: 108, name: 'Non-Breeding Offspring', registry_role: 'Non-Breeding', breeding_role: 'none', birthdate: day(300) }), // NO (not breeding stock)
      f({ id: 109, name: 'Missing Birthdate Breeder', registry_role: 'Breeding Male', birthdate: '' }), // NO (missing birthdate)
      f({ id: 110, name: 'Inactive Status Breeder', registry_role: 'Breeding Male', activity_status: 'inactive', birthdate: day(350) }), // NO (inactive activity)
    ];

    // Compute expected count derived by matching individual criteria predicates
    const derivedReadyCount = fixtureFlock.filter((fowl) => {
      const active = isActiveStatus(fowl) && fowl.activity_status !== 'inactive' && !fowl.archive_kind;
      const notRetired = fowl.retired_scope !== 'breeding' && fowl.retired_scope !== 'both';
      const notInfertile = (fowl.condition_status || '').toLowerCase() !== 'infertile';
      const role = roleOf(fowl);
      const eligibleRole = role === 'Breeding Male' || role === 'Breeding Female' || (role === 'Non-Breeding' && isBreedingStockOffspring(fowl));
      const birth = (fowl.birthdate || '').trim();
      const ageDays = birth ? (NOW - new Date(birth).getTime()) / 86400000 : null;
      const mature = ageDays !== null && ageDays >= MIN_BREEDING_AGE_DAYS;
      return active && notRetired && notInfertile && eligibleRole && mature;
    }).length;

    expect(derivedReadyCount).toBe(3);
    const readyFiltered = fixtureFlock.filter((f) => isBreedingReady(f, undefined, NOW)).length;
    expect(readyFiltered).toBe(derivedReadyCount);
    expect(inventoryCounts(fixtureFlock).breedingReady).toBe(derivedReadyCount);
  });
});

describe('validateOffspringBirthdate (Birth Date Validation)', () => {
  const sire = f({ id: 1, name: 'Sire Iron', bird_code: '10', birthdate: '2024-01-01', registry_role: 'Breeding Male' });
  const dam = f({ id: 2, name: 'Dam Pearl', bird_code: 'A', birthdate: '2024-02-01', gender: 'Hen', registry_role: 'Breeding Female' });
  const fowls = [sire, dam];

  it('blocks when offspring birth date is earlier than sire birth date', () => {
    const res = validateOffspringBirthdate('2023-12-15', 'Sire Iron', 'Dam Pearl', fowls);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("earlier than Sire's birth date");
  });

  it('blocks when offspring birth date is earlier than dam birth date', () => {
    const res = validateOffspringBirthdate('2024-01-15', 'Sire Iron', 'Dam Pearl', fowls);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("earlier than Dam's birth date");
  });

  it('warns (does not block) if parent was younger than MIN_BREEDING_AGE_DAYS (240 days) at offspring birth', () => {
    // Sire born 2024-01-01. Offspring born 2024-06-01 (152 days after sire birth, < 240 days).
    const res = validateOffspringBirthdate('2024-06-01', 'Sire Iron', 'Dam Pearl', fowls);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings.some((w) => w.includes('recommended minimum breeding age'))).toBe(true);
  });

  it('passes cleanly without warnings when parents are mature (> 240 days) at offspring birth', () => {
    // Both parents born Jan/Feb 2024. Offspring born 2025-01-01 (> 330 days).
    const res = validateOffspringBirthdate('2025-01-01', 'Sire Iron', 'Dam Pearl', fowls);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
  });

  it('handles Foundation Stock or missing parents cleanly without errors', () => {
    const res = validateOffspringBirthdate('2025-01-01', 'Foundation Stock', 'Foundation Stock', fowls);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
  });
});

describe('daysUntilBreedingReady / isBreedingReadySoon (30-day countdown)', () => {
  const NOW = new Date('2026-10-13T00:00:00Z').getTime();
  const day = (n: number) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

  it('counts down to the 240-day threshold and returns null once ready', () => {
    expect(daysUntilBreedingReady(f({ id: 1, name: 'A', birthdate: day(239) }), NOW)).toBe(1);
    expect(daysUntilBreedingReady(f({ id: 2, name: 'B', birthdate: day(240) }), NOW)).toBeNull();
    expect(daysUntilBreedingReady(f({ id: 3, name: 'C', birthdate: day(250) }), NOW)).toBeNull();
  });

  it('flags chickens inside the 30-day window (inclusive) only', () => {
    expect(daysUntilBreedingReady(f({ id: 4, name: 'D', birthdate: day(210) }), NOW)).toBe(30);
    expect(isBreedingReadySoon(f({ id: 4, name: 'D', birthdate: day(210) }), NOW)).toBe(true);
    expect(daysUntilBreedingReady(f({ id: 5, name: 'E', birthdate: day(209) }), NOW)).toBe(31);
    expect(isBreedingReadySoon(f({ id: 5, name: 'E', birthdate: day(209) }), NOW)).toBe(false);
  });

  it('returns null without a usable birthdate or when not active', () => {
    expect(daysUntilBreedingReady(f({ id: 6, name: 'F', growth_stage: 'Hen' }), NOW)).toBeNull();
    expect(daysUntilBreedingReady(f({ id: 7, name: 'G', birthdate: 'not-a-date' }), NOW)).toBeNull();
    expect(daysUntilBreedingReady(f({ id: 8, name: 'H', birthdate: day(220), status: 'Archived' }), NOW)).toBeNull();
    expect(isBreedingReadySoon(f({ id: 9, name: 'I', birthdate: day(220), status: 'Deceased' }), NOW)).toBe(false);
  });
});

describe('isBreederStock (Active Breeders tab)', () => {
  it('includes active birds with Breeding Male or Breeding Female registry roles', () => {
    expect(isBreederStock(f({ id: 1, name: 'Iron', registry_role: 'Breeding Male' }))).toBe(true);
    expect(isBreederStock(f({ id: 2, name: 'Golden', gender: 'Hen', registry_role: 'Breeding Female' }))).toBe(true);
  });

  it('excludes offspring even if breeding_role is breeder or material (until promoted)', () => {
    expect(isBreederStock(f({ id: 3, name: 'Picked', breeding_role: 'breeder', registry_role: 'Non-Breeding' }))).toBe(false);
    expect(isBreederStock(f({ id: 4, name: 'Kid', registry_role: 'Non-Breeding' }))).toBe(false);
    expect(isBreederStock(f({ id: 5, name: 'Pro', breeding_role: 'material', registry_role: 'Non-Breeding' }))).toBe(false);
    expect(isBreederStock(f({ id: 6, name: 'Old', registry_role: 'Breeding Male', status: 'Archived' }))).toBe(false);
    expect(isBreederStock(f({ id: 7, name: 'Gone', registry_role: 'Breeding Female', status: 'Deceased' }))).toBe(false);
  });

  it('enforces that an offspring with breeding_role = "breeder" appears in Offspring Breeding Stock and NOT in Inventory Active Breeders', () => {
    const offspringBreeder = f({
      id: 99,
      name: 'Future Sire',
      registry_role: 'Non-Breeding',
      breeding_role: 'breeder',
      status: 'Active',
    });

    // 1. Offspring tab classification: belongs to Breeding Stock pill
    expect(isBreedingStockOffspring(offspringBreeder)).toBe(true);
    expect(isNonBreedingOffspring(offspringBreeder)).toBe(false);

    // 2. Inventory Active Breeders: strictly excluded
    expect(isBreederStock(offspringBreeder)).toBe(false);

    // 3. Inventory counts: not counted in breedersStock
    const counts = inventoryCounts([offspringBreeder]);
    expect(counts.active).toBe(1);
    expect(counts.breedersStock).toBe(0);
  });

  it('derives NULL roles through the registry context (parents in, offspring out)', () => {
    const dam = f({ id: 8, name: 'Mom', gender: 'Hen', dam: 'Base Hen' });
    const kid = f({ id: 9, name: 'Kid', gender: 'Rooster', dam: 'Mom' });
    const ctx = buildRegistryContext([dam, kid]);
    expect(isBreederStock(dam, ctx)).toBe(true);
    expect(isBreederStock(dam)).toBe(false);
    expect(isBreederStock(kid, ctx)).toBe(false);
  });

  it('inventoryCounts reports breedersStock separately from the active total', () => {
    const fowls = [
      f({ id: 10, name: 'Sire', registry_role: 'Breeding Male' }),
      f({ id: 11, name: 'Dam', gender: 'Hen', registry_role: 'Breeding Female' }),
      f({ id: 12, name: 'Chick', registry_role: 'Non-Breeding' }),
      f({ id: 13, name: 'Sold', registry_role: 'Breeding Male', status: 'Archived' }),
    ];
    const counts = inventoryCounts(fowls);
    expect(counts.active).toBe(3);
    expect(counts.breedersStock).toBe(2);
    expect(counts.archived).toBe(1);
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

describe('Offspring category helpers', () => {
  it('ROLE_LABEL maps Non-Breeding to Offspring', () => {
    expect(ROLE_LABEL['Non-Breeding']).toBe('Offspring');
  });

  it('isNonBreedingProspect returns true for none or retired birds, and false for material/breeder', () => {
    // 1. None / unassigned -> true
    expect(isNonBreedingProspect(f({ id: 1, name: 'Offspring 1', breeding_role: 'none' }))).toBe(true);
    expect(isNonBreedingProspect(f({ id: 2, name: 'Offspring 2' }))).toBe(true);

    // 2. Material / Breeder -> false (eligible for breeding)
    expect(isNonBreedingProspect(f({ id: 3, name: 'Offspring 3', breeding_role: 'material' }))).toBe(false);
    expect(isNonBreedingProspect(f({ id: 4, name: 'Offspring 4', breeding_role: 'breeder' }))).toBe(false);

    // 3. Retired from breeding -> true even if previously material
    expect(isNonBreedingProspect(f({ id: 5, name: 'Offspring 5', breeding_role: 'material', retired_scope: 'breeding' }))).toBe(true);
    expect(isNonBreedingProspect(f({ id: 6, name: 'Offspring 6', retired_scope: 'both' }))).toBe(true);

    // 4. Inactive / archived / deceased -> true
    expect(isNonBreedingProspect(f({ id: 7, name: 'Offspring 7', status: 'Archived', archive_kind: 'retired' }))).toBe(true);
    expect(isNonBreedingProspect(f({ id: 8, name: 'Offspring 8', status: 'Deceased' }))).toBe(true);
    expect(isNonBreedingProspect(f({ id: 9, name: 'Offspring 9', activity_status: 'inactive' }))).toBe(true);
  });

  it('getProspectCategoryCounts computes all, nonBreeding, and fightProspects counts', () => {
    const foughtNames = new Set(['chick-1', 'chick-3']);
    const prospects = [
      f({ id: 1, name: 'Chick-1', breeding_role: 'none' }),
      f({ id: 2, name: 'Chick-2', breeding_role: 'material' }),
      f({ id: 3, name: 'Chick-3', breeding_role: 'material' }),
      f({ id: 4, name: 'Chick-4', breeding_role: 'none' }),
    ];

    const counts = getProspectCategoryCounts(prospects, foughtNames);
    expect(counts.all).toBe(4);
    // Chick-1 and Chick-4 have breeding_role: 'none'
    expect(counts.nonBreeding).toBe(2);
    // Chick-2 and Chick-4 have not fought
    expect(counts.fightProspects).toBe(2);
    expect(counts.noFight).toBe(2);
  });

  it('filterProspectsByCategory filters properly by category including fight-prospects and legacy no-fight alias', () => {
    const foughtNames = new Set(['chick-1']);
    const prospects = [
      f({ id: 1, name: 'Chick-1', breeding_role: 'none' }),
      f({ id: 2, name: 'Chick-2', breeding_role: 'material' }),
    ];

    expect(filterProspectsByCategory(prospects, 'all', foughtNames)).toHaveLength(2);
    expect(filterProspectsByCategory(prospects, 'non-breeding', foughtNames).map((p) => p.name)).toEqual(['Chick-1']);
    expect(filterProspectsByCategory(prospects, 'fight-prospects', foughtNames).map((p) => p.name)).toEqual(['Chick-2']);
    expect(filterProspectsByCategory(prospects, 'no-fight', foughtNames).map((p) => p.name)).toEqual(['Chick-2']);
  });

  it('enforces Breeding Stock + Non-Breeding = All Offspring invariant with zero overlap', () => {
    const offspring = [
      f({ id: 1, name: 'Offspring A', breeding_role: 'material' }),
      f({ id: 2, name: 'Offspring B', breeding_role: 'breeder' }),
      f({ id: 3, name: 'Offspring C', breeding_role: 'none' }),
      f({ id: 4, name: 'Offspring D' }), // unassigned
      f({ id: 5, name: 'Offspring E', breeding_role: 'material' }),
    ];

    const counts = getOffspringClassificationCounts(offspring);
    expect(counts.all).toBe(5);
    expect(counts.breedingStock).toBe(3);
    expect(counts.nonBreeding).toBe(2);
    expect(counts.breedingStock + counts.nonBreeding).toBe(counts.all);

    const bsList = filterOffspringByClassification(offspring, 'breeding-stock');
    const nbList = filterOffspringByClassification(offspring, 'non-breeding');
    expect(bsList.length).toBe(3);
    expect(nbList.length).toBe(2);

    // Mutual exclusivity check
    const bsIds = new Set(bsList.map((x) => x.id));
    for (const nb of nbList) {
      expect(bsIds.has(nb.id)).toBe(false);
    }
  });

  it('determines fight status by fowl ID foreign key', () => {
    const matches: MatchRecord[] = [
      { id: 101, fowl_id: 42, entry_name: 'Lemon Storm' } as MatchRecord,
      { id: 102, fowl_id: 55, entry_name: 'Hatch Silver' } as MatchRecord,
    ];
    const { foughtFowlIds, foughtNames } = extractFoughtLookups(matches);
    expect(foughtFowlIds.has(42)).toBe(true);
    expect(foughtFowlIds.has(55)).toBe(true);
    expect(foughtFowlIds.has(43)).toBe(false);

    const birdWithFight = f({ id: 42, name: 'Lemon Storm' });
    const birdWithoutFight = f({ id: 43, name: 'Lemon Blaze' });
    expect(hasFightRecord(birdWithFight, foughtFowlIds, foughtNames)).toBe(true);
    expect(hasFightRecord(birdWithoutFight, foughtFowlIds, foughtNames)).toBe(false);
  });
});

describe('breeding_role = "breeder" restrictions (promotion flow only)', () => {
  it('identifies unpromoted offspring so that the manual "breeder" toggle is disabled while "material" is allowed', () => {
    const regCtx = buildRegistryContext([
      f({ id: 1, name: 'Sire 1', registry_role: 'Breeding Male' }),
      f({ id: 2, name: 'Dam 1', registry_role: 'Breeding Female' }),
    ]);

    const offspring = f({ id: 3, name: 'Offspring Chick', sire: 'Sire 1', dam: 'Dam 1', registry_role: 'Non-Breeding' });
    const isUnpromoted = roleOf(offspring, regCtx) === 'Non-Breeding';
    expect(isUnpromoted).toBe(true);

    // In FowlDetailsModal, options for manual toggle evaluate isUnpromoted:
    const roleOptions = [
      { value: 'none', label: 'Not a breeder' },
      { value: 'breeder', label: 'Breeder' },
      { value: 'material', label: 'Material' },
    ];
    const evaluatedOptions = roleOptions.map((o) => ({
      value: o.value,
      disabled: o.value === 'breeder' && isUnpromoted,
    }));

    expect(evaluatedOptions.find((o) => o.value === 'breeder')?.disabled).toBe(true);
    expect(evaluatedOptions.find((o) => o.value === 'material')?.disabled).toBe(false);
    expect(evaluatedOptions.find((o) => o.value === 'none')?.disabled).toBe(false);
  });

  it('allows breeder role for promoted birds whose registry role is Breeding Male or Female', () => {
    const promotedSire = f({ id: 4, name: 'Promoted Sire', registry_role: 'Breeding Male', breeding_role: 'breeder' });
    const isUnpromoted = roleOf(promotedSire) === 'Non-Breeding';
    expect(isUnpromoted).toBe(false);
  });
});

describe('isRetiredFighter rule evaluation', () => {
  const matches: MatchRecord[] = [
    { id: 1, fowl_id: 10, entry_name: 'Iron Lemon' } as MatchRecord,
    { id: 2, fowl_id: 20, entry_name: 'Hatch Silver' } as MatchRecord,
    { id: 3, fowl_id: 30, entry_name: 'Hatch Mountain' } as MatchRecord,
  ];
  const { foughtFowlIds, foughtNames } = extractFoughtLookups(matches);

  it('qualifies a bird that fought AND is an Active Breeder (Breeding Male / Female)', () => {
    const foughtMaleBreeder = f({
      id: 10,
      name: 'Iron Lemon',
      registry_role: 'Breeding Male',
      breeding_role: 'material',
    });
    expect(isRetiredFighter(foughtMaleBreeder, foughtFowlIds, foughtNames)).toBe(true);
  });

  it('qualifies an offspring that fought AND is designated as Breeding Stock', () => {
    const foughtOffspringBreedingStock = f({
      id: 20,
      name: 'Hatch Silver',
      registry_role: 'Non-Breeding',
      breeding_role: 'material',
    });
    expect(isRetiredFighter(foughtOffspringBreedingStock, foughtFowlIds, foughtNames)).toBe(true);

    const foughtPromotedOffspringBreedingStock = f({
      id: 20,
      name: 'Hatch Silver',
      registry_role: 'Non-Breeding',
      breeding_role: 'breeder',
    });
    expect(isRetiredFighter(foughtPromotedOffspringBreedingStock, foughtFowlIds, foughtNames)).toBe(true);
  });

  it('does NOT qualify an offspring that fought but is regular non-breeding (not breeding stock)', () => {
    const foughtRegularOffspring = f({
      id: 30,
      name: 'Hatch Mountain',
      registry_role: 'Non-Breeding',
      breeding_role: 'none',
    });
    expect(isRetiredFighter(foughtRegularOffspring, foughtFowlIds, foughtNames)).toBe(false);
  });

  it('does NOT qualify a breeding stock offspring that has never fought', () => {
    const unfoughtBreedingStock = f({
      id: 40,
      name: 'Sweater Bolt',
      registry_role: 'Non-Breeding',
      breeding_role: 'material',
    });
    expect(isRetiredFighter(unfoughtBreedingStock, foughtFowlIds, foughtNames)).toBe(false);
  });

  it('does NOT qualify an active breeder that has never fought', () => {
    const unfoughtBreeder = f({
      id: 50,
      name: 'True Hatch',
      registry_role: 'Breeding Male',
      breeding_role: 'none',
    });
    expect(isRetiredFighter(unfoughtBreeder, foughtFowlIds, foughtNames)).toBe(false);
  });
});

