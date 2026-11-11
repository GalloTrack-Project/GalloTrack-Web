import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sniffImageKind } from '@/lib/media-format';
import {
  CHICKEN_PHOTO_BUCKET,
  CHICKEN_PHOTO_SETUP_MESSAGE,
  CHICKEN_PHOTO_MAX_BYTES,
} from '@/lib/chicken-photo';
import { isOwnedChickenPhotoPath } from '@/lib/chicken-photo-path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CONTENT_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

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

function validateImage(file: File): string | null {
  if (file.size <= 0) return 'The selected photo is empty. Choose another image.';
  if (file.size > CHICKEN_PHOTO_MAX_BYTES) return 'Photo must be 5 MB or smaller.';
  const name = file.name.toLowerCase();
  const extensionOk = /\.(jpe?g|png|webp)$/.test(name);
  const typeOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (!extensionOk && !typeOk) return 'Choose a JPG, PNG or WebP image.';
  return null;
}

async function imageKind(file: File): Promise<string | null> {
  try {
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    return sniffImageKind(head);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 });
  }

  if (!isOwnedChickenPhotoPath(user.id, path)) {
    console.warn('[chicken-photo] rejected sign request', {
      userId: user.id,
      path,
    });
    return NextResponse.json(
      { error: 'Forbidden: You do not own this photo.' },
      { status: 403 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin.storage
    .from(CHICKEN_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    console.error('[chicken-photo] sign failed', {
      userId: user.id,
      path,
      error: error?.message ?? 'No signed URL returned',
    });
    const missing = /bucket|not found|exist/i.test(error?.message ?? '');
    return NextResponse.json(
      { error: missing ? CHICKEN_PHOTO_SETUP_MESSAGE : 'Photo could not be loaded.' },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const fowlId = Number(form.get('fowlId'));
  const photo = form.get('photo');
  const thumbnail = form.get('thumbnail');
  if (!Number.isInteger(fowlId) || fowlId <= 0 || !(photo instanceof File) || !(thumbnail instanceof File)) {
    return NextResponse.json({ error: 'fowlId, photo and thumbnail are required' }, { status: 400 });
  }

  for (const file of [photo, thumbnail]) {
    const metaError = validateImage(file);
    if (metaError) {
      console.warn('[chicken-photo] rejected upload metadata', {
        fowlId,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        error: metaError,
      });
      return NextResponse.json(
        { error: metaError },
        { status: metaError.includes('too large') || metaError.includes('5 MB') ? 413 : 415 },
      );
    }
    const kind = await imageKind(file);
    if (!kind || !CONTENT_TYPES[kind]) {
      console.warn('[chicken-photo] rejected unrecognized image', {
        fowlId,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
      });
      return NextResponse.json(
        { error: 'The selected photo is not a recognized JPG, PNG or WebP image.' },
        { status: 415 },
      );
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: fowl, error: fowlError } = await admin
    .from('fowl')
    .select('id, user_id')
    .eq('id', fowlId)
    .single();
  if (fowlError || !fowl || fowl.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden: You do not own this chicken.' }, { status: 403 });
  }

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const folder = `${user.id}/${fowlId}`;
  const fullPath = `${folder}/${stamp}-full.webp`;
  const thumbPath = `${folder}/${stamp}-thumb.webp`;
  const uploaded: string[] = [];

  const uploadOne = async (path: string, file: File) => {
    const kind = await imageKind(file);
    const contentType = CONTENT_TYPES[kind || ''] || 'image/webp';
    const buffer = Buffer.from(await file.arrayBuffer());
    return admin.storage.from(CHICKEN_PHOTO_BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });
  };

  const fullUpload = await uploadOne(fullPath, photo);
  if (fullUpload.error) {
    console.error('[chicken-photo] full upload failed', {
      fowlId,
      userId: user.id,
      fileName: photo.name,
      size: photo.size,
      mimeType: photo.type,
      path: fullPath,
      error: fullUpload.error.message,
    });
    const missing = /bucket|not found|exist/i.test(fullUpload.error.message);
    return NextResponse.json(
      { error: missing ? CHICKEN_PHOTO_SETUP_MESSAGE : fullUpload.error.message },
      { status: missing ? 503 : 500 },
    );
  }
  uploaded.push(fullPath);

  const thumbUpload = await uploadOne(thumbPath, thumbnail);
  if (thumbUpload.error) {
    console.error('[chicken-photo] thumbnail upload failed', {
      fowlId,
      userId: user.id,
      fileName: thumbnail.name,
      size: thumbnail.size,
      mimeType: thumbnail.type,
      path: thumbPath,
      error: thumbUpload.error.message,
    });
    await admin.storage.from(CHICKEN_PHOTO_BUCKET).remove(uploaded);
    const missing = /bucket|not found|exist/i.test(thumbUpload.error.message);
    return NextResponse.json(
      { error: missing ? CHICKEN_PHOTO_SETUP_MESSAGE : thumbUpload.error.message },
      { status: missing ? 503 : 500 },
    );
  }
  uploaded.push(thumbPath);

  return NextResponse.json({ fullPath, thumbPath, bucket: CHICKEN_PHOTO_BUCKET });
}

export async function DELETE(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { fowlId?: number; paths?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const fowlId = Number(body.fowlId);
  const paths = Array.isArray(body.paths) ? body.paths.filter((path) => typeof path === 'string') : [];
  if (!Number.isInteger(fowlId) || fowlId <= 0 || paths.length === 0) {
    return NextResponse.json({ error: 'fowlId and paths are required.' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: fowl, error: fowlError } = await admin
    .from('fowl')
    .select('id, user_id')
    .eq('id', fowlId)
    .single();
  if (fowlError || !fowl || fowl.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden: You do not own this chicken.' }, { status: 403 });
  }

  const prefix = `${user.id}/${fowlId}/`;
  const safePaths = paths.filter(
    (path) =>
      path.startsWith(prefix) &&
      !path.includes('..') &&
      !path.slice(prefix.length).includes('/'),
  );
  if (safePaths.length === 0) {
    return NextResponse.json({ error: 'No valid photo paths supplied.' }, { status: 400 });
  }

  const { error } = await admin.storage.from(CHICKEN_PHOTO_BUCKET).remove(safePaths);
  if (error) {
    const missing = /bucket|not found|exist/i.test(error.message);
    return NextResponse.json(
      { error: missing ? CHICKEN_PHOTO_SETUP_MESSAGE : error.message },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({ success: true });
}
