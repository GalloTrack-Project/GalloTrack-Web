import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { proxy, PUBLIC_PATHS, isPublicPrefixOrStatic } from '../proxy';
import { sanitizeRedirectPath } from './auth-redirect';
import LandingNavbar from '../components/landing/Navbar';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

const mockUseAuth = vi.fn();
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: vi.fn() }),
}));

describe('Auth Routing & Redirect Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
    mockUseAuth.mockReturnValue({
      currentUserId: null,
      username: '',
    });
  });

  describe('Step 1: Logged Out "/" -> "/login"', () => {
    it('includes /login in PUBLIC_PATHS so it is recognized as a public entrance', () => {
      expect(PUBLIC_PATHS.has('/login')).toBe(true);
      expect(PUBLIC_PATHS.has('/register')).toBe(true);
      expect(PUBLIC_PATHS.has('/')).toBe(true);
    });

    it('allows an unauthenticated visitor to reach /login on the first click without 307 bounce to /', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

      const request = new NextRequest('https://gallotrack.vercel.app/login');
      const response = await proxy(request);

      // Must NOT redirect to '/'
      expect(response.status).not.toBe(307);
      expect(response.headers.get('location')).toBeNull();
    });

    it('allows an unauthenticated visitor to reach /register without redirection', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

      const request = new NextRequest('https://gallotrack.vercel.app/register');
      const response = await proxy(request);

      expect(response.status).not.toBe(307);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Step 2: Logged Out "/dashboard" -> "/login?redirect=/dashboard" -> login -> "/dashboard"', () => {
    it('redirects an unauthenticated user on /dashboard to /login with sanitized redirect param', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

      const request = new NextRequest('https://gallotrack.vercel.app/dashboard');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBe('https://gallotrack.vercel.app/login?redirect=%2Fdashboard');
    });

    it('redirects unauthenticated requests on sub-dashboard screens with encoded path and query', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

      const request = new NextRequest('https://gallotrack.vercel.app/profiling?tab=males');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBe('https://gallotrack.vercel.app/login?redirect=%2Fprofiling%3Ftab%3Dmales');
    });

    it('sanitizes the redirect param upon login and forwards to the intended path, never to /', () => {
      const sanitized = sanitizeRedirectPath('/profiling?tab=males');
      expect(sanitized).toBe('/profiling?tab=males');

      // If redirect was somehow '/', it safely falls back to /dashboard
      const fallbackFromRoot = sanitizeRedirectPath('/');
      expect(fallbackFromRoot).toBe('/dashboard');
    });
  });

  describe('Step 3: Logged In "/login" -> "/dashboard"', () => {
    it('redirects an authenticated user visiting /login directly to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'breeder@farm.ph' } },
        error: null,
      });

      const request = new NextRequest('https://gallotrack.vercel.app/login');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://gallotrack.vercel.app/dashboard');
    });

    it('redirects an authenticated user visiting /register directly to /dashboard', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'breeder@farm.ph' } },
        error: null,
      });

      const request = new NextRequest('https://gallotrack.vercel.app/register');
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://gallotrack.vercel.app/dashboard');
    });
  });

  describe('Step 4: Public & Auth Flows Integrity (/auth/*, /share/*, /api/*)', () => {
    it('bypasses proxy guards for /auth confirmation and password update routes', async () => {
      const confirmReq = new NextRequest('https://gallotrack.vercel.app/auth/confirm?token=123');
      expect(isPublicPrefixOrStatic(confirmReq.nextUrl.pathname)).toBe(true);

      const response = await proxy(confirmReq);
      expect(response.status).toBe(200);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('bypasses proxy guards for public share routes (/share/[token])', async () => {
      const shareReq = new NextRequest('https://gallotrack.vercel.app/share/fowl-abc');
      expect(isPublicPrefixOrStatic(shareReq.nextUrl.pathname)).toBe(true);

      const response = await proxy(shareReq);
      expect(response.status).toBe(200);
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('allows both visitors and authenticated users to browse the public landing page /', async () => {
      const req = new NextRequest('https://gallotrack.vercel.app/');
      const response = await proxy(req);
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Step 5: End-to-End Walkthrough Sequence', () => {
    it('walks: logged out "/" -> /login, logged out /dashboard -> /login?redirect=/dashboard -> login -> /dashboard, logged in /login -> /dashboard, logged in "/" -> landing page shows "Open Dashboard"', async () => {
      // 1. Logged out "/" -> visitor requests /login (direct access, no redirect loop back to "/")
      mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });
      const loginRequest = new NextRequest('https://gallotrack.vercel.app/login');
      const loginResponse = await proxy(loginRequest);
      expect(loginResponse.status).not.toBe(307);
      expect(loginResponse.headers.get('location')).toBeNull();

      // 2. Logged out /dashboard -> redirected to /login?redirect=/dashboard
      const dashboardRequest = new NextRequest('https://gallotrack.vercel.app/dashboard');
      const dashboardResponse = await proxy(dashboardRequest);
      expect(dashboardResponse.status).toBe(307);
      expect(dashboardResponse.headers.get('location')).toBe('https://gallotrack.vercel.app/login?redirect=%2Fdashboard');

      // Login completed: the redirect parameter /dashboard is sanitized and resolves to /dashboard (never "/")
      const postLoginTarget = sanitizeRedirectPath('/dashboard');
      expect(postLoginTarget).toBe('/dashboard');

      // 3. Logged in /login -> redirected to /dashboard
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-789', email: 'breeder@farm.ph' } },
        error: null,
      });
      const loggedInLoginReq = new NextRequest('https://gallotrack.vercel.app/login');
      const loggedInLoginRes = await proxy(loggedInLoginReq);
      expect(loggedInLoginRes.status).toBe(307);
      expect(loggedInLoginRes.headers.get('location')).toBe('https://gallotrack.vercel.app/dashboard');

      // 4. Logged in "/" -> landing page shows "Open Dashboard"
      const homeReq = new NextRequest('https://gallotrack.vercel.app/');
      const homeRes = await proxy(homeReq);
      expect(homeRes.status).toBe(200);
      expect(homeRes.headers.get('location')).toBeNull();

      // Navbar renders "Open Dashboard" CTA for authenticated session
      mockUseAuth.mockReturnValue({
        currentUserId: 'user-789',
        username: 'breeder@farm.ph',
      });
      const { unmount } = render(React.createElement(LandingNavbar));
      const dashboardCta = screen.getByRole('link', { name: /Open Dashboard/i });
      expect(dashboardCta).toHaveAttribute('href', '/dashboard');
      expect(screen.queryByRole('link', { name: /^Sign up$/i })).not.toBeInTheDocument();
      unmount();
    });
  });
});
