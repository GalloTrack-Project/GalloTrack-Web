import { describe, expect, it } from 'vitest';
import { en } from './en';
import { tl } from './tl';
import { hil } from './hil';

function leaves(value: unknown, prefix: string, out: string[]): void {
  if (typeof value === 'string') {
    out.push(prefix);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      leaves(child, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}

function keysFor(value: unknown, prefix: string): string[] {
  const out: string[] = [];
  leaves(value, prefix, out);
  return out;
}

describe('notification translations', () => {
  it('provides every notification string in Tagalog and Hiligaynon', () => {
    const required = [
      ...keysFor(en.notifications, 'notifications'),
      'nav.notifications',
      'nav.notificationsShort',
      'dashboard.inNext30Days',
      'dashboard.noUpcoming30Days',
    ];
    for (const dictionary of [tl, hil]) {
      const record = dictionary as unknown as Record<string, unknown>;
      for (const key of required) {
        const value = key.split('.').reduce<unknown>((current, part) => {
          if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[part];
          }
          return undefined;
        }, record);
        expect(typeof value, `${key} must be translated`).toBe('string');
        expect(String(value).trim().length, `${key} must not be empty`).toBeGreaterThan(0);
      }
    }
  });
});
