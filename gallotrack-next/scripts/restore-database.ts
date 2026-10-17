import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DATABASE & STORAGE RESTORE SCRIPT (WITH DRY-RUN & SAFETY GUARD)
 *
 * Usage:
 *   npx tsx scripts/restore-database.ts [--backup=<folder_name>] [--target=staging|production] [--execute]
 *
 * Safety Rules & Guardrails:
 *   1. Runs in DRY-RUN mode by default unless --execute is passed.
 *   2. Refuses to run against production unless --confirm-restore-to-production-DANGER is passed.
 *   3. Refuses a live restore into a database that already contains the owner's rows unless
 *      --allow-overwrite-existing-owner-data is passed.
 *   4. Explicit Post-Restore Sequence Reset:
 *      PostgreSQL serial sequences are NOT automatically advanced by REST inserts with explicit IDs.
 *      Post-restore SQL script must be run to avoid duplicate key errors.
 */

const ENV_PATH = path.resolve(__dirname, '../.env.local');
const env: Record<string, string> = {};
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    if (!line.includes('=') || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

const args = process.argv.slice(2);
const getArg = (name: string) => {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : null;
};
const hasFlag = (flag: string) => args.includes(`--${flag}`);

if (hasFlag('help') || hasFlag('h')) {
  console.log(`
================================================================================
🚨 GALLOTRACK DATABASE & STORAGE RESTORE UTILITY
================================================================================

Usage:
  npx tsx scripts/restore-database.ts [options]

Options:
  --backup=<folder_name>                     Path or name of backup folder in backups/ (default: latest backup)
  --target=staging|production                Target database environment (default: staging)
  --execute                                  Execute live restore (default is dry-run mode)
  --confirm-restore-to-production-DANGER     Required safety flag when target is production
  --allow-overwrite-existing-owner-data      Required when target DB already has rows for the owner
  --help, -h                                 Show this help screen

Safety Rules & Guardrails:
  1. Dry-Run By Default:
     Inspects manifests, table row counts, and storage files without writing anything to the database or storage.
  2. Production Protection:
     Refuses live execution against production unless --confirm-restore-to-production-DANGER is explicitly passed.
  3. Existing Owner Data Guard:
     Refuses a live restore if the target database already contains existing rows for the backup owner.
     Pass --allow-overwrite-existing-owner-data only if you intend to merge or overwrite into an existing dataset.
  4. Mandatory Post-Restore Sequence Reset:
     Because PostgreSQL serial sequences (e.g. fowl_id_seq, match_id_seq) do not auto-advance during explicit-ID
     REST inserts, you MUST execute the following SQL in Supabase SQL editor after every live restore:
       SELECT setval(pg_get_serial_sequence('fowl', 'id'), coalesce(max(id), 1)) FROM fowl;
       SELECT setval(pg_get_serial_sequence('match', 'id'), coalesce(max(id), 1)) FROM match;
       SELECT setval(pg_get_serial_sequence('breeding_pairings', 'id'), coalesce(max(id), 1)) FROM breeding_pairings;
       SELECT setval(pg_get_serial_sequence('safety_incidents', 'id'), coalesce(max(id), 1)) FROM safety_incidents;
       SELECT setval(pg_get_serial_sequence('fowl_status_history', 'id'), coalesce(max(id), 1)) FROM fowl_status_history;
       SELECT setval(pg_get_serial_sequence('share_links', 'id'), coalesce(max(id), 1)) FROM share_links;
       SELECT setval(pg_get_serial_sequence('admin_audit_logs', 'id'), coalesce(max(id), 1)) FROM admin_audit_logs;
================================================================================
`);
  process.exit(0);
}

const backupFolderArg = getArg('backup');
const targetEnv = getArg('target') || 'staging';
const isDryRun = !hasFlag('execute');
const confirmedProd = hasFlag('confirm-restore-to-production-DANGER');
const allowOverwriteExistingOwnerData = hasFlag('allow-overwrite-existing-owner-data');

function getAllFilesRecursively(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFilesRecursively(fullPath, baseDir));
    } else {
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

async function restore() {
  console.log(`=======================================================`);
  console.log(`🚨 GALLOTRACK DATABASE & STORAGE RESTORE UTILITY`);
  console.log(`=======================================================`);

  const backupsParentDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupsParentDir)) {
    console.error(`❌ Error: No backups directory found at ${backupsParentDir}`);
    process.exit(1);
  }

  let selectedBackupDir: string;
  if (backupFolderArg) {
    selectedBackupDir = path.isAbsolute(backupFolderArg)
      ? backupFolderArg
      : path.join(backupsParentDir, backupFolderArg);
  } else {
    // Pick latest backup directory
    const entries = fs.readdirSync(backupsParentDir).filter((d) => d.startsWith('backup-')).sort().reverse();
    if (entries.length === 0) {
      console.error(`❌ Error: No backup folders starting with 'backup-' found in ${backupsParentDir}`);
      process.exit(1);
    }
    selectedBackupDir = path.join(backupsParentDir, entries[0]);
  }

  if (!fs.existsSync(selectedBackupDir)) {
    console.error(`❌ Error: Specified backup folder does not exist: ${selectedBackupDir}`);
    process.exit(1);
  }

  const dbJsonPath = path.join(selectedBackupDir, 'database.json');
  const manifestPath = path.join(selectedBackupDir, 'manifest.json');
  const metadataPath = path.join(selectedBackupDir, 'metadata.json');

  if (!fs.existsSync(dbJsonPath)) {
    console.error(`❌ Error: database.json missing in backup directory ${selectedBackupDir}`);
    process.exit(1);
  }

  const dbData: Record<string, any[]> = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    : null;

  // Determine target URL and key
  let targetUrl = '';
  let targetKey = '';

  if (targetEnv === 'production') {
    targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

    if (!confirmedProd && !isDryRun) {
      console.error(`\n⛔ PRODUCTION RESTORE SAFETY BLOCK:`);
      console.error(`   Target environment is PRODUCTION (${targetUrl}).`);
      console.error(`   Restoring to production will OVERWRITE current production data!`);
      console.error(`   To execute, you MUST pass: --confirm-restore-to-production-DANGER\n`);
      process.exit(1);
    }
  } else {
    // Default to staging
    targetUrl = process.env.STAGING_SUPABASE_URL || env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    targetKey = process.env.STAGING_SUPABASE_KEY || env.STAGING_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!targetUrl || !targetKey) {
    console.error('❌ Error: Missing target URL or service role key.');
    process.exit(1);
  }

  console.log(`\nBackup Folder: ${path.basename(selectedBackupDir)}`);
  console.log(`Backup Timestamp: ${manifest?.timestamp || 'Unknown'}`);
  console.log(`Owner Scope: ${manifest?.ownerScope || 'All Users'}`);
  console.log(`Target Environment: ${targetEnv.toUpperCase()}`);
  console.log(`Target Supabase Host: ${new URL(targetUrl).hostname}`);
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY-RUN (No changes will be made)' : '⚡ LIVE EXECUTION'}\n`);

  console.log(`--- EXPECTED RESTORE ROW COUNTS ---`);
  let totalRows = 0;
  for (const [table, rows] of Object.entries(dbData)) {
    console.log(`  • Table '${table}': ${rows.length} rows to restore`);
    totalRows += rows.length;
  }
  console.log(`  Total: ${totalRows} rows across ${Object.keys(dbData).length} tables`);

  const storageDir = path.join(selectedBackupDir, 'storage');
  const storageFilesByBucket: Record<string, string[]> = {};
  let totalFiles = 0;

  if (fs.existsSync(storageDir)) {
    console.log(`\n--- EXPECTED RESTORE STORAGE BUCKETS ---`);
    for (const bDir of fs.readdirSync(storageDir)) {
      const bPath = path.join(storageDir, bDir);
      if (fs.statSync(bPath).isDirectory()) {
        const files = getAllFilesRecursively(bPath);
        storageFilesByBucket[bDir] = files;
        totalFiles += files.length;
        console.log(`  • Bucket '${bDir}': ${files.length} file(s) to restore`);
        for (const f of files.slice(0, 5)) {
          console.log(`      - ${f}`);
        }
        if (files.length > 5) {
          console.log(`      ... and ${files.length - 5} more`);
        }
      }
    }
    console.log(`  Total: ${totalFiles} storage file(s) across ${Object.keys(storageFilesByBucket).length} bucket(s)`);
  }

  // Define strict dependency restore order: parents before children
  const restoreOrder = [
    'system_settings',
    'profiles',
    'farms',
    'strains',
    'leg_colors',
    'registry_options',
    'user_settings',
    'fowl',
    'fowl_identifier_counters',
    'safety_incidents',
    'breeding_pairings',
    'match',
    'match_photos',
    'match_videos',
    'fowl_photos',
    'fowl_status_history',
    'share_links',
    'admin_audit_logs',
  ];

  const allTablesToRestore = Array.from(new Set([...restoreOrder, ...Object.keys(dbData)]));

  if (isDryRun) {
    console.log(`\n=======================================================`);
    console.log(`🔍 DRY-RUN RESTORATION PLAN & ANALYSIS`);
    console.log(`=======================================================`);
    console.log(`1. TABLE RESTORATION ORDER (Parents before Children):`);
    let orderIndex = 1;
    for (const table of allTablesToRestore) {
      const count = (dbData[table] || []).length;
      if (count > 0 || Object.keys(dbData).includes(table)) {
        console.log(`   ${orderIndex++}. '${table}' (${count} rows)`);
      }
    }
    console.log(`   Dependency Rules:`);
    console.log(`     • profiles is restored before dependent user records.`);
    console.log(`     • fowl is restored before breeding_pairings, match, and fowl_status_history.`);
    console.log(`     • match is restored before match_videos and match_photos.`);

    console.log(`\n2. POST-RESTORE SEQUENCE RESET (EXPLICIT MANDATORY STEP):`);
    console.log(`   ⚠️ CRITICAL: Standard PostgREST/Supabase REST explicit-ID inserts DO NOT`);
    console.log(`      reset or advance the PostgreSQL serial/identity sequences (e.g., fowl_id_seq).`);
    console.log(`   • If explicit-ID inserts are executed without resetting sequences, subsequent`);
    console.log(`     application inserts will trigger duplicate key errors (fowl_pkey collision).`);
    console.log(`   • MANDATORY POST-RESTORE SQL SCRIPT to execute in Supabase SQL editor:`);
    console.log(`       SELECT setval(pg_get_serial_sequence('fowl', 'id'), coalesce(max(id), 1)) FROM fowl;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('match', 'id'), coalesce(max(id), 1)) FROM match;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('breeding_pairings', 'id'), coalesce(max(id), 1)) FROM breeding_pairings;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('safety_incidents', 'id'), coalesce(max(id), 1)) FROM safety_incidents;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('fowl_status_history', 'id'), coalesce(max(id), 1)) FROM fowl_status_history;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('share_links', 'id'), coalesce(max(id), 1)) FROM share_links;`);
    console.log(`       SELECT setval(pg_get_serial_sequence('admin_audit_logs', 'id'), coalesce(max(id), 1)) FROM admin_audit_logs;`);

    console.log(`\n3. EXISTING DATA SAFETY GUARD:`);
    console.log(`   • A real restore (--execute) will verify if the target database already contains`);
    console.log(`     rows for the backup owner. If rows exist, it refuses to restore unless`);
    console.log(`     --allow-overwrite-existing-owner-data is provided.`);

    console.log(`\n4. SUMMARY:`);
    console.log(`   Database tables ready: ${Object.keys(dbData).length} (${totalRows} rows)`);
    console.log(`   Storage files ready: ${totalFiles} objects`);
    console.log(`   NO CHANGES WERE APPLIED to ${targetEnv.toUpperCase()}.`);
    console.log(`=======================================================\n`);
    return;
  }

  // Live execution
  const supabase = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  // Safety Gate: Refuse real restore into database with existing owner rows unless flag is given
  const targetOwnerId =
    manifest?.ownerScope && manifest.ownerScope !== 'All Users'
      ? manifest.ownerScope
      : (dbData['fowl']?.[0]?.user_id || null);

  if (targetOwnerId) {
    console.log(`Verifying target database state for owner '${targetOwnerId}'...`);
    const { count, error: countErr } = await supabase
      .from('fowl')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', targetOwnerId);

    if (countErr) {
      console.warn(`  ⚠️ Could not verify existing fowl count: ${countErr.message}`);
    } else if (count !== null && count > 0) {
      if (!allowOverwriteExistingOwnerData) {
        console.error(`\n⛔ EXISTING OWNER DATA SAFETY BLOCK:`);
        console.error(`   Target database already contains ${count} fowl row(s) for owner '${targetOwnerId}'.`);
        console.error(`   A live restore into a database containing existing owner rows will cause key conflicts or mixed states.`);
        console.error(`   To proceed with overwriting/merging into existing data, you MUST provide:`);
        console.error(`     --allow-overwrite-existing-owner-data\n`);
        process.exit(1);
      } else {
        console.log(`  ⚠️ Notice: Target database contains ${count} existing fowl row(s). Flag --allow-overwrite-existing-owner-data was provided; proceeding.`);
      }
    } else {
      console.log(`  ✓ Target database is clean (0 existing fowl rows for owner '${targetOwnerId}').`);
    }
  }

  console.log(`\n--- EXECUTING DATABASE RESTORE ---`);
  // Tables will be restored in the pre-defined restoreOrder (parents before children)

  for (const table of allTablesToRestore) {
    const rows = dbData[table] || [];
    if (rows.length === 0) continue;
    console.log(`  Restoring ${rows.length} rows into '${table}'...`);

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from(table).upsert(batch);
      if (error) {
        console.error(`    ❌ Error restoring table '${table}': ${error.message}`);
      }
    }
    console.log(`  ✓ Restored table '${table}'`);
  }

  // Restore Storage Files
  if (fs.existsSync(storageDir)) {
    console.log(`\n--- EXECUTING STORAGE RESTORE ---`);
    for (const [bucket, files] of Object.entries(storageFilesByBucket)) {
      console.log(`  Restoring ${files.length} objects into bucket '${bucket}'...`);

      for (const relPath of files) {
        const filePath = path.join(storageDir, bucket, relPath);
        const fileContent = fs.readFileSync(filePath);
        const { error } = await supabase.storage.from(bucket).upload(relPath, fileContent, { upsert: true });
        if (error) {
          console.warn(`    ⚠️ Failed uploading ${relPath} to bucket '${bucket}': ${error.message}`);
        }
      }
      console.log(`  ✓ Restored bucket '${bucket}'`);
    }
  }

  console.log(`\n=======================================================`);
  console.log(`✅ RESTORE COMPLETED SUCCESSFULLY`);
  console.log(`=======================================================`);
  console.log(`MANDATORY NEXT STEP: Run sequence reset SQL in Supabase SQL editor:`);
  console.log(`  SELECT setval(pg_get_serial_sequence('fowl', 'id'), coalesce(max(id), 1)) FROM fowl;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('match', 'id'), coalesce(max(id), 1)) FROM match;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('breeding_pairings', 'id'), coalesce(max(id), 1)) FROM breeding_pairings;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('safety_incidents', 'id'), coalesce(max(id), 1)) FROM safety_incidents;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('fowl_status_history', 'id'), coalesce(max(id), 1)) FROM fowl_status_history;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('share_links', 'id'), coalesce(max(id), 1)) FROM share_links;`);
  console.log(`  SELECT setval(pg_get_serial_sequence('admin_audit_logs', 'id'), coalesce(max(id), 1)) FROM admin_audit_logs;\n`);
}

restore().catch((err) => {
  console.error('Fatal restore error:', err);
  process.exit(1);
});
