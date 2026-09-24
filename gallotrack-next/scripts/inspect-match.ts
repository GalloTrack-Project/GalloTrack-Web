import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, SERVICE);

async function main() {
  const { data, error } = await admin
    .from('match')
    .select('id, user_id, status, post_fight_condition, video_url, cock_count, age_category, event_type, derby_match_number')
    .limit(1);
  console.log('match sample select:', error ? error.message : JSON.stringify(data?.[0] ?? null, null, 2));

  const { data: f } = await admin.from('fowl').select('id, user_id').limit(1);
  console.log('fowl user_id sample:', JSON.stringify(f?.[0] ?? null));

  const { data: mo } = await admin.from('match_options').select('*').limit(1);
  console.log('match_options sample:', JSON.stringify(mo?.[0] ?? null, null, 2));

  const { data: users } = await admin.auth.admin.listUsers();
  console.log('users:', users?.users.map(u => ({ id: u.id, email: u.email })));

  // OpenAPI schema for match columns
  const res = await fetch(`${URL_}/rest/v1/`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const spec = await res.json() as { definitions?: Record<string, { properties?: Record<string, { type?: string; format?: string }> }> };
  const matchDef = spec.definitions?.match;
  if (matchDef?.properties) {
    const props = matchDef.properties;
    console.log('match.user_id type:', JSON.stringify(props.user_id));
    console.log('match columns:', Object.keys(props).join(', '));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
