import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sniffImageKind, validatePhotoFileMeta } from '@/lib/media-format';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CONTENT_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

// Match photos are uploaded through this route (not straight from the browser)
// so the type and size are validated server-side against the file's actual
// bytes, and every object lands in the private `match-photos` bucket under the
// caller's own folder.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const metaError = validatePhotoFileMeta({ name: file.name, size: file.size });
  if (metaError) {
    const status = metaError.includes('too large') ? 413 : 415;
    return NextResponse.json({ error: metaError }, { status });
  }

  let kind: string | null = null;
  try {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    kind = sniffImageKind(head);
  } catch {
    kind = null;
  }
  if (!kind) {
    return NextResponse.json(
      { error: `"${file.name}" is not a recognized image file (the contents don't match an image format).` },
      { status: 415 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const objectPath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${kind === 'jpeg' ? 'jpg' : kind}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('match-photos')
    .upload(objectPath, buffer, { contentType: CONTENT_TYPES[kind] || 'application/octet-stream', upsert: false });

  if (uploadError) {
    const missingBucket = /bucket/i.test(uploadError.message) && /not found|exist/i.test(uploadError.message);
    return NextResponse.json(
      { error: missingBucket ? `${uploadError.message} — run supabase/migrations/20261008000000_match_media_privacy.sql first.` : uploadError.message },
      { status: 500 }
    );
  }

  const { data } = admin.storage.from('match-photos').getPublicUrl(objectPath);
  // Locator only — readers sign it (lib/media-privacy.ts); bucket is private.
  return NextResponse.json({ url: data.publicUrl, path: objectPath, kind });
}
