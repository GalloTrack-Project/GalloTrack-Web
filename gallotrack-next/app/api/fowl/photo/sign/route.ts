import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CHICKEN_PHOTO_BUCKET, CHICKEN_PHOTO_SETUP_MESSAGE } from '@/lib/chicken-photo';
import { isOwnedChickenPhotoPath } from '@/lib/chicken-photo-path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MAX_PATHS = 100;
const SIGN_TTL_SECONDS = 60 * 60;

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  return user ?? null;
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const rawPaths = Array.isArray(body.paths)
    ? body.paths.filter((path): path is string => typeof path === 'string')
    : [];
  const paths = Array.from(new Set(rawPaths));
  if (paths.length === 0) {
    return NextResponse.json({ error: 'paths is required.' }, { status: 400 });
  }
  if (paths.length > MAX_PATHS) {
    return NextResponse.json(
      { error: `A maximum of ${MAX_PATHS} photo paths can be signed at once.` },
      { status: 400 },
    );
  }

  const invalid = paths.filter((path) => !isOwnedChickenPhotoPath(user.id, path));
  if (invalid.length > 0) {
    console.warn('[chicken-photo] rejected batch sign request', {
      userId: user.id,
      invalidPaths: invalid.length,
    });
    return NextResponse.json(
      { error: 'Forbidden: You do not own one or more of these photos.' },
      { status: 403 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const signedUrls: Record<string, string> = {};
  const errors: Record<string, string> = {};

  await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await admin.storage
        .from(CHICKEN_PHOTO_BUCKET)
        .createSignedUrl(path, SIGN_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        const message = error?.message ?? 'No signed URL returned';
        errors[path] = message;
        console.error('[chicken-photo] batch sign failed', {
          userId: user.id,
          path,
          error: message,
        });
        return;
      }
      signedUrls[path] = data.signedUrl;
    }),
  );

  if (Object.keys(signedUrls).length === 0) {
    const missing = Object.values(errors).some((message) =>
      /bucket|not found|exist/i.test(message),
    );
    return NextResponse.json(
      {
        error: missing ? CHICKEN_PHOTO_SETUP_MESSAGE : 'Photo could not be loaded.',
        errors,
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({
    signedUrls,
    ...(Object.keys(errors).length > 0 ? { errors } : {}),
  });
}
