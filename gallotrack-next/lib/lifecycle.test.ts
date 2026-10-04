import { describe, it, expect } from 'vitest';
import {
  archiveDisplay,
  archiveDraftIssue,
  archiveKindLabel,
  archivePatch,
  conditionPatch,
  deceasedPatch,
  mergeOptions,
  restorePatch,
  rolePatch,
  retiredScopeLabel,
} from './lifecycle';
import type { RegistryOption } from './types';

describe('conditionPatch (injury status)', () => {
  it('touches condition_status and nothing else', () => {
    const patch = conditionPatch('Severely Injured');
    expect(Object.keys(patch)).toEqual(['condition_status']);
    expect(patch).not.toHaveProperty('breeding_role');
    expect(patch).not.toHaveProperty('status');
    expect(patch).not.toHaveProperty('activity_status');
  });

  it('never converts an injury into a breeder, even for Deceased', () => {
    const patch = conditionPatch('Deceased');
    expect(patch).not.toHaveProperty('breeding_role');
    expect(patch).not.toHaveProperty('status');
  });
});

describe('rolePatch (manual breeding decision)', () => {
  it('touches breeding_role only', () => {
    expect(Object.keys(rolePatch('material'))).toEqual(['breeding_role']);
    expect(rolePatch('breeder')).toEqual({ breeding_role: 'breeder' });
  });
});

describe('archivePatch', () => {
  it('archives with the structured kind and goes inactive', () => {
    const patch = archivePatch({ kind: 'sold', note: 'Sold to derby team' });
    expect(patch.status).toBe('Archived');
    expect(patch.archive_kind).toBe('sold');
    expect(patch.activity_status).toBe('inactive');
    expect(patch.retired_scope).toBeNull();
    expect(patch.return_date).toBeNull();
  });

  it('keeps retired scope only for retired birds', () => {
    const patch = archivePatch({ kind: 'retired', retiredScope: 'fighting' });
    expect(patch.retired_scope).toBe('fighting');
    expect(archivePatch({ kind: 'retired' }).retired_scope).toBeNull();
    expect(archivePatch({ kind: 'sold', retiredScope: 'fighting' }).retired_scope).toBeNull();
  });

  it('keeps return date only for transfer/borrowed birds', () => {
    const patch = archivePatch({ kind: 'transfer', returnDate: '2026-12-01' });
    expect(patch.return_date).toBe('2026-12-01');
    expect(archivePatch({ kind: 'sold', returnDate: '2026-12-01' }).return_date).toBeNull();
  });

  it('never touches condition or breeding role', () => {
    const patch = archivePatch({ kind: 'inactive' });
    expect(patch).not.toHaveProperty('condition_status');
    expect(patch).not.toHaveProperty('breeding_role');
  });
});

describe('restorePatch (Return/Restore)', () => {
  it('reactivates and clears every archive dimension', () => {
    expect(restorePatch()).toEqual({
      status: 'Active',
      archive_kind: null,
      archive_reason: null,
      retired_scope: null,
      return_date: null,
      activity_status: 'active',
    });
  });
});

