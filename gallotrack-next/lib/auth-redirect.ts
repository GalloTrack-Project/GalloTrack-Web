/**
 * Sanitizes redirect paths to prevent open redirects, scheme injection,
 * and redirect loops. Only same-origin relative paths starting with a single '/'
 * are permitted. Anything else safely falls back (defaulting to '/dashboard').
 */
export function sanitizeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = '/dashboard'
): string {
  if (!redirect || typeof redirect !== 'string') {
    return fallback;
  }

  const trimmed = redirect.trim();

  // Empty or root landing page falls back to /dashboard (per requirement: never to "/" as fallback)
  if (!trimmed || trimmed === '/') {
    return fallback;
  }

  // Must begin with a single '/' and not protocol-relative '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Disallow backslashes anywhere in path (browsers like Safari/IE or certain proxies interpret \ as host separators)
  if (trimmed.includes('\\')) {
    return fallback;
  }

  // Disallow explicit scheme patterns (http:, https:, javascript:, data:, etc.)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  // Inspect decoded string to catch URL-encoded slashes, backslashes, or schemes
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      decoded.startsWith('//') ||
      decoded.startsWith('/\\') ||
      decoded.includes('\\') ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)
    ) {
      return fallback;
    }

    // Loop prevention: avoid redirecting directly back to auth entry routes
    const pathOnly = decoded.split('?')[0].toLowerCase();
    if (pathOnly === '/login' || pathOnly === '/register') {
      return fallback;
    }
  } catch {
    // Malformed URI sequence
    return fallback;
  }

  return trimmed;
}
