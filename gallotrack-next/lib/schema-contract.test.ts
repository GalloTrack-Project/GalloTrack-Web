import { describe, it, expect, vi } from 'vitest';
import {
  FOWL_COLUMNS,
  MATCH_COLUMNS,
  BREEDING_PAIRINGS_COLUMNS,
  FOWL_STATUS_HISTORY_COLUMNS,
  filterAllowedColumns,
} from './schema-contract';

describe('Schema Contract — Column Allowlist and Payload Verification', () => {
  it('defines the exact 40 allowed columns for the fowl table', () => {
    expect(FOWL_COLUMNS.length).toBe(40);
    expect(FOWL_COLUMNS).toContain('bird_code');
    expect(FOWL_COLUMNS).toContain('wing_band');
    expect(FOWL_COLUMNS).toContain('sire_id');
    expect(FOWL_COLUMNS).toContain('dam_id');

    // Assert phantom columns are absent
    expect(FOWL_COLUMNS).not.toContain('chicken_code');
    expect(FOWL_COLUMNS).not.toContain('birth_code');
    expect(FOWL_COLUMNS).not.toContain('tag_number');
    expect(FOWL_COLUMNS).not.toContain('registry_role');

    expect(MATCH_COLUMNS.length).toBe(25);
    expect(BREEDING_PAIRINGS_COLUMNS.length).toBe(16);
    expect(FOWL_STATUS_HISTORY_COLUMNS.length).toBe(9);
  });

  it('builds real insert payload for a Sire and asserts every key is allowed', () => {
    // Real payload constructed when registering a foundation Sire
    const sirePayload = {
      user_id: '11111111-2222-3333-4444-555555555555',
      name: 'Thunderbolt Sire 1',
      breed: 'Sweater',
      gender: 'Rooster',
      color: 'Bright Red',
      color_category: 'Red',
      growth_stage: 'Cock',
      behavior_trait: 'Aggressive',
      eye_variant: 'Orange',
      birthdate: '2025-01-15',
      age: '1 year 9 mos',
      weight: '2.1 kg',
      height: '42 cm',
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
      bloodline_composition: { Sweater: 100 },
      declared_composition: [{ breed: 'Sweater', percent: 100 }],
      pairing_id: null,
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'breeder',
      activity_status: 'active',
      archive_kind: null,
      archive_reason: null,
      retired_scope: null,
      return_date: null,
      death_reason: null,
      death_date: null,
      image_url: 'https://example.com/sire1.jpg',
      notes: 'Foundation breeding cock',
    };

    const allowedSet = new Set<string>(FOWL_COLUMNS);
    for (const key of Object.keys(sirePayload)) {
      expect(allowedSet.has(key)).toBe(true);
    }

    const filtered = filterAllowedColumns('fowl', sirePayload);
    expect(Object.keys(filtered).length).toBe(Object.keys(sirePayload).length);
  });

  it('builds real insert payload for a Dam and asserts every key is allowed', () => {
    // Real payload constructed when registering a foundation Dam
    const damPayload = {
      user_id: '11111111-2222-3333-4444-555555555555',
      name: 'Golden Dam A',
      breed: 'Roundhead',
      gender: 'Hen',
      color: 'Golden Wheat',
      color_category: 'Golden',
      growth_stage: 'Hen',
      behavior_trait: 'Calm Broody',
      eye_variant: 'Brown',
      birthdate: '2025-02-10',
      age: '1 year 8 mos',
      weight: '1.8 kg',
      height: '38 cm',
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
      bloodline_composition: { Roundhead: 100 },
      declared_composition: [{ breed: 'Roundhead', percent: 100 }],
      pairing_id: null,
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'breeder',
      activity_status: 'active',
      archive_kind: null,
      archive_reason: null,
      retired_scope: null,
      return_date: null,
      death_reason: null,
      death_date: null,
      image_url: 'https://example.com/damA.jpg',
      notes: 'Proven producing hen',
    };

    const allowedSet = new Set<string>(FOWL_COLUMNS);
    for (const key of Object.keys(damPayload)) {
      expect(allowedSet.has(key)).toBe(true);
    }

    const filtered = filterAllowedColumns('fowl', damPayload);
    expect(Object.keys(filtered).length).toBe(Object.keys(damPayload).length);
  });

  it('builds real insert payload for an Offspring and asserts every key is allowed', () => {
    // Real payload constructed when registering an Offspring from Sire 1 x Dam A
    const offspringPayload = {
      user_id: '11111111-2222-3333-4444-555555555555',
      name: 'Stag 1A1',
      breed: 'Crossbred',
      gender: 'Rooster',
      color: 'Red/Wheaten',
      color_category: 'Red',
      growth_stage: 'Stag',
      behavior_trait: 'High Alertness',
      eye_variant: 'Red',
      birthdate: '2026-03-01',
      age: '7 mos',
      weight: '1.95 kg',
      height: '40 cm',
      leg_color: 'Yellow',
      sire: 'Thunderbolt Sire 1',
      dam: 'Golden Dam A',
      sire_id: 101,
      dam_id: 102,
      sire_pct: 50,
      dam_pct: 50,
      bloodline_pct: 50,
      bird_code: '1A1',
      wing_band: 'WB-101',
      bloodline_composition: { Sweater: 50, Roundhead: 50 },
      declared_composition: null,
      pairing_id: 5,
      status: 'Active',
      condition_status: 'Fit / Recovered',
      breeding_role: 'none',
      activity_status: 'active',
      archive_kind: null,
      archive_reason: null,
      retired_scope: null,
      return_date: null,
      death_reason: null,
      death_date: null,
      image_url: '',
      notes: 'First clutch cockerel',
    };

    const allowedSet = new Set<string>(FOWL_COLUMNS);
    for (const key of Object.keys(offspringPayload)) {
      expect(allowedSet.has(key)).toBe(true);
    }

    const filtered = filterAllowedColumns('fowl', offspringPayload);
    expect(Object.keys(filtered).length).toBe(Object.keys(offspringPayload).length);
  });

  it('drops disallowed or legacy keys and logs a console.warn with names only', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const payloadWithLegacy = {
      name: 'Test Bird',
      bird_code: '1A2',
      chicken_code: '1A2',
      birth_code: '1A2',
      tag_number: 'TAG-999',
      secret_token: 'secret123',
    };

    const filtered = filterAllowedColumns('fowl', payloadWithLegacy);

    expect(filtered).toHaveProperty('name', 'Test Bird');
    expect(filtered).toHaveProperty('bird_code', '1A2');
    expect(filtered).not.toHaveProperty('chicken_code');
    expect(filtered).not.toHaveProperty('birth_code');
    expect(filtered).not.toHaveProperty('tag_number');
    expect(filtered).not.toHaveProperty('secret_token');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const warnMessage = warnSpy.mock.calls[0][0];
    expect(warnMessage).toContain('chicken_code');
    expect(warnMessage).toContain('birth_code');
    expect(warnMessage).toContain('tag_number');
    expect(warnMessage).toContain('secret_token');
    // Never print secret values
    expect(warnMessage).not.toContain('secret123');

    warnSpy.mockRestore();
  });
});
