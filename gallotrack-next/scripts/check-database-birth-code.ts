import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: rows, error } = await supabase
    .from('fowl')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching fowls:', error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No rows found in fowl table.');
    return;
  }

  const columns = Object.keys(rows[0]);
  console.log('=== FOWL TABLE COLUMNS ===');
  console.log(columns.join(', '));

  console.log('\n=== CODE COLUMNS CHECK ===');
  const hasChickenCode = columns.includes('chicken_code');
  const hasBirdCode = columns.includes('bird_code');
  console.log('Has chicken_code column:', hasChickenCode);
  console.log('Has bird_code column:', hasBirdCode);

  const totalChickens = rows.length;
  const withChickenCode = rows.filter(r => r.chicken_code && String(r.chicken_code).trim() !== '').length;
  const withBirdCode = rows.filter(r => r.bird_code && String(r.bird_code).trim() !== '').length;

  console.log(`Total chickens: ${totalChickens}`);
  if (hasChickenCode) console.log(`Chickens with non-empty chicken_code: ${withChickenCode}`);
  if (hasBirdCode) console.log(`Chickens with non-empty bird_code: ${withBirdCode}`);

  console.log('\n=== 10 SAMPLE ROWS ===');
  const sample = rows.slice(0, 10);
  sample.forEach((r, idx) => {
    console.log(`[${idx + 1}] ID: ${r.id} | Name: "${r.name}" | Gender: "${r.gender}" | Sire: "${r.sire}" | Dam: "${r.dam}" | Birthdate: "${r.birthdate}" | bird_code: "${r.bird_code}" | chicken_code: "${r.chicken_code}" | wing_band: "${r.wing_band}" | legacy_id/tag: "${r.tag_number || r.legacy_number || ''}"`);
  });

  // Check the 8 Lemon offspring specifically
  console.log('\n=== EIGHT LEMON OFFSPRING IN DATABASE ===');
  const ironLemonOffspring = rows.filter(r => (r.sire || '').trim().toLowerCase() === 'iron lemon');
  console.log(`Found ${ironLemonOffspring.length} offspring with Sire = "Iron Lemon":`);
  ironLemonOffspring.forEach(r => {
    console.log(` - ID: ${r.id} | Name: "${r.name}" | Dam: "${r.dam}" | Birthdate: "${r.birthdate}" | bird_code: "${r.bird_code}" | chicken_code: "${r.chicken_code}" | created_at: "${r.created_at}"`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
