import { supabase } from '@/lib/registry';
import type { FowlRecord, StatusHistoryEntry } from '@/lib/types';
import {
  archivePatch,
  conditionPatch,
  deceasedPatch,
  restorePatch,
  rolePatch,
} from '@/lib/lifecycle';
import { storagePathFromUrl } from '@/lib/media-format';
import { filterAllowedColumns } from '@/lib/schema-contract';

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
  const fowls: FowlRecord[] = data || [];

  // Reconcile birth_code from append-only fowl_status_history without modifying DB schema
  try {
    const { data: historyData } = await supabase
      .from('fowl_status_history')
      .select('fowl_id, new_value')
      .eq('field', 'birth_code');

    if (historyData && historyData.length > 0) {
      const birthCodeMap = new Map<number, string>();
      for (const h of historyData) {
        if (h.fowl_id && h.new_value) {
          birthCodeMap.set(h.fowl_id, h.new_value);
        }
      }
      for (const f of fowls) {
        const recordedBirthCode = birthCodeMap.get(f.id);
        if (recordedBirthCode) {
          f.birth_code = recordedBirthCode;
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch birth_code status history:', err);
  }

  return fowls;
}

const isMissingCol = (err?: { message?: string; code?: string }, col?: string): boolean => {
  if (!err?.message) return false;
  const msg = err.message.toLowerCase();
  if (msg.includes('unique') || msg.includes('duplicate')) return false;
  if (err.code === '42703' || msg.includes('does not exist') || msg.includes('undefined column')) {
    return true;
  }
  if (col) {
    return err.message.includes(`column "${col}"`) || err.message.includes(`column fowl.${col}`);
  }
  return err.message.includes('column ') || err.message.includes('column "');
};

/**
 * Detects whether a database error was caused by a unique constraint violation on the bird_code.
 * Specifically checks for Postgres error code 23505 and index fowl_user_bird_code_key.
 */
export function isBirdCodeUniqueViolation(err?: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'string') {
    const lower = err.toLowerCase();
    return (
      lower.includes('fowl_user_bird_code_key') ||
      lower.includes('fowl_user_chicken_code_key') ||
      (lower.includes('23505') && (lower.includes('bird_code') || lower.includes('chicken_code'))) ||
      ((lower.includes('unique') || lower.includes('duplicate key')) &&
        (lower.includes('bird_code') || lower.includes('chicken_code')))
    );
  }
  const e = err as { code?: string; message?: string; details?: string };
  const code = String(e.code || '');
  const msg = String(e.message || '').toLowerCase();
  const details = String(e.details || '').toLowerCase();

  if (code === '23505') {
    if (
      details.includes('fowl_user_bird_code_key') ||
      msg.includes('fowl_user_bird_code_key') ||
      details.includes('fowl_user_chicken_code_key') ||
      msg.includes('fowl_user_chicken_code_key') ||
      details.includes('bird_code') ||
      msg.includes('bird_code') ||
      (!details && !msg)
    ) {
      return true;
    }
  }

  return (
    details.includes('fowl_user_bird_code_key') ||
    msg.includes('fowl_user_bird_code_key') ||
    details.includes('fowl_user_chicken_code_key') ||
    msg.includes('fowl_user_chicken_code_key') ||
    ((msg.includes('unique') || msg.includes('duplicate key')) &&
      (msg.includes('bird_code') || details.includes('bird_code') || msg.includes('chicken_code')))
  );
}

export const isChickenCodeUniqueViolation = isBirdCodeUniqueViolation;

export const DB_UPDATE_NEEDED_MESSAGE = 'This feature needs a database update. Please contact the administrator.';

export async function insertFowl(payload: Record<string, unknown>): Promise<{ error?: string; id?: number }> {
  const working = { ...payload };
  if (!working.bird_code && working.chicken_code) {
    working.bird_code = working.chicken_code;
  }
  const cleanPayload = filterAllowedColumns('fowl', working);

  const res = await supabase.from('fowl').insert([cleanPayload]).select('id').single();
  if (res.error) {
    if (isMissingCol(res.error)) {
      console.error('[fowl-service] Missing column in database:', res.error);
      return { error: DB_UPDATE_NEEDED_MESSAGE };
    }
    return { error: res.error.message };
  }
  return { id: res.data?.id };
}

export async function updateFowl(id: number, payload: Record<string, unknown>): Promise<{ error?: string }> {
  const working = { ...payload };
  if (!working.bird_code && working.chicken_code) {
    working.bird_code = working.chicken_code;
  }
  const cleanPayload = filterAllowedColumns('fowl', working);

  const res = await supabase.from('fowl').update(cleanPayload).eq('id', id);
  if (res.error) {
    if (isMissingCol(res.error)) {
      console.error('[fowl-service] Missing column in database:', res.error);
      return { error: DB_UPDATE_NEEDED_MESSAGE };
    }
    return { error: res.error.message };
  }
  return {};
}

/**
 * UNUSED IN STANDARD UI:
 * deleteFowl performs a hard DELETE from the fowl table.
 * In standard farm workflows, chickens are only archived or marked deceased (soft lifecycle).
 * Only referenced by handlePermanentDelete (unreachable in current UI) and admin account deletion.
 * Do not wire to active inventory UI buttons without explicit approval.
 */
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

  const working = { ...patch };
  if (!working.bird_code && working.chicken_code) {
    working.bird_code = working.chicken_code;
  }
  const cleanPatch = filterAllowedColumns('fowl', working);

  const { error } = await supabase.from('fowl').update(cleanPatch).eq('id', id);
  if (error) {
    if (isMissingCol(error)) {
      console.error('[fowl-service] Missing column in database:', error);
      return { error: DB_UPDATE_NEEDED_MESSAGE };
    }
    return { error: error.message };
  }

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
    { breeding_role: 'material', archive_reason: null, archive_kind: null, retired_scope: null, return_date: null },
    [
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

/**
 * Promote an offspring chicken to a breeder (Breeding Male or Breeding Female).
 * Preserves its birth code as birth_code, assigns its breeder code,
 * sets its registry_role, and logs the change into fowl_status_history.
 */
export async function promoteToBreeder(
  id: number,
  opts: {
    targetRole: 'Breeding Male' | 'Breeding Female';
    breederCode: string;
    birthCode: string;
  },
): Promise<{ error?: string; historyError?: string }> {
  const patch: Record<string, unknown> = {
    registry_role: opts.targetRole,
    bird_code: opts.breederCode,
    breeding_role: 'breeder',
    status: 'Active',
    activity_status: 'active',
  };
  const history: HistoryEntry[] = [
    { field: 'registry_role', newValue: opts.targetRole, reason: 'promote_to_breeder', note: `Promoted to ${opts.targetRole} (${opts.breederCode})` },
    { field: 'bird_code', newValue: opts.breederCode, reason: 'promote_to_breeder' },
    { field: 'birth_code', newValue: opts.birthCode, reason: 'promote_to_breeder' },
  ];
  return changeLifecycle(id, patch, history);
}

export async function uploadFowlImage(file: File): Promise<{ url?: string; path?: string; error?: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  // Safe namespacing: write new uploads under owner prefix so purge-media cleanly clears them
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  const filePath = user ? `${user.id}/fowl/${fileName}` : `fowl/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('fowl-images')
    .upload(filePath, file);

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('fowl-images').getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

export async function deleteFowlImageFile(pathOrUrl: string): Promise<void> {
  try {
    let filePath = pathOrUrl;
    if (filePath.startsWith('http')) {
      const parsed = storagePathFromUrl(filePath);
      if (parsed) filePath = parsed.path;
    }
    if (filePath) {
      await supabase.storage.from('fowl-images').remove([filePath]);
    }
  } catch (err) {
    console.warn('Best-effort cleanup of orphan fowl image failed:', err);
  }
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

