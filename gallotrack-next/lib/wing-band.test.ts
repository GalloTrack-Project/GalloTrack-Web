import { describe, it, expect } from 'vitest';
import {
  isValidWingBand,
  normalizeWingBand,
  WING_BAND_PATTERN,
  WING_BAND_MAX_LENGTH,
} from './wing-band';

describe('Wing Band Validation & Normalization', () => {
  it('allows standard alphanumeric IDs', () => {
    expect(isValidWingBand('WB-001')).toBe(true);
    expect(WING_BAND_PATTERN.test('WB-001')).toBe(true);
    expect(isValidWingBand('BAND123')).toBe(true);
    expect(isValidWingBand('12345')).toBe(true);
  });

  it('allows subscripts and superscripts for offspring tags (Sir Ragde Nalla convention)', () => {
    expect(isValidWingBand('1A₁')).toBe(true);
    expect(isValidWingBand('1A₁₂')).toBe(true);
    expect(isValidWingBand('Hatch#3 (Gen₂)')).toBe(true);
    expect(isValidWingBand('2B₃-OFFSPRING')).toBe(true);
  });

  it('allows notations and separators like /, #, -, ., _, :, (), and spaces', () => {
    expect(isValidWingBand('Sire #10-A')).toBe(true);
    expect(isValidWingBand('Dam: B/2.1')).toBe(true);
    expect(isValidWingBand('WB_2024/001 (Main)')).toBe(true);
  });

  it('treats empty or whitespace-only as valid optional values in isValidWingBand', () => {
    expect(isValidWingBand('')).toBe(true);
    expect(isValidWingBand('   ')).toBe(true);
    expect(isValidWingBand(null)).toBe(true);
    expect(isValidWingBand(undefined)).toBe(true);
  });

  it('rejects malicious or invalid characters', () => {
    expect(isValidWingBand('<script>')).toBe(false);
    expect(isValidWingBand('WB"001"')).toBe(false);
    expect(isValidWingBand("WB'001'")).toBe(false);
    expect(isValidWingBand('WB;DROP TABLE')).toBe(false);
    expect(isValidWingBand('WB$100')).toBe(false);
  });

  it('enforces maximum length of 50 characters', () => {
    const valid50 = 'A'.repeat(50);
    expect(isValidWingBand(valid50)).toBe(true);

    const invalid51 = 'A'.repeat(51);
    expect(isValidWingBand(invalid51)).toBe(false);
  });

  it('normalizes wing band by trimming and slicing to max length', () => {
    expect(normalizeWingBand('  WB-001  ')).toBe('WB-001');
    expect(normalizeWingBand('A'.repeat(60)).length).toBe(WING_BAND_MAX_LENGTH);
  });
});
