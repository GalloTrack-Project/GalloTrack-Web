import { supabase } from '@/lib/registry';
import type { BreedingPairRecord, SafetyIncidentRecord } from '@/lib/types';

export interface FetchResult<T> {
  data: T;
  error?: string;
}

export interface SaveResult<T> {
  record?: T;
  error?: string;
}

type DbError = { code?: string; message?: string } | null;

const errorMessage = (error: DbError): string => error?.message || 'Unknown database error';

/** Friendly text for the unique constraints that guard pairing history. */
const violationMessage = (error: DbError): string | null => {
  if (error?.code !== '23505') return null;
  const msg = error.message || '';
  if (msg.includes('pairing_code')) return 'That pairing code is already used — this sire x dam pair already has a record.';
  if (msg.includes('active_sire') || msg.includes('active_dam')) return 'One of these chickens already has an Active partner — end that pairing first.';
  if (msg.includes('couple')) return 'This exact pairing is already recorded.';
  return null;
};

// ── Breeding pairings ────────────────────────────────────────────────────────

export async function fetchBreedingPairings(): Promise<FetchResult<BreedingPairRecord[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const { data, error } = await supabase
    .from('breeding_pairings')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) return { data: [], error: errorMessage(error) };
  return { data: (data as BreedingPairRecord[]) || [] };
}

export async function insertBreedingPairing(
  payload: Partial<BreedingPairRecord>
): Promise<SaveResult<BreedingPairRecord>> {
  const { data, error } = await supabase
    .from('breeding_pairings')
    .insert([payload])
    .select('*')
    .single();

  if (error) return { error: violationMessage(error) || errorMessage(error) };
  return { record: data as BreedingPairRecord };
}

export async function updateBreedingPairingOutcome(
  id: number,
  outcome: BreedingPairRecord['outcome']
): Promise<SaveResult<BreedingPairRecord>> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('breeding_pairings')
    .update({
      outcome,
      ended_date: outcome === 'Active' ? null : today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { error: violationMessage(error) || errorMessage(error) };
  return { record: data as BreedingPairRecord };
}

export async function deleteBreedingPairing(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('breeding_pairings').delete().eq('id', id);
  if (error) return { error: errorMessage(error) };
  return {};
}

// ── Safety incidents ─────────────────────────────────────────────────────────

export async function fetchSafetyIncidents(): Promise<FetchResult<SafetyIncidentRecord[]>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const { data, error } = await supabase
    .from('safety_incidents')
    .select('*')
    .eq('user_id', user.id)
    .order('id', { ascending: false });

  if (error) return { data: [], error: errorMessage(error) };
  return { data: (data as SafetyIncidentRecord[]) || [] };
}

export async function insertSafetyIncident(
  payload: Partial<SafetyIncidentRecord>
): Promise<SaveResult<SafetyIncidentRecord>> {
  const { data, error } = await supabase
    .from('safety_incidents')
    .insert([payload])
    .select('*')
    .single();

  if (error) return { error: errorMessage(error) };
  return { record: data as SafetyIncidentRecord };
}

export async function deleteSafetyIncident(id: number): Promise<{ error?: string }> {
  const { error } = await supabase.from('safety_incidents').delete().eq('id', id);
  if (error) return { error: errorMessage(error) };
  return {};
}
