import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FALLBACK = {
  system_name: 'GalloTrack',
  system_status: 'Operational',
  maintenance_message: '',
  allow_registrations: true,
  auto_approve_users: true,
  auto_calculate_age: true,
  public_fowl_data: false,
  default_user_role: 'owner',
  default_strain: 'Sweater',
  default_match_type: '',
  default_arena: '',
  weight_unit: 'kg',
  height_unit: 'cm',
  milestone_alerts: true,
  overdue_alerts: true,
  cloud_logs: true,
  event_alerts: true,
  theme: 'dark',
};

export async function GET() {
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'app')
      .maybeSingle();

    if (error) {
      return NextResponse.json(FALLBACK);
    }

    const v = (data?.value || {}) as Record<string, unknown>;

    return NextResponse.json({
      system_name: (v.system_name as string) || FALLBACK.system_name,
      system_status: (v.system_status as string) || FALLBACK.system_status,
      maintenance_message: (v.maintenance_message as string) || '',
      allow_registrations: v.allow_registrations !== false,
      auto_approve_users: v.auto_approve_users !== false,
      auto_calculate_age: v.auto_calculate_age !== false,
      public_fowl_data: v.public_fowl_data === true,
      default_user_role: (v.default_user_role as string) || FALLBACK.default_user_role,
      default_strain: (v.default_strain as string) || FALLBACK.default_strain,
      default_match_type: (v.default_match_type as string) || '',
      default_arena: (v.default_arena as string) || '',
      weight_unit: (v.weight_unit as string) === 'lbs' ? 'lbs' : 'kg',
      height_unit: (v.height_unit as string) === 'inches' ? 'inches' : 'cm',
      milestone_alerts: v.milestone_alerts !== false,
      overdue_alerts: v.overdue_alerts !== false,
      cloud_logs: v.cloud_logs !== false,
      event_alerts: v.event_alerts !== false,
      theme: (v.theme as string) || FALLBACK.theme,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
