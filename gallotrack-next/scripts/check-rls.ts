import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: policies, error } = await admin
    .rpc('exec_sql', { query: "select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where tablename in ('match','match_options','fowl') order by tablename, policyname" })
    .single();
  if (error) {
    console.error('rpc failed:', error.message);
    const { data: pol2, error: e2 } = await admin.from('pg_policies').select('*').in('tablename', ['match', 'match_options', 'fowl']);
    console.error('fallback:', e2?.message);
    console.log(JSON.stringify(pol2, null, 2));
    return;
  }
  console.log(JSON.stringify(policies, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
