import { describe, it, expect, vi } from 'vitest';
import { FEATHER_COLOR_LIST, TRAIT_LIST } from './helpers';
import { insertFowl, updateFowl } from './services/fowl-service';
import type { FowlRecord } from './types';

// Mock supabase client used in fowl-service
vi.mock('@/lib/registry', () => {
  let lastInserted: Record<string, unknown> | null = null;
  let lastUpdated: Record<string, unknown> | null = null;

  return {
    supabase: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'test-user-uuid' } } })),
      },
      from: vi.fn((_table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: [
                {
                  id: 1,
                  user_id: 'test-user-uuid',
                  name: 'Sire Thunder',
                  breed: 'Sweater',
                  color: 'Wheaten',
                  behavior_trait: 'Aggressive Counter Striker',
                },
              ],
              error: null,
            })),
          })),
          in: vi.fn(async () => ({ data: [], error: null })),
          single: vi.fn(async () => ({ data: { id: 101 }, error: null })),
        })),
        insert: vi.fn((payloads: Record<string, unknown>[]) => {
          lastInserted = payloads[0];
          return {
            select: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { id: 101, ...lastInserted }, error: null })),
            })),
          };
        }),
        update: vi.fn((patch: Record<string, unknown>) => {
          lastUpdated = patch;
          return {
            eq: vi.fn(async () => ({ error: null })),
          };
        }),
      })),
      getLastInserted: () => lastInserted,
      getLastUpdated: () => lastUpdated,
    },
  };
});

describe('Trait and Feather Color — Registration and Storage Contract', () => {
  it('exports valid standard options for Feather Color and Trait', () => {
    expect(FEATHER_COLOR_LIST.length).toBeGreaterThanOrEqual(10);
    expect(FEATHER_COLOR_LIST).toContain('Black-Breasted Red');
    expect(FEATHER_COLOR_LIST).toContain('Wheaten');
    expect(FEATHER_COLOR_LIST).toContain('Dark Red');
    expect(FEATHER_COLOR_LIST).toContain('White');

    expect(TRAIT_LIST.length).toBeGreaterThanOrEqual(10);
    expect(TRAIT_LIST).toContain('Aggressive');
    expect(TRAIT_LIST).toContain('Smart Fighter');
    expect(TRAIT_LIST).toContain('Powerful');
    expect(TRAIT_LIST).toContain('High Velocity Cutter');
  });

  it('maps trait and feather_color correctly to database schema columns on insert', async () => {
    const { supabase } = await import('@/lib/registry');

    const result = await insertFowl({
      user_id: 'test-user-uuid',
      name: 'Titan Cutter',
      breed: 'Sweater',
      gender: 'Rooster',
      trait: 'High Velocity Cutter',
      feather_color: 'Dark Red',
    });

    expect(result.error).toBeUndefined();
    expect(result.id).toBe(101);

    type MockRegistry = typeof supabase & {
      getLastInserted: () => Record<string, unknown> | null;
      getLastUpdated: () => Record<string, unknown> | null;
    };

    const inserted = (supabase as unknown as MockRegistry).getLastInserted();
    expect(inserted).toBeDefined();
    expect(inserted?.behavior_trait).toBe('High Velocity Cutter');
    expect(inserted?.color).toBe('Dark Red');
  });

  it('maps trait and feather_color correctly on update', async () => {
    const { supabase } = await import('@/lib/registry');

    const result = await updateFowl(101, {
      trait: 'Smart Fighter',
      feather_color: 'Wheaten',
    });

    expect(result.error).toBeUndefined();

    type MockRegistry = typeof supabase & {
      getLastInserted: () => Record<string, unknown> | null;
      getLastUpdated: () => Record<string, unknown> | null;
    };

    const updated = (supabase as unknown as MockRegistry).getLastUpdated();
    expect(updated).toBeDefined();
    expect(updated?.behavior_trait).toBe('Smart Fighter');
    expect(updated?.color).toBe('Wheaten');
  });

  it('allows FowlRecord interface to access trait and feather_color', () => {
    const fowl: FowlRecord = {
      id: 5,
      name: 'Ruby Ace',
      breed: 'Hatch',
      gender: 'Hen',
      color: 'Dark Cornish',
      feather_color: 'Dark Cornish',
      color_category: 'Dark',
      growth_stage: 'Matron',
      behavior_trait: 'Tenacious Offense',
      trait: 'Tenacious Offense',
      eye_variant: 'Pearl',
      birthdate: '2025-01-01',
      age: '12 Months',
      weight: '1.8',
      height: '42',
      leg_color: 'Green / Slate',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_pct: 100,
      dam_pct: 100,
      bloodline_pct: 100,
      status: 'Active',
    };

    expect(fowl.trait).toBe('Tenacious Offense');
    expect(fowl.feather_color).toBe('Dark Cornish');
  });
});
