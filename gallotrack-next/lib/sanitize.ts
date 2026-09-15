/**
 * Shared input sanitization utility for GalloTrack.
 * Use this consistently across all API routes and client-side forms.
 */

const DANGEROUS_CHARS = /[<>&"'/\\]/g;
const DANGEROUS_PATTERNS = /javascript:/gi;
const EVENT_HANDLERS = /on\w+=/gi;

/**
 * Sanitize a string input by removing potentially dangerous characters and patterns.
 * Strips angle brackets, ampersands, quotes, slashes, backslashes,
 * javascript: protocol, and on* event handlers.
 */
export function sanitize(value: string): string {
  return value
    .replace(DANGEROUS_CHARS, '')
    .replace(DANGEROUS_PATTERNS, '')
    .replace(EVENT_HANDLERS, '')
    .trim();
}

/**
 * Sanitize an optional string. Returns empty string if input is null/undefined.
 */
export function sanitizeOptional(value: string | null | undefined): string {
  if (!value) return '';
  return sanitize(value);
}

/**
 * Validate and sanitize an email address.
 * Returns null if invalid.
 */
export function sanitizeEmail(email: string): string | null {
  const sanitized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
    return null;
  }
  return sanitized;
}
