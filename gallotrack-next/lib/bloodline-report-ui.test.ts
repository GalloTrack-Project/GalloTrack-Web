import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BLOODLINE_REPORT_CARD,
  BLOODLINE_REPORT_PARENTAGE,
  BLOODLINE_REPORT_SUMMARY,
  formatBloodlineDisplayValue,
  getBloodlineParentageDisplay,
} from './bloodline-report-ui';

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

function cssRule(name: string): string {
  const match = css.match(new RegExp(`\\.${name}\\s*\\{([^}]*)\\}`, 's'));
  if (!match) throw new Error(`Missing CSS rule .${name}`);
  return match[1];
}

describe('bloodline report layout utilities', () => {
  it('applies the shared container and shrink-safe classes', () => {
    expect(BLOODLINE_REPORT_CARD).toContain('bloodline-report');
    expect(BLOODLINE_REPORT_CARD).toContain('min-w-0');
    expect(BLOODLINE_REPORT_SUMMARY).toContain('bloodline-report-summary');
    expect(BLOODLINE_REPORT_PARENTAGE).toBe('bloodline-report-parentage');
  });

  it('defines a two-column narrow grid and a capped auto-fit grid at wider sizes', () => {
    const card = cssRule('bloodline-report');
    expect(card).toContain('container-type: inline-size');
    expect(card).toContain('min-width: 0');

    const summary = cssRule('bloodline-report-summary');
    expect(summary).toContain('repeat(2, minmax(min(100%, 6rem), 1fr))');
    expect(css).toContain('@container (min-width: 26rem)');
    expect(css).toContain('repeat(auto-fit, minmax(min(100%, 9rem), 1fr))');

    const parentage = cssRule('bloodline-report-parentage');
    expect(parentage).toContain('grid-column: 1 / -1');
  });

  it('title-cases strain and breed display values without changing data', () => {
    expect(formatBloodlineDisplayValue('hatch')).toBe('Hatch');
    expect(formatBloodlineDisplayValue('KELSO')).toBe('Kelso');
    expect(formatBloodlineDisplayValue('foundation stock')).toBe('Foundation Stock');
    expect(formatBloodlineDisplayValue('Whitehackle / Lemon 84 Cross')).toBe(
      'Whitehackle / Lemon 84 Cross',
    );
    expect(formatBloodlineDisplayValue('crossbred')).toBe('Crossbred');
    expect(formatBloodlineDisplayValue('')).toBe('Unknown');
  });

  it('shortens foundation parentage while preserving the full tooltip meaning', () => {
    const display = getBloodlineParentageDisplay({
      type: 'unknown',
      label: 'Unknown (foundation stock, no recorded parents)',
      relationship: 'Foundation stock (no recorded parents)',
      fullLabel: 'Unknown (foundation stock, no recorded parents) · kulang sa datos',
    });

    expect(display.primary).toBe('Unknown');
    expect(display.secondary).toBe('Foundation stock, no recorded parents');
    expect(display.title).toContain('Unknown (foundation stock, no recorded parents)');
  });

  it('keeps non-foundation parentage labels intact', () => {
    const display = getBloodlineParentageDisplay({
      type: 'close',
      label: 'Close Breeding',
      relationship: 'Parent × offspring',
      fullLabel: 'Close Breeding (mag-amay / magbugto)',
    });

    expect(display.primary).toBe('Close Breeding');
    expect(display.secondary).toBe('Parent × offspring');
    expect(display.title).toBe('Close Breeding (mag-amay / magbugto)');
  });
});
