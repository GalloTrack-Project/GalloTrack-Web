import { supabase } from '@/lib/registry';
import { PRIVATE_STORAGE_BUCKETS, storagePathFromUrl } from '@/lib/media-format';

const SIGN_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a viewing session
const REFRESH_MARGIN_MS = 60 * 1000; // re-sign a minute before expiry
const signedCache = new Map<string, { url: string; expiresAt: number }>();
const pending = new Map<string, Promise<string>>();

/**
 * Resolve a stored media URL to something playable right now.
 *
 * Buckets that are private (`match-videos`, `match-photos`) are turned into
 * short-lived signed URLs for the logged-in owner; public/legacy buckets
 * (e.g. `fowl-images`) pass through unchanged. If signing fails we fall back
 * to the stored URL so a partially-applied migration never blanks the UI —
 * the viewer then surfaces its error state instead.
 */
export async function signMediaUrl(raw: string): Promise<string> {
  if (!raw) return raw;
  const parsed = storagePathFromUrl(raw);
  if (!parsed || !PRIVATE_STORAGE_BUCKETS.has(parsed.bucket)) return raw;

  const cached = signedCache.get(raw);
  if (cached && Date.now() < cached.expiresAt - REFRESH_MARGIN_MS) return cached.url;

  const inFlight = pending.get(raw);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.path, SIGN_TTL_SECONDS);
      if (error || !data?.signedUrl) return raw;
      signedCache.set(raw, { url: data.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
      return data.signedUrl;
    } catch {
      return raw;
    } finally {
      pending.delete(raw);
    }
  })();

  pending.set(raw, promise);
  return promise;
}

export async function signMediaUrls(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(urls.map((u) => (u ? signMediaUrl(u) : Promise.resolve(null))));
}
