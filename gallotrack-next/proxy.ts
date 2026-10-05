import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest, type ProxyConfig } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const PUBLIC_PATHS = new Set(['/', '/register', '/design-kit']);
const PUBLIC_PREFIXES = ['/auth', '/share', '/api', '/_next'];

const STATIC_EXTENSIONS = [
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'css', 'js',
  'mjs', 'map', 'woff', 'woff2', 'ttf', 'otf', 'txt', 'xml', 'webmanifest',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;

  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex > 0) {
    const extension = lastSegment.slice(dotIndex + 1).toLowerCase();
    if (STATIC_EXTENSIONS.includes(extension)) return true;
  }

  return false;
}

function redirectTarget(request: NextRequest, destination: string, search = ''): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = search;
  return NextResponse.redirect(url);
}

/**
 * Server-side route guard for the GalloTrack dashboard.
 *
 * - Unauthenticated requests to owner/admin screens are sent to the login page
 *   with a `?redirect=` back-link.
 * - `/admin/*` is additionally restricted to profiles flagged as admin.
 *
 * Data itself is still protected by Supabase RLS — this only removes the
 * client-side-only owner/admin separation.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (!supabaseUrl || !supabaseAnonKey || isPublicPath(pathname)) {
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

    if (error || !data.user) {
      return redirectTarget(request, '/', `?redirect=${encodeURIComponent(pathname + search)}`);
    }

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
