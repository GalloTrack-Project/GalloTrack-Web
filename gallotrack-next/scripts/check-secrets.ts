/**
 * check-secrets.ts — Local secrets guard.
 *
 * Scans the git working tree and git commit history for:
 * - Exposed Supabase service role keys
 * - JWT tokens (eyJ...)
 * - Committed .env or .env.local files
 * - Database URLs with passwords
 *
 * SAFETY RULE: Never prints full secret values. Reports only first 4 characters and length.
 */

import { execSync } from 'child_process';
import * as path from 'path';

function runGit(args: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (err: unknown) {
    return '';
  }
}

interface SecretHit {
  type: string;
  file: string;
  commit?: string;
  prefix: string;
  length: number;
}

function scan(): { hits: SecretHit[]; clean: boolean } {
  const hits: SecretHit[] = [];

  // 1. Scan for committed .env files
  const envFiles = runGit('log --all --name-only --oneline -- "*.env*" "*env.local*"');
  for (const line of envFiles.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.endsWith('.env.example') || trimmed.includes(' ')) continue;
    if (trimmed.endsWith('.env') || trimmed.endsWith('.env.local') || trimmed.includes('.env.')) {
      hits.push({
        type: 'COMMITTED_ENV_FILE',
        file: trimmed,
        prefix: trimmed.slice(0, 4),
        length: trimmed.length,
      });
    }
  }

  // 2. Scan git history for JWT patterns (eyJ...)
  const jwtLog = runGit('log -p -G "eyJ[A-Za-z0-9_-]{10,}"');
  const jwtRegex = /\+.*?(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = jwtRegex.exec(jwtLog)) !== null) {
    const token = match[1];
    hits.push({
      type: 'JWT',
      file: 'git-history',
      prefix: token.slice(0, 4),
      length: token.length,
    });
  }

  // 3. Scan git history for database URLs with passwords
  const dbUrlLog = runGit('log -p -G "postgres.*://.*:.*@"');
  const dbUrlRegex = /\+.*?(postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^\s/'")]+))/g;
  while ((match = dbUrlRegex.exec(dbUrlLog)) !== null) {
    const user = match[2];
    const pw = match[3];
    // Exclude mock/placeholder localhost passwords
    if (user === 'username' && pw === 'password') continue;
    hits.push({
      type: 'DB_URL_WITH_PASSWORD',
      file: 'git-history',
      prefix: pw.slice(0, 4),
      length: pw.length,
    });
  }

  // 4. Scan working tree for hardcoded secrets
  const treeGrep = runGit('grep -iE "(service_role_key|SUPABASE_SERVICE_ROLE_KEY)[ \t]*[:=][ \t]*[\'"`][A-Za-z0-9_.-]{20,}" -- ":!.env*" ":!scratch/*" ":!scripts/check-secrets.ts"');
  if (treeGrep.trim()) {
    for (const line of treeGrep.split('\n')) {
      if (!line.trim() || line.includes('your-') || line.includes('placeholder')) continue;
      const parts = line.split(':');
      const file = parts[0];
      hits.push({
        type: 'EXPOSED_SERVICE_ROLE_KEY',
        file,
        prefix: 'key-',
        length: line.length,
      });
    }
  }

  return { hits, clean: hits.length === 0 };
}

console.log('[check:secrets] Running secret scan on repository...');
const { hits, clean } = scan();

if (!clean) {
  console.error(`\n❌ [check:secrets] Detected ${hits.length} potential secret(s):`);
  for (const hit of hits) {
    console.error(`  - Type: ${hit.type} | File: ${hit.file} | Prefix: ${hit.prefix}... | Length: ${hit.length}`);
  }
  process.exit(1);
} else {
  console.log('✔ [check:secrets] No exposed secrets, JWTs, or committed .env files found.');
  process.exit(0);
}
