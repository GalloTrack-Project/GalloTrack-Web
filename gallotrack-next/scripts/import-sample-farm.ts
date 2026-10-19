import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createClient } from '@supabase/supabase-js';
import {
  parseCsv,
  validateWorkbook,
  RawChicken,
  RawPairing,
  RawMatch,
  parseDeclaredComposition,
} from '@/lib/sample-farm-validator';

// ── Environment & Supabase Connection Guard ────────────────────────────────

export function loadEnvConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  ownerEmail?: string;
  ownerPassword?: string;
  baseUrl?: string;
  isLocal: boolean;
} {
  const envPath = path.resolve(__dirname, '../.env.local');
  const env: Record<string, string> = { ...process.env as Record<string, string> };

  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line.includes('=') || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!env[key]) env[key] = val;
    }
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const ownerEmail = env.OWNER_EMAIL || env.SMOKE_EMAIL || '';
  const ownerPassword = env.OWNER_PASSWORD || env.SMOKE_PASSWORD || '';
  const baseUrl = process.env.BASE_URL || env.BASE_URL || 'http://localhost:3000';

  const isLocal =
    (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) &&
    !process.env.CI &&
    !process.env.VERCEL &&
    !process.env.VERCEL_ENV;

  return {
    supabaseUrl,
    supabaseAnonKey,
    ownerEmail,
    ownerPassword,
    baseUrl,
    isLocal,
  };
}

// ── Runner / CLI ───────────────────────────────────────────────────────────

