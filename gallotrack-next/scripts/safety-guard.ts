import * as fs from 'fs';
import * as path from 'path';

/**
 * PRODUCTION SAFETY GUARD MODULE
 * Prevents accidental execution of destructive scripts (reset, seed, delete, migrate-down)
 * against the production environment.
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

export function assertSafeExecution(scriptName: string) {
  const currentAppEnv = process.env.NEXT_PUBLIC_APP_ENV || env.NEXT_PUBLIC_APP_ENV || 'development';
  const targetUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const args = process.argv.slice(2);
  const hasOverrideFlag = args.includes('--I-UNDERSTAND-THIS-WILL-MUTATE-PRODUCTION');

  const isProductionTarget =
    currentAppEnv.toLowerCase() === 'production' ||
    targetUrl.includes('supabase.co'); // Production Supabase project

  if (isProductionTarget && !hasOverrideFlag) {
    console.error(`\n⛔ PRODUCTION DESTRUCTIVE SCRIPT SAFETY GUARD BLOCKED THIS ACTION!`);
    console.error(`   Script '${scriptName}' requested execution against PRODUCTION.`);
    console.error(`   Environment: ${currentAppEnv.toUpperCase()}`);
    console.error(`   Target URL: ${targetUrl.slice(0, 25)}...`);
    console.error(`\n   Destructive operations (seed, reset, delete, migrate-down) are blocked by default.`);
    console.error(`   To force execution against production, you MUST pass the explicit flag:`);
    console.error(`     --I-UNDERSTAND-THIS-WILL-MUTATE-PRODUCTION\n`);
    process.exit(1);
  }

  if (isProductionTarget && hasOverrideFlag) {
    console.warn(`\n⚠️ WARNING: EXECUTING DESTRUCTIVE SCRIPT '${scriptName}' AGAINST PRODUCTION WITH OVERRIDE FLAG!\n`);
  }
}
