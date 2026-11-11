import type { DeclaredBreedShare } from '@/lib/types';

export const FOWL_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

const FOWL_DRAFT_PREFIX = 'gallotrack:fowl-draft';

export type FowlDraftKind = 'create' | 'edit';

export type DraftRestoreResult = {
  restored: boolean;
  photoSelected: boolean;
};

export type CreateDraftFields = {
  newName: string;
  newBreed: string;
  newGender: string;
  newColor: string;
  newColorCategory: string;
  newGrowthStage: string;
  newBehaviorTrait: string;
  newEyeVariant: string;
  newBirthdate: string;
  sireName: string;
  damName: string;
  sirePct: number | string;
  damPct: number | string;
  weight: string;
  height: string;
  newLegColor: string;
  age: string;
  birdCode: string;
  wingBand: string;
  newDeclaredComposition: DeclaredBreedShare[] | null;
  strainQuery: string;
  selectedStrains: string[];
  legColorQuery: string;
};

export type EditDraftFields = {
  editName: string;
  editBreed: string;
  editGender: string;
  editColorCategory: string;
  editColor: string;
  editBehaviorTrait: string;
  editEyeVariant: string;
  editAge: string;
  editBirthdate: string;
  editGrowthStage: string;
  editWeight: string;
  editHeight: string;
  editLegColor: string;
  editSire: string;
  editDam: string;
  editSirePct: number | string;
  editDamPct: number | string;
  editBirdCode: string;
  editWingBand: string;
  editDeclaredComposition: DeclaredBreedShare[] | null;
};

type FowlDraftBase = {
  version: 1;
  userId: string;
  savedAt: number;
  photoSelected: boolean;
};

export type CreateFowlDraft = FowlDraftBase & {
  kind: 'create';
  fields: CreateDraftFields;
};

export type EditFowlDraft = FowlDraftBase & {
  kind: 'edit';
  fowlId: number | string;
  fields: EditDraftFields;
};

export type FowlDraft = CreateFowlDraft | EditFowlDraft;

export type FowlDraftInput =
  | Omit<CreateFowlDraft, 'version' | 'savedAt'>
  | Omit<EditFowlDraft, 'version' | 'savedAt'>;

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function fowlDraftKey(
  userId: string,
  kind: FowlDraftKind,
  fowlId?: number | string,
): string {
  const scope = kind === 'edit' ? `edit:${fowlId ?? ''}` : 'create';
  return `${FOWL_DRAFT_PREFIX}:${userId}:${scope}`;
}

export function saveFowlDraft(input: FowlDraftInput): boolean {
  const storage = getSessionStorage();
  if (!storage || !input.userId) return false;

  const draft: FowlDraft = {
    ...input,
    version: 1,
    savedAt: Date.now(),
  } as FowlDraft;

  try {
    storage.setItem(fowlDraftKey(draft.userId, draft.kind, draft.kind === 'edit' ? draft.fowlId : undefined), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function isDraftForScope(
  value: unknown,
  userId: string,
  kind: FowlDraftKind,
  fowlId?: number | string,
): value is FowlDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<FowlDraft>;
  if (draft.version !== 1) return false;
  if (draft.userId !== userId) return false;
  if (draft.kind !== kind) return false;
  if (typeof draft.savedAt !== 'number' || !Number.isFinite(draft.savedAt)) return false;
  if (typeof draft.photoSelected !== 'boolean') return false;
  if (!draft.fields || typeof draft.fields !== 'object') return false;
  if (draft.kind === 'edit') {
    if (fowlId === undefined || fowlId === null) return false;
    if (String(draft.fowlId) !== String(fowlId)) return false;
  }
  return true;
}

export function loadFowlDraft(
  userId: string,
  kind: FowlDraftKind,
  fowlId?: number | string,
): FowlDraft | null {
  const storage = getSessionStorage();
  if (!storage || !userId) return null;

  const key = fowlDraftKey(userId, kind, fowlId);
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraftForScope(parsed, userId, kind, fowlId)) {
      storage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > FOWL_DRAFT_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function clearFowlDraft(
  userId: string | null | undefined,
  kind: FowlDraftKind,
  fowlId?: number | string,
): void {
  const storage = getSessionStorage();
  if (!storage || !userId) return;
  try {
    storage.removeItem(fowlDraftKey(userId, kind, fowlId));
  } catch {
    /* ignore unavailable storage */
  }
}