describe('deceasedPatch (final, user-driven)', () => {
  it('sets lifecycle, condition and activity together', () => {
    const patch = deceasedPatch('Illness');
    expect(patch.status).toBe('Deceased');
    expect(patch.condition_status).toBe('Deceased');
    expect(patch.death_reason).toBe('Illness');
    expect(patch.activity_status).toBe('inactive');
    expect(String(patch.death_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(patch).not.toHaveProperty('breeding_role');
  });
});

describe('archiveDraftIssue', () => {
  it('requires a reason kind', () => {
    expect(archiveDraftIssue({})).toMatch(/archive reason/i);
  });

  it('requires text for Other', () => {
    expect(archiveDraftIssue({ kind: 'other', note: '   ' })).toMatch(/type/i);
    expect(archiveDraftIssue({ kind: 'other', note: 'on hold' })).toBeNull();
  });

  it('requires a scope for Retired', () => {
    expect(archiveDraftIssue({ kind: 'retired' })).toMatch(/retired/i);
    expect(archiveDraftIssue({ kind: 'retired', retiredScope: 'fighting' })).toBeNull();
  });

  it('accepts Sold / Transfer without extras', () => {
    expect(archiveDraftIssue({ kind: 'sold' })).toBeNull();
    expect(archiveDraftIssue({ kind: 'transfer', returnDate: '2026-12-01' })).toBeNull();
  });
});

describe('mergeOptions', () => {
  const rows: RegistryOption[] = [
    { list_key: 'archive_reason', value: 'sold', label: 'Sold', user_id: null, sort_order: 1 },
    { list_key: 'archive_reason', value: 'other', label: 'Other', user_id: null, sort_order: 5 },
    { list_key: 'archive_reason', value: 'sold', label: 'Sold (custom)', user_id: 'u1', sort_order: 1 },
    { list_key: 'archive_reason', value: 'loaned', label: 'On loan', user_id: 'u1', sort_order: 9 },
    { list_key: 'archive_reason', value: 'loaned2', label: 'Hidden', user_id: 'u1', sort_order: 9, is_active: false },
    { list_key: 'death_reason', value: 'Illness', label: 'Illness', user_id: null, sort_order: 2 },
  ];

  it('keeps only the requested list and lets farm rows override templates', () => {
    const merged = mergeOptions(rows, 'archive_reason');
    const sold = merged.find((o) => o.value === 'sold');
    expect(sold?.label).toBe('Sold (custom)');
    expect(merged.some((o) => o.list_key === 'death_reason')).toBe(false);
  });

  it('drops deactivated options', () => {
    expect(mergeOptions(rows, 'archive_reason').some((o) => o.value === 'loaned2')).toBe(false);
  });

  it('keeps a legacy stored value visible even when not in the list', () => {
    const merged = mergeOptions(rows, 'archive_reason', 'Loan agreement');
    expect(merged.some((o) => o.value === 'Loan agreement')).toBe(true);
  });

  it('sorts by sort_order then label', () => {
    const merged = mergeOptions(rows, 'archive_reason');
    expect(merged.map((o) => o.value)).toEqual(['sold', 'other', 'loaned']);
  });
});

describe('archive labels', () => {
  it('falls back to built-in labels before options load', () => {
    expect(archiveKindLabel('sold')).toBe('Sold');
    expect(archiveKindLabel('retired')).toBe('Retired from fighting/circuit');
    expect(archiveKindLabel(null)).toBe('Archived');
  });

  it('uses option labels when present', () => {
    const opts = [{ list_key: 'archive_reason', value: 'sold', label: 'Sold off' }];
    expect(archiveKindLabel('sold', opts)).toBe('Sold off');
  });

  it('renders legacy free text without a kind', () => {
    expect(archiveDisplay({ archive_kind: null, archive_reason: 'Sold to breeder in Manila' })).toBe(
      'Sold to breeder in Manila',
    );
  });

  it('does not repeat the label when the note already starts with it', () => {
    expect(archiveDisplay({ archive_kind: 'sold', archive_reason: 'Sold to derby team' })).toBe(
      'Sold to derby team',
    );
    expect(archiveDisplay({ archive_kind: 'other', archive_reason: 'Injury - cannot compete' })).toBe(
      'Other — Injury - cannot compete',
    );
    expect(archiveDisplay({ archive_kind: 'sold', archive_reason: '' })).toBe('Sold');
  });

  it('labels retired scope with fallbacks', () => {
    expect(retiredScopeLabel('fighting')).toBe('Fighting only');
    expect(retiredScopeLabel('both')).toBe('Both (fighting and breeding)');
    expect(retiredScopeLabel(null)).toBe('');
  });
});
