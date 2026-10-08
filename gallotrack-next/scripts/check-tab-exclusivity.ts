import * as fs from 'fs';
import { resolve } from 'path';

for (const envFile of ['.env.local', '.env']) {
  const p = resolve(__dirname, '..', envFile);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || '').replace(/(^['"]|['"]$)/g, '');
      }
    }
  }
}

import { createClient } from '@supabase/supabase-js';
import {
  registryTabLists,
  assertTabExclusivity,
  countRuleCheck,
  roleOf,
  isActiveStatus,
  buildRegistryContext,
} from '../lib/registry-roles';
import type { FowlRecord } from '../lib/types';
import * as fs from 'fs';

async function main() {
  console.log('=== GalloTrack Tab Membership Exclusivity Check ===\n');

  let fowls: FowlRecord[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.from('fowl').select('*').order('id', { ascending: true });
    if (!error && data && data.length > 0) {
      fowls = data as FowlRecord[];
      console.log(`Fetched ${fowls.length} chickens from live database.`);
    }
  }

  // Fallback to dump if network/auth unavailable
  if (fowls.length === 0) {
    const dumpPath = resolve(__dirname, 'db-fowls-dump.json');
    if (fs.existsSync(dumpPath)) {
      fowls = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
      console.log(`Loaded ${fowls.length} chickens from ${dumpPath}.`);
    } else {
      console.error('ERROR: No database connection and no db-fowls-dump.json found.');
      process.exit(1);
    }
  }

  // Filter to primary test user or evaluate all active birds
  const primaryUserId = '9cc100d9-c855-41d3-a6a8-3c10fd65221c';
  const userFowls = fowls.filter((f) => !f.user_id || f.user_id === primaryUserId);

  console.log(`Evaluating user partition (${userFowls.length} chickens)...\n`);

  // Run exclusivity check
  try {
    const lists = registryTabLists(userFowls);
    assertTabExclusivity(lists.males, lists.females, lists.nonBreeding);

    const check = countRuleCheck(userFowls);
    console.log('Rule check results:');
    console.log(`- Active fowls: ${check.activeCount}`);
    console.log(`- Breeding Males: ${lists.males.length}`);
    console.log(`- Breeding Females: ${lists.females.length}`);
    console.log(`- Non-Breeding: ${lists.nonBreeding.length}`);
    console.log(`- Tab Sum: ${check.registryTabSum}`);
    console.log(`- Registry Rule OK: ${check.registryRuleOk}`);
    console.log(`- Overlapping IDs: ${check.overlappingChickenIds.length}`);

    if (!check.registryRuleOk || check.overlappingChickenIds.length > 0) {
      console.error('\nFAILURE: Tab exclusivity check failed! Overlap detected.');
      process.exit(1);
    }

    // Specific assertions required by prompt
    const maleIds = new Set(lists.males.map((f) => f.id));
    const femaleIds = new Set(lists.females.map((f) => f.id));
    const nbIds = new Set(lists.nonBreeding.map((f) => f.id));

    // Iron Lemon (ID 30)
    const ironLemon = userFowls.find((f) => f.name === 'Iron Lemon');
    if (ironLemon) {
      if (!maleIds.has(ironLemon.id) || femaleIds.has(ironLemon.id) || nbIds.has(ironLemon.id)) {
        console.error(`FAILURE: Iron Lemon is not in Breeding Male only! Found in: Male=${maleIds.has(ironLemon.id)}, Female=${femaleIds.has(ironLemon.id)}, NB=${nbIds.has(ironLemon.id)}`);
        process.exit(1);
      }
      console.log(`- Verified: Iron Lemon (${ironLemon.name}, id=${ironLemon.id}) is in Breeding Male ONLY.`);
    }

    // Lemon Storm (ID 42)
    const lemonStorm = userFowls.find((f) => f.name === 'Lemon Storm');
    if (lemonStorm) {
      if (!nbIds.has(lemonStorm.id) || maleIds.has(lemonStorm.id) || femaleIds.has(lemonStorm.id)) {
        console.error(`FAILURE: Lemon Storm is not in Non-Breeding only! Found in: Male=${maleIds.has(lemonStorm.id)}, Female=${femaleIds.has(lemonStorm.id)}, NB=${nbIds.has(lemonStorm.id)}`);
        process.exit(1);
      }
      console.log(`- Verified: Lemon Storm (${lemonStorm.name}, id=${lemonStorm.id}) is in Non-Breeding ONLY.`);
    }

    // Check for chickens with both breeder identifier and birth code
    const dualIdentBirds = userFowls.filter(
      (f) =>
        f.birth_code &&
        (f.chicken_code || f.bird_code) &&
        f.birth_code !== (f.chicken_code || f.bird_code),
    );
    console.log(`- Chickens with both breeder identifier and birth code: ${dualIdentBirds.length}`);
    dualIdentBirds.forEach((b) => {
      console.log(`  * [${b.id}] ${b.name}: breeder code=${b.chicken_code || b.bird_code}, birth code=${b.birth_code}`);
    });

    console.log('\nSUCCESS: All exclusivity constraints satisfied with 0 overlap!\n');
  } catch (err) {
    console.error('\nFAILURE during exclusivity check:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
