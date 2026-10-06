import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  default_arena: '',
  weight_unit: 'kg',
  height_unit: 'cm',
  milestone_alerts: true,
  overdue_alerts: true,
  cloud_logs: true,
  event_alerts: true,
  theme: 'dark',
};

/**
 * Settings that shape how a *brand-new* account is provisioned. They are only
 * disclosed to callers that already hold a session: the landing, register and
 * unit-default screens never need them, and publishing them would let anyone
 * read (and target) the account model before signing in.
 */
const SESSION_ONLY_KEYS = ['default_user_role', 'auto_approve_users'] as const;

/**
 * The route is public by design — `/register`, the landing page and the unit
 * helpers all read it before anyone is signed in — so this is a least-privilege
 * split rather than a wall: anonymous callers get the display/config subset,
 * signed-in callers get the provisioning fields too.
 */
async function hasSession(): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    const { data } = await supabase.auth.getUser();
    return !!data.user;
  } catch {
    return false;
  }
}

export async function GET() {
  const signedIn = await hasSession();

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
    const payload: Record<string, unknown> = {
      system_name: (v.system_name as string) || FALLBACK.system_name,
      system_status: (v.system_status as string) || FALLBACK.system_status,
      maintenance_message: (v.maintenance_message as string) || '',
      allow_registrations: v.allow_registrations !== false,
      auto_calculate_age: v.auto_calculate_age !== false,
      public_fowl_data: v.public_fowl_data === true,
      default_strain: (v.default_strain as string) || FALLBACK.default_strain,
      default_arena: (v.default_arena as string) || '',
      weight_unit: (v.weight_unit as string) === 'lbs' ? 'lbs' : 'kg',
      height_unit: (v.height_unit as string) === 'inches' ? 'inches' : 'cm',
      milestone_alerts: v.milestone_alerts !== false,
      overdue_alerts: v.overdue_alerts !== false,
      cloud_logs: v.cloud_logs !== false,
      event_alerts: v.event_alerts !== false,
      theme: (v.theme as string) || FALLBACK.theme,
    };

    if (signedIn) {
      payload.default_user_role = (v.default_user_role as string) || FALLBACK.default_user_role;
      payload.auto_approve_users = v.auto_approve_users !== false;
    }

    // Never leak provisioning fields to an anonymous caller, whatever the row says.
    if (!signedIn) {
      for (const key of SESSION_ONLY_KEYS) delete payload[key];
    }

    return NextResponse.json(payload);
  } catch {
    const payload: Record<string, unknown> = { ...FALLBACK };
    if (!signedIn) {
      for (const key of SESSION_ONLY_KEYS) delete payload[key];
    }
    return NextResponse.json(payload);
  }
}
