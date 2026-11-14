import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

/**
 * Run only after the milestone notifications migration is applied and reviewed.
 * Creates two disposable users, verifies own-row visibility and read-only
 * owner access, then removes both users and all dependent rows.
 */
const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const stamp = Date.now();
const password = 'NotificationRls!2026';

async function makeUser(label: string) {
  const email = `notification-rls-${label}-${stamp}@gallotrack.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'Notification', last_name: label },
  });
  if (error || !data.user) throw new Error(`create ${label}: ${error?.message}`);
  return { id: data.user.id, email };
}

async function main() {
  const { error: tableError } = await admin.from('notifications').select('id').limit(1);
  if (tableError) {
    throw new Error(
      `notifications table is not available (${tableError.message}). Apply the migration first.`,
    );
  }

  const a = await makeUser('a');
  const b = await makeUser('b');
  try {
    const { data: fowlA, error: fowlAError } = await admin
      .from('fowl')
      .insert({ user_id: a.id, name: 'RLS Notification A', gender: 'Rooster', status: 'Active' })
      .select('id')
      .single();
    if (fowlAError || !fowlA) throw new Error(fowlAError?.message);
    const { data: fowlB, error: fowlBError } = await admin
      .from('fowl')
      .insert({ user_id: b.id, name: 'RLS Notification B', gender: 'Hen', status: 'Active' })
      .select('id')
      .single();
    if (fowlBError || !fowlB) throw new Error(fowlBError?.message);

    const { error: insertError } = await admin.from('notifications').insert([
      {
        user_id: a.id,
        fowl_id: fowlA.id,
        type: 'stage_changed',
        stage: 'Stag',
        title: 'A',
        body: 'A',
        due_date: '2026-11-13',
      },
      {
        user_id: b.id,
        fowl_id: fowlB.id,
        type: 'stage_changed',
        stage: 'Pullet',
        title: 'B',
        body: 'B',
        due_date: '2026-11-13',
      },
    ]);
    if (insertError) throw new Error(`service insert: ${insertError.message}`);

    const { error: signInError } = await anon.auth.signInWithPassword({
      email: a.email,
      password,
    });
    if (signInError) throw new Error(`sign in A: ${signInError.message}`);

    const { data: visible, error: selectError } = await anon
      .from('notifications')
      .select('id,user_id,fowl_id');
    if (selectError) throw new Error(`owner select: ${selectError.message}`);
    console.log('owner visible rows:', visible?.length ?? 0);
    console.log('owner sees only own row:', (visible ?? []).every((row) => row.user_id === a.id));

    const { data: ownUpdate, error: ownUpdateError } = await anon
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', a.id)
      .select('id');
    console.log('own read_at update:', ownUpdateError ? `FAIL ${ownUpdateError.message}` : `${ownUpdate?.length ?? 0} row(s)`);

    const { data: crossUpdate, error: crossUpdateError } = await anon
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', b.id)
      .select('id');
    console.log(
      'cross-user update blocked:',
      crossUpdateError ? `BLOCKED (${crossUpdateError.code})` : `visible ${crossUpdate?.length ?? 0} row(s)`,
    );

    const { error: insertAsOwnerError } = await anon.from('notifications').insert({
      user_id: a.id,
      fowl_id: fowlA.id,
      type: 'stage_changed',
      stage: 'Cock',
      title: 'owner insert',
      body: 'owner insert',
      due_date: '2026-11-13',
    });
    console.log('owner insert blocked:', insertAsOwnerError ? `BLOCKED (${insertAsOwnerError.code})` : 'FAIL - insert allowed');

    const { error: titleUpdateError } = await anon
      .from('notifications')
      .update({ title: 'tampered' })
      .eq('user_id', a.id);
    console.log('owner title update blocked:', titleUpdateError ? `BLOCKED (${titleUpdateError.code})` : 'FAIL - title update allowed');
  } finally {
    await anon.auth.signOut();
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
    console.log('removed smoke users');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
