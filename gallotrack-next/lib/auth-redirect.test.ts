import { describe, it, expect } from 'vitest';
import { sanitizeRedirectPath, signInRedirectFor } from './auth-redirect';

describe('sanitizeRedirectPath', () => {
  describe('Valid Same-Origin Relative Paths', () => {
    it('preserves clean relative paths and query parameters', () => {
      expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/profiling?tab=males')).toBe('/profiling?tab=males');
      expect(sanitizeRedirectPath('/match-logs/new')).toBe('/match-logs/new');
      expect(sanitizeRedirectPath('/chicken-inventory?status=active&gender=male')).toBe(
        '/chicken-inventory?status=active&gender=male',
      );
    });
  });

  describe('Null, Empty, and Root Fallback', () => {
    it('falls back to /dashboard for empty or nullish values', () => {
      expect(sanitizeRedirectPath(null)).toBe('/dashboard');
      expect(sanitizeRedirectPath(undefined)).toBe('/dashboard');
      expect(sanitizeRedirectPath('')).toBe('/dashboard');
      expect(sanitizeRedirectPath('   ')).toBe('/dashboard');
    });

    it('falls back to /dashboard when redirect is root / (never redirects back to /)', () => {
      expect(sanitizeRedirectPath('/')).toBe('/dashboard');
      expect(sanitizeRedirectPath('  /  ')).toBe('/dashboard');
    });

    it('respects a custom fallback if provided', () => {
      expect(sanitizeRedirectPath(null, '/custom')).toBe('/custom');
      expect(sanitizeRedirectPath('/', '/custom')).toBe('/custom');
      expect(sanitizeRedirectPath('https://evil.com', '/custom')).toBe('/custom');
    });
  });

  describe('Malicious Scheme and Open Redirect Prevention', () => {
    it('blocks external absolute URLs (http, https)', () => {
      expect(sanitizeRedirectPath('https://evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('http://attacker.com/steal-cookie')).toBe('/dashboard');
      expect(sanitizeRedirectPath('HTTPS://EVIL.COM/dashboard')).toBe('/dashboard');
    });

    it('blocks dangerous schemes (javascript, data, vbscript)', () => {
      expect(sanitizeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
      expect(sanitizeRedirectPath('javascript:void(0)')).toBe('/dashboard');
      expect(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
      expect(sanitizeRedirectPath('vbscript:msgbox(1)')).toBe('/dashboard');
    });

    it('blocks protocol-relative URLs (//)', () => {
      expect(sanitizeRedirectPath('//evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('///evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('////attacker.com/dashboard')).toBe('/dashboard');
    });

    it('blocks backslash injection (\\)', () => {
      expect(sanitizeRedirectPath('/\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('\\\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('\\evil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/dashboard\\evil.com')).toBe('/dashboard');
    });

    it('blocks URL-encoded variants of dangerous patterns', () => {
      expect(sanitizeRedirectPath('/%2fevil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/%5cevil.com')).toBe('/dashboard');
      expect(sanitizeRedirectPath('javascript%3aalert(1)')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/%2f%2fevil.com')).toBe('/dashboard');
    });

    it('blocks malformed URI sequences safely', () => {
      expect(sanitizeRedirectPath('/%E0%A4%A')).toBe('/dashboard');
    });
  });

  describe('Auth Loop Prevention', () => {
    it('prevents redirect loops by rejecting /login and /register as redirect targets', () => {
      expect(sanitizeRedirectPath('/login')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/login?redirect=/foo')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/register')).toBe('/dashboard');
      expect(sanitizeRedirectPath('/register?ref=123')).toBe('/dashboard');
    });
  });
});

describe('signInRedirectFor', () => {
  it('preserves the current protected page as the redirect target', () => {
    expect(signInRedirectFor('/match-logs/164/edit?returnTo=%2Fdashboard')).toBe(
      `/login?redirect=${encodeURIComponent('/match-logs/164/edit?returnTo=%2Fdashboard')}`,
    );
  });

  it('never falls back to the landing page', () => {
    expect(signInRedirectFor('/')).toBe('/login?redirect=%2Fdashboard');
    expect(signInRedirectFor(null)).toBe('/login?redirect=%2Fdashboard');
    expect(signInRedirectFor(undefined)).toBe('/login?redirect=%2Fdashboard');
    expect(signInRedirectFor('https://evil.com')).toBe('/login?redirect=%2Fdashboard');
    expect(signInRedirectFor('/login?redirect=/foo')).toBe('/login?redirect=%2Fdashboard');
  });

  it('always targets the sign-in route', () => {
    expect(signInRedirectFor('/dashboard').startsWith('/login?redirect=')).toBe(true);
  });
});
