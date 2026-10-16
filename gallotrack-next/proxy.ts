import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/design-kit']);
export const PUBLIC_PREFIXES = ['/auth', '/share', '/api', '/_next'];

const STATIC_EXTENSIONS = [
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'css', 'js',
  'mjs', 'map', 'woff', 'woff2', 'ttf', 'otf', 'txt', 'xml', 'webmanifest',
];

export function isStaticAsset(pathname: string): boolean {
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex > 0) {
    const extension = lastSegment.slice(dotIndex + 1).toLowerCase();
    if (STATIC_EXTENSIONS.includes(extension)) return true;
  }
  return false;
}

export function isPublicPrefixOrStatic(pathname: string): boolean {
  if (isStaticAsset(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectTarget(request: NextRequest, destination: string, search = ''): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = search;
  return NextResponse.redirect(url);
}

/**
 * Server-side route guard for GalloTrack.
 *
 * - Unauthenticated requests to protected screens are sent to `/login` with a sanitized `?redirect=` param.
 * - Logged-in users visiting `/login` or `/register` are redirected to `/dashboard`.
 * - Public routes (`/`, `/design-kit`, `/auth/*`, `/share/*`, `/api/*`, static assets) remain accessible.
 * - `/admin/*` is additionally restricted to admin profiles.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // 1. Static assets and public prefix routes (/auth, /share, /api, /_next) bypass auth guards
  if (isPublicPrefixOrStatic(pathname)) {
    return NextResponse.next();
  }

  // 2. Public landing pages (/ and /design-kit) accessible without redirection for both guests and authenticated users
  if (pathname === '/' || pathname === '/design-kit') {
    return NextResponse.next();
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();
    const isAuthenticated = !error && !!data?.user;

    // 3. Auth entry routes (/login, /register)
    if (pathname === '/login' || pathname === '/register') {
      if (isAuthenticated) {
        // Authenticated users must not be bounced to the landing page; send to /dashboard
        return redirectTarget(request, '/dashboard');
      }
      // Unauthenticated visitors reach /login or /register on first click
      return response;
    }

    // 4. Protected routes: unauthenticated users get sent to /login with sanitized redirect param
    if (!isAuthenticated) {
      const sanitizedBackPath = sanitizeRedirectPath(pathname + search, '/dashboard');
      return redirectTarget(request, '/login', `?redirect=${encodeURIComponent(sanitizedBackPath)}`);
    }

    // 5. Admin-only routes
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && profile.is_admin !== true && profile.role !== 'admin') {
        return redirectTarget(request, '/dashboard');
      }
    }

    return response;
  } catch (err) {
    console.error('[proxy] auth check failed:', err);
    return NextResponse.next();
  }
}

export const config: ProxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mjs|map|woff|woff2|ttf|otf)$).*)',
  ],
};
