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

// Import lineage logic and registry roles logic
import { buildRegistryContext, roleOf, isRegisteredChild } from '../lib/registry-roles';
import { isKnownParent } from '../lib/family-tree';
import { resolveBirdCodes, formatBirdCodeForDisplay } from '../lib/bird-code';

async function main() {
  const { data: fowls, error } = await supabase.from('fowl').select('*').order('id', { ascending: true });
  if (error || !fowls) {
    console.error('Error fetching fowls:', error);
    return;
  }

  // Find user IDs
  const userIds = Array.from(new Set(fowls.map(f => f.user_id)));
  console.log(`Total users in DB: ${userIds.length}`);

  // Analyze each user
  for (const uid of userIds) {
    const userFowls = fowls.filter(f => f.user_id === uid);
    if (userFowls.length === 0) continue;

    console.log(`\n========================================================================`);
    console.log(`USER: ${uid} (Total chickens: ${userFowls.length})`);
    console.log(`========================================================================`);

    const ctx = buildRegistryContext(userFowls);
    const codes = resolveBirdCodes(userFowls);

    // 1. Lineage offspring (registered children with at least one known parent)
    const lineageOffspring = userFowls.filter(f => isKnownParent(f.sire) || isKnownParent(f.dam));
    console.log(`\n1. Lineage Offspring count (has known sire or dam): ${lineageOffspring.length}`);

    // 2. Non-Breeding tab membership
    const nonBreedingChickens = userFowls.filter(f => roleOf(f, ctx) === 'Non-Breeding');
    console.log(`2. Non-Breeding chickens count: ${nonBreedingChickens.length}`);

    // 3. Compare the two sets
    const nonBreedingIds = new Set(nonBreedingChickens.map(f => f.id));
    const lineageIds = new Set(lineageOffspring.map(f => f.id));

    const inLineageButNotNonBreeding = lineageOffspring.filter(f => !nonBreedingIds.has(f.id));
    console.log(`\n3. Chickens in Lineage Offspring but NOT in Non-Breeding (${inLineageButNotNonBreeding.length}):`);
    for (const f of inLineageButNotNonBreeding) {
      const role = roleOf(f, ctx);
      console.log(` - [ID ${f.id}] "${f.name}" | Gender: ${f.gender} | Status: ${f.status} | Role: "${role}" | breeding_role: "${f.breeding_role}" | registry_role: "${f.registry_role}" | Sire: "${f.sire}", Dam: "${f.dam}" | Code: "${codes.get(String(f.id)) || f.bird_code}"`);
    }

    const inNonBreedingButNotLineage = nonBreedingChickens.filter(f => !lineageIds.has(f.id));
    console.log(`\n4. Chickens in Non-Breeding but NOT in Lineage Offspring (${inNonBreedingButNotLineage.length}):`);
    for (const f of inNonBreedingButNotLineage) {
      console.log(` - [ID ${f.id}] "${f.name}" | Sire: "${f.sire}", Dam: "${f.dam}"`);
    }

    // Role breakdown
    const rolesCount: Record<string, number> = {};
    for (const f of userFowls) {
      const r = roleOf(f, ctx);
      rolesCount[r] = (rolesCount[r] || 0) + 1;
    }
    console.log('\nRoles count breakdown:', rolesCount);

    // Sires & Dams in this user's registry
    const sires = userFowls.filter(f => roleOf(f, ctx) === 'Breeding Male');
    const dams = userFowls.filter(f => roleOf(f, ctx) === 'Breeding Female');
    console.log(`\nBreeding Males (${sires.length}):`, sires.map(s => `[ID ${s.id}] ${s.name} (code: ${codes.get(String(s.id)) || s.bird_code})`).join(', '));
    console.log(`Breeding Females (${dams.length}):`, dams.map(d => `[ID ${d.id}] ${d.name} (code: ${codes.get(String(d.id)) || d.bird_code})`).join(', '));
  }
}

main().catch(console.error);
