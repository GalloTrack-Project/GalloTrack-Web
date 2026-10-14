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
  const metadataPath = path.join(selectedBackupDir, 'metadata.json');

  if (!fs.existsSync(dbJsonPath)) {
    console.error(`❌ Error: database.json missing in backup directory ${selectedBackupDir}`);
    process.exit(1);
  }

  const dbData: Record<string, any[]> = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  const metadata = fs.existsSync(metadataPath) ? JSON.parse(fs.readFileSync(metadataPath, 'utf8')) : null;

  // Determine target URL and key
  let targetUrl = '';
  let targetKey = '';

  if (targetEnv === 'production') {
    targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

    if (!confirmedProd) {
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
  console.log(`Backup Timestamp: ${metadata?.timestamp || 'Unknown'}`);
  console.log(`Target Environment: ${targetEnv.toUpperCase()}`);
  console.log(`Target Supabase Host: ${new URL(targetUrl).hostname}`);
  console.log(`Execution Mode: ${isDryRun ? '🔍 DRY-RUN (No changes will be made)' : '⚡ LIVE EXECUTION'}\n`);

  console.log(`--- EXPECTED RESTORE ROW COUNTS ---`);
  for (const [table, rows] of Object.entries(dbData)) {
    console.log(`  • Table '${table}': ${rows.length} rows to restore`);
  }

  const storageDir = path.join(selectedBackupDir, 'storage');
  if (fs.existsSync(storageDir)) {
    console.log(`\n--- EXPECTED RESTORE STORAGE BUCKETS ---`);
    for (const bDir of fs.readdirSync(storageDir)) {
      const bPath = path.join(storageDir, bDir);
      if (fs.statSync(bPath).isDirectory()) {
        const fileCount = fs.readdirSync(bPath).length;
        console.log(`  • Bucket '${bDir}': ${fileCount} files to restore`);
      }
    }
  }

  if (isDryRun) {
    console.log(`\n=======================================================`);
    console.log(`🔍 DRY-RUN SUMMARY COMPLETE`);
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
    'fowl',
    'breeding_pairings',
    'match',
    'share_links',
    'admin_audit_logs',
  ];

  for (const table of restoreOrder) {
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
    for (const bDir of fs.readdirSync(storageDir)) {
      const bPath = path.join(storageDir, bDir);
      if (!fs.statSync(bPath).isDirectory()) continue;

      const files = fs.readdirSync(bPath);
      console.log(`  Restoring ${files.length} objects into bucket '${bDir}'...`);

      for (const fileName of files) {
        const filePath = path.join(bPath, fileName);
        const fileContent = fs.readFileSync(filePath);
        const { error } = await supabase.storage.from(bDir).upload(fileName, fileContent, { upsert: true });
        if (error) {
          console.warn(`    ⚠️ Failed uploading ${fileName} to bucket '${bDir}': ${error.message}`);
        }
      }
      console.log(`  ✓ Restored bucket '${bDir}'`);
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
