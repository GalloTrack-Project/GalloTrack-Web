import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_BUCKETS = new Set(['match-photos', 'match-videos', 'fowl-images']);

export function extractStorageBucketAndPath(urlStr: string): { bucket: string; objectPath: string } | null {
  try {
    const url = new URL(urlStr);
    const m = url.pathname.match(
      /\/storage\/v1\/(?:object\/(?:public|sign)|render\/image\/public)\/([^/]+)\/(.+)$/
    );
    if (!m) return null;
    const bucket = m[1];
    const objectPath = decodeURIComponent(m[2]);
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

export function validateStorageTarget(
  bucket: string,
  objectPath: string,
  userId: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return { valid: false, error: `Bucket "${bucket}" is not in the allowed bucket list.` };
  }
  if (!objectPath || objectPath.includes('..') || objectPath.startsWith('/')) {
    return { valid: false, error: 'Invalid object path.' };
  }
  // Enforce that path is under the authenticated user's folder (or legacy fowl/ folder)
  const segments = objectPath.split('/');
  if (segments[0] !== userId && segments[0] !== 'fowl') {
    return { valid: false, error: 'Object path does not belong to the authenticated user.' };
  }
  return { valid: true };
}

export async function DELETE(request: NextRequest) {
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

  let body: { mediaType?: 'photo' | 'video'; mediaId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const { mediaType, mediaId } = body;
  if (!mediaType || (mediaType !== 'photo' && mediaType !== 'video') || typeof mediaId !== 'number') {
    return NextResponse.json({ error: 'mediaType ("photo"|"video") and numeric mediaId are required.' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch DB row
  const tableName = mediaType === 'video' ? 'match_videos' : 'match_photos';
  const { data: mediaRow, error: fetchMediaError } = await admin
    .from(tableName)
    .select('*')
    .eq('id', mediaId)
    .single();

  if (fetchMediaError || !mediaRow) {
    return NextResponse.json({ error: `Media record #${mediaId} not found.` }, { status: 404 });
  }

  // 2. Verify match ownership
  const { data: matchRow, error: fetchMatchError } = await admin
    .from('match')
    .select('id, user_id')
    .eq('id', mediaRow.match_id)
    .single();

  if (fetchMatchError || !matchRow) {
    return NextResponse.json({ error: 'Associated match record not found.' }, { status: 404 });
  }

  if (matchRow.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden: You do not own this match record.' }, { status: 403 });
  }

  // 3. Extract and validate storage target
  const mainTarget = extractStorageBucketAndPath(mediaRow.url);
  if (!mainTarget) {
    return NextResponse.json({ error: 'Could not resolve storage target from media URL.' }, { status: 400 });
  }

  const targetValidation = validateStorageTarget(mainTarget.bucket, mainTarget.objectPath, user.id);
  if (!targetValidation.valid) {
    return NextResponse.json({ error: targetValidation.error || 'Invalid storage target.' }, { status: 400 });
  }

  // 4. Remove physical file from storage FIRST
  const { error: storageRemoveError } = await admin.storage
    .from(mainTarget.bucket)
    .remove([mainTarget.objectPath]);

  if (storageRemoveError) {
    console.error(`Storage deletion failed for ${mainTarget.bucket}/${mainTarget.objectPath}:`, storageRemoveError);
    return NextResponse.json(
      { error: `Storage removal failed: ${storageRemoveError.message}. DB record preserved.` },
      { status: 500 }
    );
  }

  // 5. If video has poster_url, attempt removing poster as well
  if (mediaType === 'video' && mediaRow.poster_url) {
    const posterTarget = extractStorageBucketAndPath(mediaRow.poster_url);
    if (posterTarget && ALLOWED_BUCKETS.has(posterTarget.bucket)) {
      const posterVal = validateStorageTarget(posterTarget.bucket, posterTarget.objectPath, user.id);
      if (posterVal.valid) {
        await admin.storage.from(posterTarget.bucket).remove([posterTarget.objectPath]);
      }
    }
  }

  // 6. Delete DB row ONLY AFTER storage removal succeeds
  const { error: dbDeleteError } = await admin
    .from(tableName)
    .delete()
    .eq('id', mediaId);

  if (dbDeleteError) {
    console.error(`DB deletion failed for ${tableName} id=${mediaId}:`, dbDeleteError);
    return NextResponse.json(
      { error: `Storage file removed, but DB record deletion failed: ${dbDeleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deletedId: mediaId });
}
