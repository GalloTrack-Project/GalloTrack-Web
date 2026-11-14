import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function locale(name: 'en' | 'tl' | 'hil') {
  const raw = readFileSync(path.join(process.cwd(), 'locales', `${name}.json`), 'utf8');
  return JSON.parse(raw) as {
    breedingPairAnalytics: Record<string, string>;
  };
}

describe('Breeding Pair Performance Analytics locale keys', () => {
  it.each(['en', 'tl', 'hil'] as const)('%s contains the Cock × Hen labels', (language) => {
    const messages = locale(language).breedingPairAnalytics;
    expect(messages.title).toBeTruthy();
    expect(messages.badge).toBe('COCK × HEN MATRIX');
    expect(messages.columnCross).toBe('COCK × HEN CROSS');
    expect(messages.subtitle).toContain('Cock × Hen cross');
    expect(messages.pairLabel).toBe('{cock} × {hen}');
  });

  it.each(['en', 'tl', 'hil'] as const)('%s values contain real characters, not ?', (language) => {
    const values = Object.values(locale(language).breedingPairAnalytics);
    for (const value of values) {
      expect(value).not.toMatch(/\?/);
      expect(value).not.toMatch(/\bSire\b|\bDam\b/);
    }
    expect(values.join(' ')).toContain('×');
  });
});
