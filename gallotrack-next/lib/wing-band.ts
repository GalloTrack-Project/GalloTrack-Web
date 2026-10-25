/**
 * Wing Banding helper and validation rules.
 *
 * Supports alphanumeric input (letters, numbers, subscripts/notations
 * such as 1A₁, WB-001, Hatch#3, Gen₂, etc.) as requested by Sir Ragde Nalla
 * for offspring, sires, and dams.
 */

export const WING_BAND_MAX_LENGTH = 50;

/**
 * Unicode-aware pattern supporting:
 * - Letters (\p{L}) and Numbers (\p{N})
 * - Unicode Subscripts (\u2080-\u209C for subscript digits ₀-₉ and letters)
 * - Unicode Superscripts (\u2070-\u207F, \u00B2, \u00B3, \u00B9)
 * - Safe symbols/notations: _ . - / # : ( ) and spaces
 */
export const WING_BAND_PATTERN = /^[\p{L}\p{N}\u2080-\u209C\u2070-\u207F\u00B2\u00B3\u00B9_.\-/#:() ]{1,50}$/u;

export const WING_BAND_HINT =
  'Alphanumeric physical tag (letters, numbers, notations, or subscripts like WB-001, 1A₁, Hatch#3)';

export const WING_BAND_ERROR =
  'Wing Banding: use alphanumeric characters, subscripts, or notations (- . _ / # : () spaces), up to 50 characters.';

export function isValidWingBand(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  if (!raw) return true; // optional
  return WING_BAND_PATTERN.test(raw);
}

export function normalizeWingBand(value: unknown): string {
  return String(value ?? '').trim().slice(0, WING_BAND_MAX_LENGTH);
}
