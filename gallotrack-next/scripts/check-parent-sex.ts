import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { FowlRecord } from '../lib/types';
import { findParentSexMismatches } from '../lib/parent-sex';

/**
 * REPORT-ONLY integrity check.
 *
 * Lists every registered child whose sire is not male or whose dam is not
 * female. It never updates, fixes or deletes a row.
 */
const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'The report needs the service-role key to read every farm; no data was changed.'
  );
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data, error } = await supabase.from('fowl').select('*').order('id', { ascending: true });
  if (error || !data) {
    console.error('Could not load fowl rows:', error);
    process.exitCode = 1;
    return;
  }

  const fowls = data as FowlRecord[];
  const farms = new Map<string, FowlRecord[]>();
  for (const fowl of fowls) {
    const key = String(fowl.user_id ?? 'unknown');
    const rows = farms.get(key) ?? [];
    rows.push(fowl);
    farms.set(key, rows);
  }

  console.log('Parent role/sex integrity report (report only - no fixes applied)');
  console.log(`Scanned ${fowls.length} chicken(s) across ${farms.size} farm account(s).`);

  let total = 0;
  for (const [farmId, rows] of farms) {
    const mismatches = findParentSexMismatches(rows);
    if (mismatches.length === 0) continue;

    total += mismatches.length;
    console.log(`\nFarm ${farmId}: ${mismatches.length} mismatch(es)`);
    for (const m of mismatches) {
      console.log(
        `  - Child #${m.childId} "${m.childName}": ${m.role} #${m.parentId} ` +
          `"${m.parentName}" is ${m.parentSex}, expected ${m.expectedSex}`
      );
    }
  }

  if (total === 0) {
    console.log('\nNo parent role/sex mismatches found.');
  } else {
    console.log(`\nTotal mismatches: ${total} (reported only).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
