import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';

/**
 * Server-side sign-out. Clears the Supabase session cookies on the response
 * before sending the browser to /login, so the proxy cannot bounce the user
 * back to /dashboard with a stale cookie (which caused a redirect loop when the
 * client session expired while the server cookie was still valid).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const redirectTo = sanitizeRedirectPath(
    request.nextUrl.searchParams.get('redirect'),
    '/dashboard',
  );
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?redirect=${encodeURIComponent(redirectTo)}`;

  const response = NextResponse.redirect(url);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
  return response;
}
