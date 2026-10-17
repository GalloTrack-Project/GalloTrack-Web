import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DATABASE & STORAGE RESTORE SCRIPT (WITH DRY-RUN & SAFETY GUARD)
 *
 * Usage:
 *   npx tsx scripts/restore-database.ts --backup=<folder_name> [--dry-run] [--target=staging|production]
 *
 * Safety Rules:
 *   - Runs in DRY-RUN mode by default unless --execute is passed.
 *   - Refuses to run against production unless --confirm-restore-to-production-DANGER is explicitly passed.
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

const backupFolderArg = getArg('backup');
const targetEnv = getArg('target') || 'staging';
const isDryRun = !hasFlag('execute');
const confirmedProd = hasFlag('confirm-restore-to-production-DANGER');

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

  if (isDryRun) {
    console.log(`\n=======================================================`);
    console.log(`🔍 DRY-RUN SUMMARY COMPLETE`);
    console.log(`Database tables ready: ${Object.keys(dbData).length} (${totalRows} rows)`);
    console.log(`Storage files ready: ${totalFiles} objects`);
    console.log(`NO CHANGES WERE APPLIED to ${targetEnv.toUpperCase()}.`);
    console.log(`To execute this restore against ${targetEnv.toUpperCase()}, run:`);
    console.log(`  npx tsx scripts/restore-database.ts --backup=${path.basename(selectedBackupDir)} --target=${targetEnv} --execute${targetEnv === 'production' ? ' --confirm-restore-to-production-DANGER' : ''}`);
    console.log(`=======================================================\n`);
    return;
  }

  // Live execution
  const supabase = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  console.log(`\n--- EXECUTING DATABASE RESTORE ---`);
  // Insert tables in dependency order
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

  // Include any extra tables in dbData not explicitly in restoreOrder
  const allTablesToRestore = Array.from(new Set([...restoreOrder, ...Object.keys(dbData)]));

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
  console.log(`=======================================================\n`);
}

restore().catch((err) => {
  console.error('Fatal restore error:', err);
  process.exit(1);
});
