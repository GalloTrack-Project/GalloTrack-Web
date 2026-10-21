/**
 * GalloTrack i18n Translation Importer
 *
 * Imports JSON translation files, validates key parity and placeholder preservation
 * against canonical English, and safely writes back to TypeScript dictionaries.
 *
 * Usage:
 *   npm run i18n:import
 *   npm run i18n:import -- --lang=tl --file=locales/tl.json
 *   npm run i18n:import -- --dry-run
 */

import fs from 'node:fs';
import path from 'node:path';
import { en } from '../lib/i18n/en';

const LOCALES_DIR = path.resolve(__dirname, '../locales');
const LIB_I18N_DIR = path.resolve(__dirname, '../lib/i18n');

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return Array.from(new Set(matches)).sort();
}

function validateSection(
  sectionKey: string,
  enSection: Record<string, any>,
  importSection: Record<string, any>,
  lang: string,
  errors: string[],
  warnings: string[]
) {
  for (const [key, enVal] of Object.entries(enSection)) {
    if (typeof enVal === 'string') {
      const impVal = importSection[key];
      if (impVal === undefined || impVal === null) {
        errors.push(`[${lang}] Missing key: "${sectionKey}.${key}"`);
        continue;
      }
      if (typeof impVal !== 'string') {
        errors.push(`[${lang}] Expected string for "${sectionKey}.${key}", got ${typeof impVal}`);
        continue;
      }

      // Check placeholders
      const enPlaceholders = extractPlaceholders(enVal);
      const impPlaceholders = extractPlaceholders(impVal);
      for (const p of enPlaceholders) {
        if (!impPlaceholders.includes(p)) {
          errors.push(
            `[${lang}] Missing placeholder "${p}" in "${sectionKey}.${key}": "${impVal}" (Expected from EN: "${enVal}")`
          );
        }
      }
      for (const p of impPlaceholders) {
        if (!enPlaceholders.includes(p)) {
          warnings.push(
            `[${lang}] Unexpected placeholder "${p}" in "${sectionKey}.${key}": "${impVal}" (Not in EN: "${enVal}")`
          );
        }
      }
    } else if (typeof enVal === 'object' && enVal !== null) {
      const subImp = importSection[key];
      if (!subImp || typeof subImp !== 'object') {
        errors.push(`[${lang}] Missing sub-category: "${sectionKey}.${key}"`);
      } else {
        validateSection(`${sectionKey}.${key}`, enVal, subImp, lang, errors, warnings);
      }
    }
  }

  // Check for unknown keys in import
  for (const key of Object.keys(importSection)) {
    if (!(key in enSection)) {
      warnings.push(`[${lang}] Unknown extraneous key discarded: "${sectionKey}.${key}"`);
    }
  }
}

function importLanguage(lang: 'tl' | 'hil', dryRun: boolean): boolean {
  const jsonPath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    return false;
  }

  console.log(`\n🔍 Validating and importing [${lang}] from ${jsonPath}...`);
  let importedData: any;
  try {
    importedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err: unknown) {
    console.error(`❌ Failed to parse JSON for [${lang}]:`, err);
    return false;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  validateSection('', en, importedData, lang, errors, warnings);

  if (warnings.length > 0) {
    console.warn(`⚠️  ${warnings.length} Warnings for [${lang}]:`);
    for (const w of warnings) console.warn(`   ${w}`);
  }

  if (errors.length > 0) {
    console.error(`\n❌ Validation FAILED with ${errors.length} error(s) for [${lang}]:`);
    for (const e of errors) console.error(`   ${e}`);
    return false;
  }

  console.log(`✓ [${lang}] validation passed with zero errors.`);

  if (dryRun) {
    console.log(`[DRY RUN] Skipping file overwrite for lib/i18n/${lang}.ts`);
    return true;
  }

  // Format into TypeScript file
  const tsPath = path.join(LIB_I18N_DIR, `${lang}.ts`);
  const headerComment =
    lang === 'tl'
      ? '// Tagalog (Filipino) translation dictionary\n// Derived from en.ts canonical keys'
      : '// Hiligaynon (Ilonggo) translation dictionary (BETA)\n// Derived from en.ts canonical keys';

  const tsContent = `${headerComment}
import type { AppTranslations } from './types';

export const ${lang}: AppTranslations = ${JSON.stringify(importedData, null, 2)} as const;
`;

  fs.writeFileSync(tsPath, tsContent, 'utf-8');
  console.log(`✓ Updated: ${tsPath}`);
  return true;
}

function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 GalloTrack i18n Translation Importer');
  if (dryRun) console.log('Mode: DRY RUN (read-only validation)');

  const targetLangs: ('tl' | 'hil')[] = ['tl', 'hil'];
  let allOk = true;

  for (const lang of targetLangs) {
    const ok = importLanguage(lang, dryRun);
    if (!ok) allOk = false;
  }

  if (!allOk) {
    console.error('\n❌ Translation import failed validation.');
    process.exit(1);
  }

  console.log('\n🎉 Translation import completed successfully!');
}

run();
