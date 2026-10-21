import { redirect } from 'next/navigation';
import { sanitizeRedirectPath } from '@/lib/auth-redirect';

/**
 * Legacy URL: /match-logs/{id}
 *
 * Older links (and the "Edit match record" affordances that predate the
 * dedicated edit route) point here. There is no detail view at this path, so
 * instead of 404-ing we open the edit page and keep the page the user came
 * from, so Save and Cancel return to that page.
 */
export default async function LegacyMatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const rawReturnTo = typeof sp?.returnTo === 'string' ? sp.returnTo : null;
  const returnTo = sanitizeRedirectPath(rawReturnTo, '/match-logs');
  redirect(`/match-logs/${encodeURIComponent(id)}/edit?returnTo=${encodeURIComponent(returnTo)}`);
}
