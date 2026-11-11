import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FOWL_DRAFT_TTL_MS,
  clearFowlDraft,
  fowlDraftKey,
  loadFowlDraft,
  saveFowlDraft,
} from '@/lib/fowl-draft';

const createFields = {
  newName: 'Draft Bird',
  newBreed: 'Kelso',
  newGender: 'Rooster',
  newColor: 'Red',
  newColorCategory: 'Red',
  newGrowthStage: 'Cock',
  newBehaviorTrait: 'Calm',
  newEyeVariant: 'Standard Eye',
  newBirthdate: '2024-01-01',
  sireName: 'Sire A',
  damName: 'Dam B',
  sirePct: 50,
  damPct: 50,
  weight: '2.0',
  height: '45',
  newLegColor: 'Yellow',
  age: '12',
  birdCode: '1',
  wingBand: 'WB-1',
  newDeclaredComposition: null,
  strainQuery: 'Kel',
  selectedStrains: ['Kelso'],
  legColorQuery: 'Yel',
};

const editFields = {
  editName: 'Iron Clad',
  editBreed: 'Hatch',
  editGender: 'Rooster',
  editColorCategory: 'Red',
  editColor: 'Dark Red',
  editBehaviorTrait: 'Calm',
  editEyeVariant: 'Red',
  editAge: '12',
  editBirthdate: '2024-01-01',
  editGrowthStage: 'Cock',
  editWeight: '2.1',
  editHeight: '44',
  editLegColor: 'Green / Slate',
  editSire: 'Foundation Stock',
  editDam: 'Foundation Stock',
  editSirePct: 100,
  editDamPct: 100,
  editBirdCode: '2',
  editWingBand: 'WB-2',
  editDeclaredComposition: null,
};

describe('fowl draft storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds per-user, per-form keys', () => {
    expect(fowlDraftKey('user-1', 'create')).toBe('gallotrack:fowl-draft:user-1:create');
    expect(fowlDraftKey('user-1', 'edit', 42)).toBe('gallotrack:fowl-draft:user-1:edit:42');
    expect(fowlDraftKey('user-2', 'edit', 42)).not.toBe(fowlDraftKey('user-1', 'edit', 42));
  });

  it('round-trips create fields and the photo-selected flag without a file', () => {
    vi.setSystemTime(new Date('2026-11-11T08:00:00Z'));
    const saved = saveFowlDraft({
      kind: 'create',
      userId: 'user-1',
      photoSelected: true,
      fields: createFields,
    });

    expect(saved).toBe(true);
    const raw = sessionStorage.getItem(fowlDraftKey('user-1', 'create')) ?? '';
    expect(raw).not.toContain('.png');
    expect(raw).not.toContain('data:image');

    const draft = loadFowlDraft('user-1', 'create');
    expect(draft?.kind).toBe('create');
    expect(draft?.photoSelected).toBe(true);
    if (draft?.kind === 'create') {
      expect(draft.fields).toEqual(createFields);
    }
  });

  it('keeps create and edit drafts for the same user separate', () => {
    saveFowlDraft({
      kind: 'create',
      userId: 'user-1',
      photoSelected: false,
      fields: createFields,
    });
    saveFowlDraft({
      kind: 'edit',
      userId: 'user-1',
      fowlId: 42,
      photoSelected: false,
      fields: editFields,
    });

    expect(loadFowlDraft('user-1', 'create')?.kind).toBe('create');
    expect(loadFowlDraft('user-1', 'edit', 42)?.kind).toBe('edit');
    expect(loadFowlDraft('user-1', 'edit', 43)).toBeNull();
  });

  it('never leaks drafts across users', () => {
    saveFowlDraft({
      kind: 'edit',
      userId: 'user-1',
      fowlId: 42,
      photoSelected: false,
      fields: editFields,
    });

    expect(loadFowlDraft('user-2', 'edit', 42)).toBeNull();
    expect(loadFowlDraft('user-1', 'edit', 42)?.kind).toBe('edit');
  });

  it('ignores and removes drafts older than 24 hours', () => {
    vi.setSystemTime(new Date('2026-11-10T08:00:00Z'));
    saveFowlDraft({
      kind: 'create',
      userId: 'user-1',
      photoSelected: false,
      fields: createFields,
    });

    vi.setSystemTime(new Date(Date.parse('2026-11-10T08:00:00Z') + FOWL_DRAFT_TTL_MS + 1));
    expect(loadFowlDraft('user-1', 'create')).toBeNull();
    expect(sessionStorage.getItem(fowlDraftKey('user-1', 'create'))).toBeNull();
  });

  it('removes corrupted payloads instead of restoring them', () => {
    sessionStorage.setItem(fowlDraftKey('user-1', 'create'), '{not json');
    expect(loadFowlDraft('user-1', 'create')).toBeNull();
    expect(sessionStorage.getItem(fowlDraftKey('user-1', 'create'))).toBeNull();
  });

  it('clears only the requested draft', () => {
    saveFowlDraft({
      kind: 'create',
      userId: 'user-1',
      photoSelected: false,
      fields: createFields,
    });
    saveFowlDraft({
      kind: 'edit',
      userId: 'user-1',
      fowlId: 42,
      photoSelected: false,
      fields: editFields,
    });

    clearFowlDraft('user-1', 'create');
    expect(loadFowlDraft('user-1', 'create')).toBeNull();
    expect(loadFowlDraft('user-1', 'edit', 42)?.kind).toBe('edit');
  });

  it('does not persist without a user id', () => {
    expect(saveFowlDraft({
      kind: 'create',
      userId: '',
      photoSelected: false,
      fields: createFields,
    })).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });
});
