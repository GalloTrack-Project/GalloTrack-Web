import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await client
      .from('system_settings')
      .select('value')
      .eq('key', 'app')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const value = (data?.value || {}) as Record<string, unknown>;

    return NextResponse.json({
      system_name: value.system_name || 'GalloTrack',
      system_status: value.system_status || 'Operational',
      maintenance_message: value.maintenance_message || '',
      allow_registrations: value.allow_registrations !== false,
      auto_calculate_age: value.auto_calculate_age !== false,
    });
  } catch {
    return NextResponse.json({
      system_name: 'GalloTrack',
      system_status: 'Operational',
      maintenance_message: '',
      allow_registrations: true,
      auto_calculate_age: true,
    });
  }
}
