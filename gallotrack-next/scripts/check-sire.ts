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
  const names = ['Iron Lemon', 'Sweater Red Storm'];

  const { data: fowls, error } = await supabase
    .from('fowl')
    .select('id, name, gender, status, user_id')
    .in('name', names);

  console.log('=== FOWL STATUS ===');
  console.log(JSON.stringify(fowls, null, 2));
  if (error) console.error('fowl err', error);

  const userId = fowls?.[0]?.user_id;
  if (userId) {
    const { data: matches } = await supabase
      .from('match')
      .select('id, date, entry_name, outcome, post_fight_condition')
      .in('entry_name', names)
      .order('date', { ascending: false });
    console.log('=== MATCHES ===');
    console.log(JSON.stringify(matches, null, 2));
  }

  const { data: sires } = await supabase
    .from('fowl')
    .select('id, name, status, user_id')
    .eq('status', 'Sire Material');
  console.log('=== SIRE MATERIAL (all) ===');
  console.log(sires?.length ?? 0, JSON.stringify(sires, null, 2));

  const { data: crit } = await supabase
    .from('match')
    .select('entry_name, outcome, post_fight_condition, date, user_id')
    .ilike('post_fight_condition', '%Severely%')
    .order('date', { ascending: false });
  console.log('=== CRITICAL MATCHES ===');
  console.log(JSON.stringify(crit, null, 2));

  const sample = fowls?.[0];
  if (sample) {
    const { error: updErr } = await supabase
      .from('fowl')
      .update({ status: 'Sire Material', updated_at: new Date().toISOString() })
      .eq('id', sample.id)
      .select();
    console.log('=== UPDATE with updated_at ===');
    console.log(updErr ? `FAILED: ${updErr.message}` : 'OK');
    if (!updErr) {
      await supabase.from('fowl').update({ status: 'Active' }).eq('id', sample.id);
      console.log('(reverted to Active)');
    }

    const { error: updErr2 } = await supabase
      .from('fowl')
      .update({ status: 'Sire Material' })
      .eq('id', sample.id)
      .select();
    console.log('=== UPDATE status only ===');
    console.log(updErr2 ? `FAILED: ${updErr2.message}` : 'OK');
    if (!updErr2) {
      await supabase.from('fowl').update({ status: sample.status }).eq('id', sample.id);
      console.log(`(reverted to ${sample.status})`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