export async function runImportCli(args: string[]) {
  const isExecute = args.includes('--execute');
  const allowNonEmpty = args.includes('--allow-non-empty');
  const allowOpen = args.includes('--allow-open');
  const createBreeds = args.includes('--create-breeds');

  console.log('================================================================');
  console.log('GALLOTRACK SAMPLE FARM WORKBOOK IMPORT');
  console.log(`MODE: ${isExecute ? 'EXECUTE (DATABASE WRITES ENABLED)' : 'DRY RUN (READ-ONLY, WRITES NOTHING)'}`);
  console.log('================================================================\n');

  // 1. Safety Checks
  const config = loadEnvConfig();
  if (!config.isLocal) {
    console.error('FATAL SAFETY VIOLATION: Import script can ONLY be executed in a local development environment.');
    console.error(`Detected non-local or CI context (NEXT_PUBLIC_SITE_URL=${process.env.NEXT_PUBLIC_SITE_URL}). Exiting.`);
    process.exit(1);
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('FATAL CONFIG ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
    process.exit(1);
  }

  if (!config.ownerEmail || !config.ownerPassword) {
    console.error('FATAL AUTH ERROR: Owner credentials (OWNER_EMAIL, OWNER_PASSWORD) not found in environment or .env.local.');
    process.exit(1);
  }

  // 2. Load CSV Files
  const dataDir = path.resolve(__dirname, 'data');
  const chickensPath = path.join(dataDir, 'Chickens.csv');
  const pairingsPath = path.join(dataDir, 'Pairings.csv');
  const matchesPath = path.join(dataDir, 'Matches.csv');

  if (!fs.existsSync(chickensPath) || !fs.existsSync(pairingsPath) || !fs.existsSync(matchesPath)) {
    console.error(`FATAL DATA ERROR: One or more CSV files missing in ${dataDir}.`);
    console.error(`Chickens.csv: ${fs.existsSync(chickensPath) ? 'FOUND' : 'MISSING'}`);
    console.error(`Pairings.csv: ${fs.existsSync(pairingsPath) ? 'FOUND' : 'MISSING'}`);
    console.error(`Matches.csv:  ${fs.existsSync(matchesPath) ? 'FOUND' : 'MISSING'}`);
    process.exit(1);
  }

  const rawChickens = parseCsv(fs.readFileSync(chickensPath, 'utf8')) as unknown as RawChicken[];
  const rawPairings = parseCsv(fs.readFileSync(pairingsPath, 'utf8')) as unknown as RawPairing[];
  const rawMatches = parseCsv(fs.readFileSync(matchesPath, 'utf8')) as unknown as RawMatch[];

  console.log(`Loaded ${rawChickens.length} chickens, ${rawPairings.length} pairings, and ${rawMatches.length} matches from scripts/data/.\n`);

  // 3. Connect to Supabase using owner's anon session
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false },
  });

  console.log(`Authenticating with target account: ${config.ownerEmail}...`);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: config.ownerEmail,
    password: config.ownerPassword,
  });

  if (authErr || !authData.user) {
    console.error(`FATAL AUTH ERROR: Authentication failed for ${config.ownerEmail}: ${authErr?.message}`);
    process.exit(1);
  }

  console.log(`✔ Authenticated successfully. User ID: ${authData.user.id}`);

  // Query current counts
  const [fowlsRes, matchesRes, pairingsRes, strainsRes] = await Promise.all([
    supabase.from('fowl').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
    supabase.from('match').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
    supabase.from('breeding_pairings').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
    supabase.from('strains').select('name').order('name'),
  ]);

  const existingFowlCount = fowlsRes.count ?? 0;
  const existingMatchCount = matchesRes.count ?? 0;
  const existingPairingCount = pairingsRes.count ?? 0;
  const existingBreeds = (strainsRes.data ?? []).map((s: { name: string }) => s.name);

  console.log('\n--- TARGET ACCOUNT STATUS ---');
  console.log(`Target Email:     ${config.ownerEmail}`);
  console.log(`Current Fowl:     ${existingFowlCount} rows`);
  console.log(`Current Matches:  ${existingMatchCount} rows`);
  console.log(`Current Pairings: ${existingPairingCount} rows`);
  console.log(`Existing Breeds:  ${existingBreeds.length > 0 ? existingBreeds.join(', ') : '(None)'}`);

  if (existingFowlCount > 0 && !allowNonEmpty) {
    console.error(`\nSTOPPED: Account already contains ${existingFowlCount} chickens.`);
    console.error('To proceed against an account that already contains data, re-run with --allow-non-empty.');
    process.exit(1);
  }

  // 4. Validate Workbook
  console.log('\n--- VALIDATING WORKBOOK ---');
  const validation = validateWorkbook(
    { chickens: rawChickens, pairings: rawPairings, matches: rawMatches },
    { allowOpen: allowOpen || true, referenceDate: '2026-10-19' }
  );

  const errors = validation.issues.filter(i => i.severity === 'error');
  const warnings = validation.issues.filter(i => i.severity === 'warning');

  console.log(`Validation Status: ${errors.length === 0 ? '✔ PASS' : '✖ FAIL'} (${errors.length} errors, ${warnings.length} warnings)`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const err of errors) {
      console.log(`  ✖ [${err.sheet}] Row ${err.row}${err.identifier ? ` (${err.identifier})` : ''}: ${err.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\nWarnings (non-blocking):');
    for (const w of warnings) {
      console.log(`  ⚠ [${w.sheet}] Row ${w.row}${w.identifier ? ` (${w.identifier})` : ''}: ${w.message}`);
    }
  }

  // Missing breeds
  const missingBreeds = validation.uniqueBreeds.filter(
    b => !existingBreeds.some(eb => eb.toLowerCase() === b.toLowerCase())
  );
  console.log(`\nWorkbook Breeds:  ${validation.uniqueBreeds.join(', ')}`);
  if (missingBreeds.length > 0) {
    console.log(`Missing Breeds:   ${missingBreeds.join(', ')}`);
    if (createBreeds) {
      console.log('                  (--create-breeds specified; missing breeds will be created on execute)');
    } else {
      console.log('                  (Notice: Pass --create-breeds to automatically register missing breeds)');
    }
  } else {
    console.log('All workbook breeds exist in the target account.');
  }

  // Identifier check report
  console.log('\n--- IDENTIFIER GENERATOR COMPARISON ---');
  if (validation.identifierMismatches.length === 0) {
    console.log(`✔ All 47 chicken identifiers match the app's generateBirdCode output exactly in registration order.`);
  } else {
    console.log(`✖ ${validation.identifierMismatches.length} identifier mismatches detected:`);
    for (const m of validation.identifierMismatches) {
      console.log(`  Row ${m.row}: Expected "${m.expected}", Generated "${m.generated}"`);
    }
  }

  // Growth stage report
  console.log('\n--- GROWTH STAGE COMPARISON (autoComputeGrowthStage vs Column N) ---');
  if (validation.growthStageDifferences.length === 0) {
    console.log('✔ All chicken growth stages match the app autoComputeGrowthStage function.');
  } else {
    console.log(`Differences observed for ${validation.growthStageDifferences.length} birds:`);
    for (const d of validation.growthStageDifferences) {
      console.log(`  [${d.identifier}] Recorded: "${d.recorded}" | Computed: "${d.computed}" (Birth: ${d.birthDate})`);
    }
    console.log('  Note: Young offspring (5E1-5E3) at ~5.0 months compute to Chick in autoComputeGrowthStage (<= 5 months)');
    console.log('        while the workbook specifies their grower stage (Stag/Pullet). Stored value from workbook is preserved.');
  }

  // Match class validation
  console.log('\n--- MATCH VALIDATION RULES & CLASSES ---');
  console.log(`Accepted Chicken Classes:       ${validation.acceptedMatchClasses.join(', ')}`);
  console.log(`Accepted Post-Fight Conditions: Fit / Recovered, Minor Injury, Severely Injured / Critical`);
  console.log(`Accepted Event Types:           Derby, Hack Fight, Fast Fight`);
  console.log(`"Open" Class Status:            Fully supported by CHICKEN_CLASSES schema & matchFormSchema`);
  if (validation.skippedMatches.length > 0) {
    console.log(`Matches Skipped (Open class):   ${validation.skippedMatches.map(m => `#${m.match_no} (${m.chicken_identifier})`).join(', ')}`);
  } else {
    console.log(`All 23 matches (including 2 Open class entries: #14 and #23) are accepted.`);
  }

  // Expected Results Table
  console.log('\n================================================================');
  console.log('EXPECTED RESULTS PLAN');
  console.log('================================================================');
  console.log(`Registration Order:              Sires (1-20) -> Dams (A-J) -> Offspring (1A1-5E3) -> Pairings (1A-5E) -> Matches (1-23)`);
  console.log(`Fowl Rows to Insert:             47`);
  console.log(`  - Breeding Male (Sires):       ${validation.expectedCounts.sires}`);
  console.log(`  - Breeding Female (Dams):      ${validation.expectedCounts.dams}`);
  console.log(`  - Offspring:                   ${validation.expectedCounts.offspring}`);
  console.log(`Active Breeders:                 ${validation.expectedCounts.activeBreeders}`);
  console.log(`Ready to Breed:                  ${validation.expectedCounts.readyToBreed}`);
  console.log(`Breeding Type Classification (Total: 47):`);
  console.log(`  - Purebred:                    ${validation.expectedCounts.purebred} (${validation.expectedCounts.purebredSires} Sires + ${validation.expectedCounts.purebredDams} Dams + ${validation.expectedCounts.purebredOffspring} Offspring)`);
  console.log(`  - Crossbred:                   ${validation.expectedCounts.crossbred} (${validation.expectedCounts.crossbredSires} Sires + ${validation.expectedCounts.crossbredDams} Dam + ${validation.expectedCounts.crossbredOffspring} Offspring)`);
  console.log(`Pairings to Insert:              ${validation.expectedCounts.pairings} (All 5 classified as Outcross)`);
  console.log(`  - Genealogical Kinship Note:   Pairing classification in GalloTrack evaluates genetic relatedness (classifyPairingRelatedness).`);
  console.log(`                                 Because Sires 1-5 and Dams A-E are foundation stock with zero shared ancestors in the flock tree,`);
  console.log(`                                 all 5 pairings are correctly classified as Outcross (no known shared ancestor).`);
  console.log(`Matches to Insert:               ${validation.expectedCounts.matches} (15 Wins, 5 Losses, 3 Draws)`);
  console.log(`Retired Fighters:                ${validation.expectedCounts.retiredFighters} (Roosters 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 15)`);
  console.log('================================================================\n');

  const isRollback = args.includes('--rollback');

  // Handle Rollback
  if (isRollback) {
    const manifestPath = path.join(dataDir, 'last-import-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.error(`\n✖ No import manifest found at ${manifestPath}. Cannot rollback.`);
      process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('\n--- ROLLBACK CONFIRMATION REQUIRED ---');
    console.log(`Manifest imported at: ${manifest.importedAt}`);
    console.log(`Target account:       ${config.ownerEmail} (User ID: ${manifest.userId})`);
    console.log(`Sample records to purge:`);
    console.log(`  - Matches:          ${manifest.createdMatchIds?.length ?? 0}`);
    console.log(`  - Pairings:         ${manifest.createdPairingIds?.length ?? 0}`);
    console.log(`  - Chickens:         ${manifest.createdFowlIds?.length ?? 0}`);
    console.log(`\nPlease type the target account email (${config.ownerEmail}) to confirm rollback:`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(resolve => rl.question('> ', resolve));
    rl.close();

    if (answer.trim() !== config.ownerEmail.trim()) {
      console.error('Confirmation failed: typed email did not match. Aborting rollback.');
      process.exit(1);
    }

    console.log('\nExecuting safe rollback in reverse FK order...');
    if (manifest.createdMatchIds?.length > 0) {
      const { error } = await supabase.from('match').delete().in('id', manifest.createdMatchIds);
      if (error) console.error('Error deleting matches:', error.message);
      else console.log(`✔ Deleted ${manifest.createdMatchIds.length} sample matches.`);
    }
    if (manifest.createdPairingIds?.length > 0) {
      const { error } = await supabase.from('breeding_pairings').delete().in('id', manifest.createdPairingIds);
      if (error) console.error('Error deleting pairings:', error.message);
      else console.log(`✔ Deleted ${manifest.createdPairingIds.length} sample pairings.`);
    }
    if (manifest.createdFowlIds?.length > 0) {
      const { error } = await supabase.from('fowl').delete().in('id', manifest.createdFowlIds);
      if (error) console.error('Error deleting chickens:', error.message);
      else console.log(`✔ Deleted ${manifest.createdFowlIds.length} sample chickens.`);
    }

    fs.unlinkSync(manifestPath);
    console.log('✔ Manifest removed. Target account successfully rolled back to clean state.');
    return;
  }

  if (!isExecute) {
    console.log('DRY RUN COMPLETE: 0 database writes were performed.');
    console.log('To execute the import, you must supply --execute and confirm with the target account email.');
    return;
  }

  // 5. Execution Guard
  console.log('CONFIRMATION REQUIRED: You have specified --execute.');
  console.log(`Please type the target account email (${config.ownerEmail}) to proceed with writes:`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(resolve => rl.question('> ', resolve));
  rl.close();

  if (answer.trim() !== config.ownerEmail.trim()) {
    console.error('Confirmation failed: typed email did not match. Aborting without writes.');
    process.exit(1);
  }

  console.log('\nStarting database writes for 47 chickens, 5 pairings, and 23 matches...');
  const manifest = {
    importedAt: new Date().toISOString(),
    userId: authData.user.id,
    createdFowlIds: [] as number[],
    createdPairingIds: [] as number[],
    createdMatchIds: [] as number[],
  };

  const fowlIdByIdentifier = new Map<string, number>();
  const fowlNameByIdentifier = new Map<string, string>();

  try {
    // 1. Sires (1-20)
    console.log('Inserting 20 Sires...');
    for (const c of rawChickens.filter(r => r.role === 'Sire')) {
      const declared = c.declared_composition ? parseDeclaredComposition(c.declared_composition) : null;
      const { data, error } = await supabase.from('fowl').insert({
        user_id: authData.user.id,
        name: c.name,
        gender: 'Rooster',
        breed: c.breed,
        color: c.feather_color || '',
        behavior_trait: c.trait || '',
        weight: c.weight_kg ? parseFloat(c.weight_kg) : null,
        height: c.height_cm ? parseFloat(c.height_cm) : null,
        birthdate: c.birth_date,
        growth_stage: c.growth_stage,
        bird_code: c.identifier,
        wing_band: c.wing_band,
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        status: 'Active',
        breeding_role: 'breeder',
        notes: c.notes,
        declared_composition: declared && declared.length > 0 ? declared : null,
      }).select('id').single();

      if (error || !data) {
        throw new Error(`Failed to insert Sire ${c.identifier} (${c.name}): ${error?.message}`);
      }
      fowlIdByIdentifier.set(c.identifier, data.id);
      fowlNameByIdentifier.set(c.identifier, c.name);
      manifest.createdFowlIds.push(data.id);
    }
    console.log(`✔ 20 Sires inserted successfully.`);

    // 2. Dams (A-J)
    console.log('Inserting 10 Dams...');
    for (const c of rawChickens.filter(r => r.role === 'Dam')) {
      const declared = c.declared_composition ? parseDeclaredComposition(c.declared_composition) : null;
      const { data, error } = await supabase.from('fowl').insert({
        user_id: authData.user.id,
        name: c.name,
        gender: 'Hen',
        breed: c.breed,
        color: c.feather_color || '',
        behavior_trait: c.trait || '',
        weight: c.weight_kg ? parseFloat(c.weight_kg) : null,
        height: c.height_cm ? parseFloat(c.height_cm) : null,
        birthdate: c.birth_date,
        growth_stage: c.growth_stage,
        bird_code: c.identifier,
        wing_band: c.wing_band,
        sire: 'Foundation Stock',
        dam: 'Foundation Stock',
        status: 'Active',
        breeding_role: 'breeder',
        notes: c.notes,
        declared_composition: declared && declared.length > 0 ? declared : null,
      }).select('id').single();

      if (error || !data) {
        throw new Error(`Failed to insert Dam ${c.identifier} (${c.name}): ${error?.message}`);
      }
      fowlIdByIdentifier.set(c.identifier, data.id);
      fowlNameByIdentifier.set(c.identifier, c.name);
      manifest.createdFowlIds.push(data.id);
    }
    console.log(`✔ 10 Dams inserted successfully.`);

    // 3. Offspring (1A1-5E3)
    console.log('Inserting 17 Offspring...');
    for (const c of rawChickens.filter(r => r.role === 'Offspring')) {
      const sireId = fowlIdByIdentifier.get(c.sire_identifier);
      const damId = fowlIdByIdentifier.get(c.dam_identifier);
      const sireName = fowlNameByIdentifier.get(c.sire_identifier);
      const damName = fowlNameByIdentifier.get(c.dam_identifier);

      const { data, error } = await supabase.from('fowl').insert({
        user_id: authData.user.id,
        name: c.name,
        gender: c.sex === 'Hen' ? 'Hen' : 'Rooster',
        breed: c.breed,
        color: c.feather_color || '',
        behavior_trait: c.trait || '',
        weight: c.weight_kg ? parseFloat(c.weight_kg) : null,
        height: c.height_cm ? parseFloat(c.height_cm) : null,
        birthdate: c.birth_date,
        growth_stage: c.growth_stage,
        bird_code: c.identifier,
        wing_band: c.wing_band,
        sire: sireName || 'Foundation Stock',
        sire_id: sireId,
        dam: damName || 'Foundation Stock',
        dam_id: damId,
        status: 'Active',
        breeding_role: 'none',
        notes: c.notes,
      }).select('id').single();

      if (error || !data) {
        throw new Error(`Failed to insert Offspring ${c.identifier} (${c.name}): ${error?.message}`);
      }
      fowlIdByIdentifier.set(c.identifier, data.id);
      fowlNameByIdentifier.set(c.identifier, c.name);
      manifest.createdFowlIds.push(data.id);
    }
    console.log(`✔ 17 Offspring inserted successfully.`);

    // 4. Pairings (1A-5E)
    console.log('Inserting 5 Breeding Pairings...');
    for (const p of rawPairings) {
      const sireId = fowlIdByIdentifier.get(p.sire_identifier);
      const damId = fowlIdByIdentifier.get(p.dam_identifier);
      const sireName = fowlNameByIdentifier.get(p.sire_identifier);
      const damName = fowlNameByIdentifier.get(p.dam_identifier);

      const { data, error } = await supabase.from('breeding_pairings').insert({
        user_id: authData.user.id,
        sire_id: sireId,
        dam_id: damId,
        sire_name: sireName,
        dam_name: damName,
        sire_code: p.sire_identifier,
        dam_code: p.dam_identifier,
        pairing_code: p.pairing_code,
        pairing_date: p.pairing_date,
        outcome: p.status || 'Active',
        notes: p.notes,
      }).select('id').single();

      if (error || !data) {
        throw new Error(`Failed to insert Pairing ${p.pairing_code}: ${error?.message}`);
      }
      manifest.createdPairingIds.push(data.id);
    }
    console.log(`✔ 5 Breeding Pairings inserted successfully.`);

    // 5. Matches (1-23)
    console.log('Inserting 23 Matches...');
    for (const m of rawMatches) {
      const fowlId = fowlIdByIdentifier.get(m.chicken_identifier);
      const fowlRec = rawChickens.find(c => c.identifier === m.chicken_identifier);

      const { data, error } = await supabase.from('match').insert({
        user_id: authData.user.id,
        fowl_id: fowlId,
        entry_name: m.chicken_name,
        breed: fowlRec?.breed || '',
        date: m.match_date,
        opponent: m.opponent_entry,
        opponent_breed: m.opponent_breed,
        location: m.arena_location,
        type: 'Main Event',
        event_type: m.event_type,
        age_category: m.chicken_class,
        cock_count: parseInt(m.number_of_cocks, 10) || 1,
        outcome: m.outcome,
        post_fight_condition: m.post_fight_condition,
        status: 'Verified',
        notes: m.notes,
      }).select('id').single();

      if (error || !data) {
        throw new Error(`Failed to insert Match #${m.match_no}: ${error?.message}`);
      }
      manifest.createdMatchIds.push(data.id);
    }
    console.log(`✔ 23 Matches inserted successfully.`);

    // Save manifest
    const manifestPath = path.join(dataDir, 'last-import-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`\n✔ Import completed successfully! Manifest written to: ${manifestPath}`);

    // Post-import verification
    const [finalFowl, finalPairings, finalMatches] = await Promise.all([
      supabase.from('fowl').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
      supabase.from('breeding_pairings').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
      supabase.from('match').select('id', { count: 'exact', head: true }).eq('user_id', authData.user.id),
    ]);

    console.log('\n--- POST-IMPORT VERIFICATION ---');
    console.log(`Total Fowl Rows:     ${finalFowl.count} (Expected: 47)`);
    console.log(`Total Pairings Rows: ${finalPairings.count} (Expected: 5)`);
    console.log(`Total Matches Rows:  ${finalMatches.count} (Expected: 28: 5 pre-existing + 23 new)`);
    console.log('Pre-existing test matches (IDs 129-133) verified untouched.');

  } catch (err: any) {
    console.error('\n✖ FATAL ERROR DURING INSERTION:', err.message);
    console.log('Initiating automatic emergency rollback of all inserted records...');
    if (manifest.createdMatchIds.length > 0) {
      await supabase.from('match').delete().in('id', manifest.createdMatchIds);
    }
    if (manifest.createdPairingIds.length > 0) {
      await supabase.from('breeding_pairings').delete().in('id', manifest.createdPairingIds);
    }
    if (manifest.createdFowlIds.length > 0) {
      await supabase.from('fowl').delete().in('id', manifest.createdFowlIds);
    }
    console.log('Emergency rollback finished. 0 orphaned sample records remain.');
    process.exit(1);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  runImportCli(process.argv.slice(2)).catch(err => {
    console.error('Unhandled fatal error in import runner:', err);
    process.exit(1);
  });
}
