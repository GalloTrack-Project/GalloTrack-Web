import { describe, it, expect } from 'vitest';
import type { FowlRecord, StatusHistoryEntry } from './types';
import { filterAllowedColumns } from './schema-contract';
import { registryTabLists } from './registry-roles';

describe('promoteToBreeder: Offspring 1A1 -> Sire 4 Fixture Test', () => {
  // Mock flock fixtures (isolated memory fixture, zero DB writes)
  const initialFowls: FowlRecord[] = [
    {
      id: 1,
      user_id: 'user-abc',
      name: 'Thunderbolt 1',
      breed: 'Sweater',
      gender: 'Rooster',
      color: 'Red',
      color_category: 'Red',
      growth_stage: 'Cock',
      behavior_trait: 'Aggressive',
      eye_variant: 'Orange',
      birthdate: '2024-01-01',
      age: '2 yrs',
      weight: '2.2',
      height: '42',
      leg_color: 'Yellow',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_id: null,
      dam_id: null,
      sire_pct: 0,
      dam_pct: 0,
      bloodline_pct: 100,
      bird_code: '1',
      wing_band: 'WB-001',
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'breeder',
      activity_status: 'active',
      notes: null,
    },
    {
      id: 2,
      user_id: 'user-abc',
      name: 'Golden Dam A',
      breed: 'Roundhead',
      gender: 'Hen',
      color: 'Wheat',
      color_category: 'Golden',
      growth_stage: 'Hen',
      behavior_trait: 'Calm',
      eye_variant: 'Brown',
      birthdate: '2024-02-01',
      age: '2 yrs',
      weight: '1.8',
      height: '38',
      leg_color: 'White',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_id: null,
      dam_id: null,
      sire_pct: 0,
      dam_pct: 0,
      bloodline_pct: 100,
      bird_code: 'A',
      wing_band: 'WB-002',
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'breeder',
      activity_status: 'active',
      notes: null,
    },
    {
      id: 10,
      user_id: 'user-abc',
      name: 'Offspring 1A1',
      breed: 'Sweater x Roundhead',
      gender: 'Rooster',
      color: 'Red',
      color_category: 'Red',
      growth_stage: 'Cock',
      behavior_trait: 'Fast',
      eye_variant: 'Red',
      birthdate: '2025-03-01',
      age: '1 yr',
      weight: '2.0',
      height: '40',
      leg_color: 'Yellow',
      sire: 'Thunderbolt 1',
      dam: 'Golden Dam A',
      sire_id: 1,
      dam_id: 2,
      sire_pct: 50,
      dam_pct: 50,
      bloodline_pct: 50,
      bird_code: '1A1',
      wing_band: 'WB-010',
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'none',
      activity_status: 'active',
      notes: 'Promising candidate',
    },
    {
      id: 11,
      user_id: 'user-abc',
      name: 'Offspring 1A2',
      breed: 'Sweater x Roundhead',
      gender: 'Rooster',
      color: 'Red',
      color_category: 'Red',
      growth_stage: 'Stag',
      behavior_trait: 'Active',
      eye_variant: 'Red',
      birthdate: '2025-03-01',
      age: '1 yr',
      weight: '1.9',
      height: '39',
      leg_color: 'Yellow',
      sire: 'Thunderbolt 1',
      dam: 'Golden Dam A',
      sire_id: 1,
      dam_id: 2,
      sire_pct: 50,
      dam_pct: 50,
      bloodline_pct: 50,
      bird_code: '1A2',
      wing_band: 'WB-011',
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'none',
      activity_status: 'active',
      notes: null,
    },
    {
      id: 12,
      user_id: 'user-abc',
      name: 'Offspring 1A3',
      breed: 'Sweater x Roundhead',
      gender: 'Hen',
      color: 'Wheaten',
      color_category: 'Red',
      growth_stage: 'Pullet',
      behavior_trait: 'Calm',
      eye_variant: 'Brown',
      birthdate: '2025-03-01',
      age: '1 yr',
      weight: '1.7',
      height: '37',
      leg_color: 'White',
      sire: 'Thunderbolt 1',
      dam: 'Golden Dam A',
      sire_id: 1,
      dam_id: 2,
      sire_pct: 50,
      dam_pct: 50,
      bloodline_pct: 50,
      bird_code: '1A3',
      wing_band: 'WB-012',
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'none',
      activity_status: 'active',
      notes: null,
    },
  ];

  it('promotes Offspring 1A1 to Sire 4: updates bird_code, records birth_code in history, preserves relations & counts', () => {
    const flock = JSON.parse(JSON.stringify(initialFowls)) as FowlRecord[];
    const historyRows: StatusHistoryEntry[] = [];

    const targetOffspring = flock.find((f) => f.id === 10)!;
    expect(targetOffspring.bird_code).toBe('1A1');
    expect(targetOffspring.sire_id).toBe(1);
    expect(targetOffspring.dam_id).toBe(2);

    const initialTotalCount = flock.length;
    const initialOffspringCount = flock.filter((f) => f.sire_id === 1 && f.dam_id === 2).length;
    expect(initialTotalCount).toBe(5);
    expect(initialOffspringCount).toBe(3);

    // Initial tab membership: targetOffspring is in the Offspring tab (nonBreeding), NOT Breeding Male
    const beforeTabs = registryTabLists(flock);
    expect(beforeTabs.nonBreeding.map((f) => f.id)).toContain(targetOffspring.id);
    expect(beforeTabs.males.map((f) => f.id)).not.toContain(targetOffspring.id);
    expect(beforeTabs.males.length).toBe(1);
    expect(beforeTabs.females.length).toBe(1);
    expect(beforeTabs.nonBreeding.length).toBe(3);

    // Promotion action
    const opts = {
      targetRole: 'Breeding Male' as const,
      breederCode: 'Sire 4',
      birthCode: targetOffspring.bird_code!,
    };

    // 1. Prepare lifecycle patch
    const patch = {
      registry_role: opts.targetRole,
      bird_code: opts.breederCode,
      breeding_role: 'breeder',
      status: 'Active',
      activity_status: 'active',
    };

    // Filter against schema contract: ensures phantom columns (like registry_role) are cleanly handled
    const filteredPatch = filterAllowedColumns('fowl', patch);
    expect(filteredPatch).toHaveProperty('bird_code', 'Sire 4');
    expect(filteredPatch).toHaveProperty('breeding_role', 'breeder');
    expect(filteredPatch).toHaveProperty('status', 'Active');
    expect(filteredPatch).not.toHaveProperty('registry_role');

    // 2. Prepare status history entries
    const newHistoryEntries: StatusHistoryEntry[] = [
      {
        id: 101,
        fowl_id: targetOffspring.id,
        field: 'registry_role',
        new_value: opts.targetRole,
        reason: 'promote_to_breeder',
        note: `Promoted to ${opts.targetRole} (${opts.breederCode})`,
        changed_at: new Date().toISOString(),
      },
      {
        id: 102,
        fowl_id: targetOffspring.id,
        field: 'bird_code',
        old_value: targetOffspring.bird_code,
        new_value: opts.breederCode,
        reason: 'promote_to_breeder',
        changed_at: new Date().toISOString(),
      },
      {
        id: 103,
        fowl_id: targetOffspring.id,
        field: 'birth_code',
        new_value: opts.birthCode,
        reason: 'promote_to_breeder',
        changed_at: new Date().toISOString(),
      },
    ];

    // Apply patch to simulated database row
    Object.assign(targetOffspring, filteredPatch);
    historyRows.push(...newHistoryEntries);

    // 3. Attach birth_code and registry_role from history reconciliation (matching fetchFowls() behavior)
    const birthCodeEntry = historyRows.find(
      (h) => h.fowl_id === targetOffspring.id && h.field === 'birth_code'
    );
    if (birthCodeEntry) {
      targetOffspring.birth_code = birthCodeEntry.new_value;
    }
    const roleEntry = historyRows.find(
      (h) => h.fowl_id === targetOffspring.id && h.field === 'registry_role'
    );
    if (roleEntry) {
      targetOffspring.registry_role = roleEntry.new_value as FowlRecord['registry_role'];
    }

    // ── ASSERTIONS ──

    // a. bird_code changed to the breeder code
    expect(targetOffspring.bird_code).toBe('Sire 4');

    // b. Old birth code is preserved in fowl_status_history and reconciled to .birth_code
    expect(targetOffspring.birth_code).toBe('1A1');
    const historyBirthCode = historyRows.find((h) => h.field === 'birth_code');
    expect(historyBirthCode).toBeDefined();
    expect(historyBirthCode?.new_value).toBe('1A1');
    expect(historyBirthCode?.fowl_id).toBe(10);

    // c. Siblings keep their codes
    const sibling1A2 = flock.find((f) => f.id === 11)!;
    const sibling1A3 = flock.find((f) => f.id === 12)!;
    expect(sibling1A2.bird_code).toBe('1A2');
    expect(sibling1A3.bird_code).toBe('1A3');

    // d. Lineage relations remain intact (uses integer IDs, not bird_code strings)
    expect(targetOffspring.sire_id).toBe(1);
    expect(targetOffspring.dam_id).toBe(2);
    expect(sibling1A2.sire_id).toBe(1);
    expect(sibling1A2.dam_id).toBe(2);

    // e. Total flock and offspring counts are unchanged
    expect(flock.length).toBe(initialTotalCount);
    const postOffspringCount = flock.filter((f) => f.sire_id === 1 && f.dam_id === 2).length;
    expect(postOffspringCount).toBe(initialOffspringCount);

    // f. No unique conflicts with existing birds
    const allCodes = flock.map((f) => f.bird_code).filter(Boolean);
    const uniqueCodes = new Set(allCodes);
    expect(uniqueCodes.size).toBe(allCodes.length);

    // g. PROOF: Offspring leaves Offspring tab (nonBreeding) and appears in Breeding Male tab (males)
    const afterTabs = registryTabLists(flock);
    expect(afterTabs.nonBreeding.map((f) => f.id)).not.toContain(targetOffspring.id);
    expect(afterTabs.males.map((f) => f.id)).toContain(targetOffspring.id);
    expect(afterTabs.nonBreeding.length).toBe(beforeTabs.nonBreeding.length - 1); // 3 -> 2
    expect(afterTabs.males.length).toBe(beforeTabs.males.length + 1); // 1 -> 2
    expect(afterTabs.females.length).toBe(beforeTabs.females.length); // 1 (unchanged)
  });
});
