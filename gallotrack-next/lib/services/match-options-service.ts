import { supabase } from '@/lib/registry';

export interface MatchOption {
  id: number;
  match_id: number | null;
  user_id: string;
  option_number: number;
  fowl_entry: string;
  partner_entry: string | null;
  bet_type: string;
  target_number: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerSuggestion {
  user_id: string;
  full_name: string;
  farm_name: string;
  fowl_entry: string;
  option_number: number;
  bet_type: string;
  target_number: number;
}

export async function findMatchingPartners(
  targetNumber: number,
  betType: string,
  currentUserId: string
): Promise<PartnerSuggestion[]> {
  const { data, error } = await supabase
    .from('match_options')
    .select(`
      user_id,
      fowl_entry,
      option_number,
      bet_type,
      target_number,
      profiles!inner(full_name, farm_name)
    `)
    .eq('target_number', targetNumber)
    .eq('bet_type', betType)
    .eq('status', 'pending')
    .neq('user_id', currentUserId)
    .limit(10);

  if (error || !data) {
    console.error('Failed to find partners:', error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => {
    const profile = row.profiles as { full_name: string; farm_name: string } | null;
    return {
      user_id: row.user_id as string,
      full_name: profile?.full_name || 'Unknown',
      farm_name: profile?.farm_name || 'Unknown Farm',
      fowl_entry: row.fowl_entry as string,
      option_number: row.option_number as number,
      bet_type: row.bet_type as string,
      target_number: row.target_number as number,
    };
  });
}

export async function insertMatchOption(payload: {
  match_id?: number;
  option_number: number;
  fowl_entry: string;
  partner_entry?: string;
  bet_type: string;
  target_number: number;
  status?: string;
}): Promise<{ data?: MatchOption; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('match_options')
    .insert([{
      user_id: user.id,
      match_id: payload.match_id || null,
      option_number: payload.option_number,
      fowl_entry: payload.fowl_entry,
      partner_entry: payload.partner_entry || null,
      bet_type: payload.bet_type,
      target_number: payload.target_number,
      status: payload.status || 'pending',
    }])
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as MatchOption };
}

export async function updateMatchOptionStatus(
  optionId: number,
  status: string,
  partnerEntry?: string
): Promise<{ error?: string }> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (partnerEntry !== undefined) update.partner_entry = partnerEntry;

  const { error } = await supabase
    .from('match_options')
    .update(update)
    .eq('id', optionId);

  if (error) return { error: error.message };
  return {};
}

export async function fetchMatchOptions(matchId: number): Promise<MatchOption[]> {
  const { data, error } = await supabase
    .from('match_options')
    .select('*')
    .eq('match_id', matchId)
    .order('option_number', { ascending: true });

  if (error) {
    console.error('Failed to fetch match options:', error);
    return [];
  }
  return data || [];
}
