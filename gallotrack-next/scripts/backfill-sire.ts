import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envPath = new URL('../.env.local', import.meta.url).pathname.replace(/^\//, '');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Backfill: any Active male with a Severely Injured match -> Sire Material
  const { data: crit } = await supabase
    .from('match')
    .select('entry_name, user_id, post_fight_condition')
    .ilike('post_fight_condition', '%Severely%');

  if (!crit?.length) {
    console.log('No critical matches found.');
    return;
  }

  const names = [...new Set(crit.map((m) => m.entry_name))];
  console.log('Critical-match entries:', names);

  const { data: fowls } = await supabase
    .from('fowl')
    .select('id, name, status, user_id')
    .in('name', names);

  console.log('Matching fowls:', JSON.stringify(fowls, null, 2));

  for (const f of fowls || []) {
    if (f.status === 'Sire Material') {
      console.log(`skip ${f.name} (already Sire Material)`);
      continue;
    }
    const { error } = await supabase
      .from('fowl')
      .update({ status: 'Sire Material' })
      .eq('id', f.id);
    if (error) {
      console.error(`FAIL ${f.name}: ${error.message}`);
    } else {
      console.log(`OK ${f.name}: Active/${f.status} -> Sire Material`);
    }
  }

  const { data: sires } = await supabase
    .from('fowl')
    .select('id, name, status, user_id')
    .eq('status', 'Sire Material');
  console.log('Sire Material count now:', sires?.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
