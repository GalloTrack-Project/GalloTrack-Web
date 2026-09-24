import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi']);

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
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 413 });
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED.has(ext)) {
    return NextResponse.json({ error: 'Unsupported video format' }, { status: 415 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const objectPath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('match-videos')
    .upload(objectPath, buffer, { contentType: file.type || 'video/mp4', upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = admin.storage.from('match-videos').getPublicUrl(objectPath);
  return NextResponse.json({ url: data.publicUrl, path: objectPath });
}
