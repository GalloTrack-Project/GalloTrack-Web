import { supabase } from '@/lib/registry';
import type { FowlRecord, StatusHistoryEntry } from '@/lib/types';
import {
  archivePatch,
  conditionPatch,
  deceasedPatch,
  restorePatch,
  rolePatch,
} from '@/lib/lifecycle';

export async function fetchFowls(): Promise<FowlRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('fowl')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) {
    console.error('Failed to fetch chickens:', error);
    return [];
  }
  return data || [];
}

export async function insertFowl(payload: Record<string, unknown>): Promise<{ error?: string; id?: number }> {
  const { data, error } = await supabase.from('fowl').insert([payload]).select('id').single();
  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function updateFowl(id: number, payload: Record<string, unknown>): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').update(payload).eq('id', id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteFowl(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('fowl').delete().eq('id', id);
  if (error) return { error: error.message };
  return {};
}

// ── lifecycle writes ────────────────────────────────────────────────────────
// Every lifecycle change goes through changeLifecycle so the fowl row and its
// fowl_status_history audit rows stay in step. History is append-only (RLS has
// no owner UPDATE/DELETE policies).

type HistoryEntry = {
  field: string;
  newValue: string;
  reason?: string | null;
  note?: string | null;
};

async function changeLifecycle(
  id: number,
  patch: Record<string, unknown>,
  history: HistoryEntry[],
): Promise<{ error?: string; historyError?: string }> {
  const { data: prev, error: readError } = await supabase
    .from('fowl')
    .select('*')
    .eq('id', id)
    .single();
  if (readError) return { error: readError.message };

  const { error } = await supabase.from('fowl').update(patch).eq('id', id);
  if (error) return { error: error.message };

  if (history.length) {
    const { data: { user } } = await supabase.auth.getUser();
    const rows = history.map((h) => ({
      fowl_id: id,
      field: h.field,
      old_value: h.field in prev ? ((prev as Record<string, unknown>)[h.field] as string) ?? null : null,
      new_value: h.newValue,
      reason: h.reason ?? null,
      note: h.note ?? null,
      changed_by: user?.id ?? null,
    }));
    const { error: historyError } = await supabase.from('fowl_status_history').insert(rows);
    if (historyError) {
      console.error('Failed to write status history:', historyError.message);
      return { historyError: historyError.message };
    }
  }
  return {};
}

/** Status history for one chicken, newest first. */
export async function fetchStatusHistory(fowlId: number): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from('fowl_status_history')
    .select('*')
    .eq('fowl_id', fowlId)
    .order('changed_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch status history:', error.message);
    return [];
  }
  return data || [];
}

export type ArchiveOptions = {
  /** Structured reason: sold | transfer | inactive | retired | other. */
  kind?: string;
  /** Label for the kind (used as the stored reason when no note is given). */
  label?: string;
  /** Optional free-text note; required for kind 'other'. */
  note?: string;
  /** Required for kind 'retired': fighting | breeding | both. */
  retiredScope?: string | null;
  /** Optional for kind 'transfer': expected/actual return date. */
  returnDate?: string | null;
};

export async function archiveFowl(
  id: number,
  opts: ArchiveOptions = {},
): Promise<{ error?: string; historyError?: string }> {
  const note = (opts.note || '').trim();
  const reason = note || opts.label || opts.kind || 'Archived';
  const history: HistoryEntry[] = [
    { field: 'status', newValue: 'Archived', reason },
    { field: 'activity_status', newValue: 'inactive', reason },
  ];
  if (opts.kind) {
    history.push({ field: 'archive_kind', newValue: opts.kind, reason });
    if (opts.kind === 'retired' && opts.retiredScope) {
      history.push({ field: 'retired_scope', newValue: opts.retiredScope, reason });
    }
  }
  return changeLifecycle(id, archivePatch({ ...opts, note }), history);
}

export async function restoreFowl(id: number): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(
    id,
    restorePatch(),
    [
      { field: 'status', newValue: 'Active', reason: 'Restored' },
      { field: 'activity_status', newValue: 'active', reason: 'Restored' },
    ],
  );
}

export async function markFowlDeceased(
  id: number,
  reason: string,
): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(
    id,
    deceasedPatch(reason),
    [
      { field: 'status', newValue: 'Deceased', reason },
      { field: 'condition_status', newValue: 'Deceased', reason },
      { field: 'activity_status', newValue: 'inactive', reason },
    ],
  );
}

/** Manual injury/condition change. Never touches role, status or activity. */
export async function setConditionStatus(
  id: number,
  value: string,
): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(id, conditionPatch(value), [
    { field: 'condition_status', newValue: value },
  ]);
}

/** Manual breeding/material role decision. Never derived from injury. */
export async function setBreedingRole(
  id: number,
  role: 'none' | 'breeder' | 'material',
): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(id, rolePatch(role), [
    { field: 'breeding_role', newValue: role },
  ]);
}

export async function setSireMaterial(
  id: number,
): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(
    id,
    { status: 'Sire Material', breeding_role: 'material', archive_reason: null, archive_kind: null, retired_scope: null, return_date: null },
    [
      { field: 'status', newValue: 'Sire Material' },
      { field: 'breeding_role', newValue: 'material' },
    ],
  );
}

export async function setFowlActive(
  id: number,
): Promise<{ error?: string; historyError?: string }> {
  return changeLifecycle(
    id,
    restorePatch(),
    [
      { field: 'status', newValue: 'Active' },
      { field: 'activity_status', newValue: 'active' },
    ],
  );
}

export async function uploadFowlImage(file: File): Promise<{ url?: string; error?: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `fowl/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('fowl-images')
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('fowl-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

export async function getNextIdentifier(
  role: 'sire' | 'dam' | 'offspring',
  sireCode?: string | null,
  damCode?: string | null
): Promise<{ code?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  try {
    const { data, error } = await supabase.rpc('get_next_fowl_identifier', {
      p_user_id: user.id,
      p_role: role,
      p_sire_code: sireCode ?? null,
      p_dam_code: damCode ?? null,
    });
    if (error) return { error: error.message };
    return { code: String(data) };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

