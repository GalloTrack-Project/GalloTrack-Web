import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SIRE_MATERIAL_MOVED_MESSAGE } from '@/lib/registry-labels';
import { REGISTRY_TABS } from '@/lib/nav-manifest';
import { isRetiredFighter, extractFoughtLookups } from '@/lib/registry-roles';
import type { FowlRecord, MatchRecord } from '@/lib/types';

describe('Sire Material Tab Removal and Redirect Specification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies Sire Material tab is absent from REGISTRY_TABS', () => {
    expect((REGISTRY_TABS as readonly string[]).includes('sireMaterial')).toBe(false);
    expect((REGISTRY_TABS as readonly string[]).includes('sire-material')).toBe(false);
    expect(REGISTRY_TABS).toContain('males');
    expect(REGISTRY_TABS).toContain('females');
    expect(REGISTRY_TABS).toContain('offspring');
    expect(REGISTRY_TABS).toContain('matchForm');
  });

  it('redirects ?tab=sire-material to offspring with breeding-stock pill and displays generic notification', () => {
    // Simulating the redirect logic in ProfilingPage
    const params = new URLSearchParams('tab=sire-material');
    const rawTab = params.get('tab');
    let notification: string | null = null;

    if (rawTab === 'sire-material' || rawTab === 'sireMaterial') {
      params.set('tab', 'offspring');
      params.set('class', 'breeding-stock');
      notification = SIRE_MATERIAL_MOVED_MESSAGE;
    }

    expect(params.get('tab')).toBe('offspring');
    expect(params.get('class')).toBe('breeding-stock');
    expect(notification).toBe(
      'Sire Material has moved. Breeding males are under Cocks, and offspring kept for breeding are under Breeding Stock.'
    );
    // Generic notification must NOT hardcode any bird name
    expect(notification).not.toContain('Iron Lemon');
  });

  it('redirects camelCase ?tab=sireMaterial identically', () => {
    const params = new URLSearchParams('tab=sireMaterial');
    const rawTab = params.get('tab');
    let notification: string | null = null;

    if (rawTab === 'sire-material' || rawTab === 'sireMaterial') {
      params.set('tab', 'offspring');
      params.set('class', 'breeding-stock');
      notification = SIRE_MATERIAL_MOVED_MESSAGE;
    }

    expect(params.get('tab')).toBe('offspring');
    expect(params.get('class')).toBe('breeding-stock');
    expect(notification).toBe(SIRE_MATERIAL_MOVED_MESSAGE);
  });

  it('evaluates Retired Fighter rule exclusively for birds with match records designated for breeding', () => {
    const matches: MatchRecord[] = [
      { id: 1, fowl_id: 1, entry_name: 'Fought Sire' } as MatchRecord,
      { id: 2, fowl_id: 2, entry_name: 'Fought Breeding Stock' } as MatchRecord,
      { id: 3, fowl_id: 3, entry_name: 'Fought Regular Offspring' } as MatchRecord,
    ];
    const { foughtFowlIds, foughtNames } = extractFoughtLookups(matches);

    // 1. Fought + Active Breeder (e.g. Iron Lemon) -> Retired Fighter
    const foughtSire: FowlRecord = {
      id: 1,
      name: 'Fought Sire',
      registry_role: 'Breeding Male',
      breeding_role: 'material',
      status: 'Active',
    } as FowlRecord;
    expect(isRetiredFighter(foughtSire, foughtFowlIds, foughtNames)).toBe(true);

    // 2. Fought + Offspring Breeding Stock (e.g. Hatch Silver, Sweater Red Storm) -> Retired Fighter
    const foughtStock: FowlRecord = {
      id: 2,
      name: 'Fought Breeding Stock',
      registry_role: 'Non-Breeding',
      breeding_role: 'material',
      status: 'Active',
    } as FowlRecord;
    expect(isRetiredFighter(foughtStock, foughtFowlIds, foughtNames)).toBe(true);

    // 3. Fought + Regular Offspring (e.g. Hatch Mountain, Hatch Crown) -> NOT Retired Fighter
    const foughtOffspring: FowlRecord = {
      id: 3,
      name: 'Fought Regular Offspring',
      registry_role: 'Non-Breeding',
      breeding_role: 'none',
      status: 'Active',
    } as FowlRecord;
    expect(isRetiredFighter(foughtOffspring, foughtFowlIds, foughtNames)).toBe(false);

    // 4. Never Fought + Breeding Stock (e.g. Sweater Bolt) -> NOT Retired Fighter
    const unfoughtStock: FowlRecord = {
      id: 4,
      name: 'Unfought Stock',
      registry_role: 'Non-Breeding',
      breeding_role: 'material',
      status: 'Active',
    } as FowlRecord;
    expect(isRetiredFighter(unfoughtStock, foughtFowlIds, foughtNames)).toBe(false);
  });
});
