import type { FowlRecord, RegistryOption } from './types';

/**
 * Pure lifecycle helpers for the M1 registry work.
 *
 * Rules encoded here (from user feedback):
 * - condition (injury), breeding role, active/inactive and final (deceased)
 *   are four SEPARATE concepts; nothing in this file converts one into another
 *   except the explicitly allowed Deceased record, which is a user action.
 * - patch builders are the single place lifecycle writes are shaped, so tests
 *   can assert an injury change never touches the breeding role.
 */

export type ArchiveKind = 'sold' | 'transfer' | 'inactive' | 'retired' | 'other';

export const ARCHIVE_KIND_FALLBACK_LABELS: Record<ArchiveKind, string> = {
  sold: 'Sold',
  transfer: 'Transfer / Borrowed',
  inactive: 'Inactive',
  retired: 'Retired from fighting/circuit',
  other: 'Other',
};

export const CONDITION_FALLBACK_OPTIONS = [
  'Fit / Recovered',
  'Injured',
  'Severely Injured',
  'Critically Injured',
  'Deceased',
] as const;

export const RETIRED_SCOPE_FALLBACK_LABELS: Record<string, string> = {
  fighting: 'Fighting only',
  breeding: 'Breeding only',
  both: 'Both (fighting and breeding)',
};

export const BREEDING_ROLE_LABELS: Record<string, string> = {
  none: 'Not a breeder',
  breeder: 'Breeder',
  material: 'Material',
};

/** Merge template + farm rows of one list: farm row wins, inactive dropped, sorted. */
export function mergeOptions(
  rows: RegistryOption[] | undefined,
  listKey: string,
  currentValue?: string | null,
): RegistryOption[] {
  const byValue = new Map<string, RegistryOption>();
  for (const row of rows ?? []) {
    if (row.list_key !== listKey) continue;
    if (row.is_active === false) continue;
    const existing = byValue.get(row.value);
    if (!existing || (row.user_id && !existing.user_id)) byValue.set(row.value, row);
  }
  if (currentValue && !byValue.has(currentValue)) {
    byValue.set(currentValue, {
      list_key: listKey,
      value: currentValue,
      label: currentValue,
      sort_order: 999,
    });
  }
  return [...byValue.values()].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.label.localeCompare(b.label),
  );
}

/** Label for an archive kind, falling back to built-in text before options load. */
export function archiveKindLabel(kind?: string | null, options?: RegistryOption[]): string {
  if (!kind) return 'Archived';
  const hit = (options ?? []).find((o) => o.list_key === 'archive_reason' && o.value === kind);
  return hit?.label ?? ARCHIVE_KIND_FALLBACK_LABELS[kind as ArchiveKind] ?? kind;
}

/**
 * Archive display line: legacy rows (no kind) show their free text; new rows
 * show `Label — note` but never repeat the label the note already starts with.
 */
export function archiveDisplay(
  fowl: Pick<FowlRecord, 'archive_kind' | 'archive_reason'>,
  options?: RegistryOption[],
): string {
  const note = (fowl.archive_reason || '').trim();
  if (!fowl.archive_kind) return note || 'Archived';
  const label = archiveKindLabel(fowl.archive_kind, options);
  if (!note) return label;
  if (note.toLowerCase().startsWith(label.toLowerCase())) return note;
  if (note.toUpperCase() === fowl.archive_kind.toUpperCase()) return label;
  return `${label} — ${note}`;
}

export function conditionLabel(value?: string | null): string {
  return (value || '').trim() || 'Fit / Recovered';
}

export function breedingRoleLabel(role?: string | null): string {
  return BREEDING_ROLE_LABELS[role || 'none'] ?? 'Not a breeder';
}

export function retiredScopeLabel(scope?: string | null, options?: RegistryOption[]): string {
  if (!scope) return '';
  const hit = (options ?? []).find((o) => o.list_key === 'retired_scope' && o.value === scope);
  return hit?.label ?? RETIRED_SCOPE_FALLBACK_LABELS[scope] ?? scope;
}

// ── patch builders (the only shapes lifecycle writes take) ──────────────────

/** Injury/condition change: touches condition_status and NOTHING else. */
export function conditionPatch(value: string): Record<string, unknown> {
  return { condition_status: value };
}

/** Breeding/material role change: manual action only, never derived. */
export function rolePatch(role: 'none' | 'breeder' | 'material'): Record<string, unknown> {
  return { breeding_role: role };
}

export type ArchiveDraft = {
  kind?: string;
  note?: string;
  retiredScope?: string | null;
  returnDate?: string | null;
};

/** Archive write: lifecycle goes inactive; a reason kind is mandatory. */
export function archivePatch(draft: ArchiveDraft): Record<string, unknown> {
  const note = (draft.note || '').trim();
  return {
    status: 'Archived',
    archive_kind: draft.kind ?? null,
    archive_reason: note,
    retired_scope: draft.kind === 'retired' ? draft.retiredScope || null : null,
    return_date: draft.kind === 'transfer' ? draft.returnDate || null : null,
    activity_status: 'inactive',
  };
}

/** Return/restore: clears every archive dimension and reactivates. */
export function restorePatch(): Record<string, unknown> {
  return {
    status: 'Active',
    archive_kind: null,
    archive_reason: null,
    retired_scope: null,
    return_date: null,
    activity_status: 'active',
  };
}

/** Final record: user-driven, sets condition + lifecycle together (atomic by app). */
export function deceasedPatch(reason: string): Record<string, unknown> {
  return {
    status: 'Deceased',
    condition_status: 'Deceased',
    death_reason: reason,
    death_date: new Date().toISOString().split('T')[0],
    activity_status: 'inactive',
  };
}

/** Validation for the archive modal. Returns an error message or null. */
export function archiveDraftIssue(draft: ArchiveDraft): string | null {
  if (!draft.kind) return 'Select an archive reason.';
  if (draft.kind === 'other' && !(draft.note || '').trim()) return 'Type the archive reason.';
  if (draft.kind === 'retired' && !draft.retiredScope) {
    return 'Select what this chicken is retired from.';
  }
  return null;
}
