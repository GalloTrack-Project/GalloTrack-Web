import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim();
const sourceFiles = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '*.tsx'],
  { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
)
  .split('\0')
  .filter((file) => file.startsWith('gallotrack-next/') && !file.includes('node_modules'));

function inputTags(source: string): string[] {
  return source.match(/<input\b[^>]*\/?>/g) ?? [];
}

describe('native suggestion contract', () => {
  it('keeps autocomplete off on every explicit combobox input and never adds a list', () => {
    const violations: string[] = [];
    for (const relative of sourceFiles) {
      const source = readFileSync(resolve(repoRoot, relative), 'utf8');
      for (const tag of inputTags(source)) {
        if (!/\brole=(["'])combobox\1/.test(tag)) continue;
        const autoCompleteOff =
          /\bautoComplete=(["'])off\1/.test(tag) || /\bautocomplete=(["'])off\1/.test(tag);
        if (!autoCompleteOff) violations.push(`${relative}: combobox missing autocomplete="off"`);
        if (/\blist=/.test(tag)) violations.push(`${relative}: combobox still has a list attribute`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps autocomplete off on inputs that intentionally use a native datalist', () => {
    const violations: string[] = [];
    for (const relative of sourceFiles) {
      const source = readFileSync(resolve(repoRoot, relative), 'utf8');
      for (const tag of inputTags(source)) {
        if (!/\blist=/.test(tag)) continue;
        const autoCompleteOff =
          /\bautoComplete=(["'])off\1/.test(tag) || /\bautocomplete=(["'])off\1/.test(tag);
        if (!autoCompleteOff) violations.push(`${relative}: datalist input missing autocomplete="off"`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('checks the current gallotrack-next source tree rather than a stale fixture', () => {
    expect(sourceFiles.some((file) => file.endsWith('components/ui/ComboboxInput.tsx'))).toBe(true);
  });
});
