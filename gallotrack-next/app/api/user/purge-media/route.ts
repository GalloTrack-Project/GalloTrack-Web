import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MEDIA_BUCKETS = {
  match: ['match-videos', 'match-photos'] as const,
  fowl: ['fowl-images'] as const,
  all: ['match-videos', 'match-photos', 'fowl-images'] as const,
};

function getAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  return user;
}

/**
 * GET: Returns accurate live counts for owner media files and breeding pairings.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const userId = user.id;

  try {
    const [pairingsRes, videosRes, photosRes, fowlImagesRes] = await Promise.all([
      admin.from('breeding_pairings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      admin.storage.from('match-videos').list(userId),
      admin.storage.from('match-photos').list(userId),
      admin.storage.from('fowl-images').list(userId),
    ]);

    const pairingsCount = pairingsRes.count ?? 0;
    const videoFiles = (videosRes.data || []).filter((f) => !f.name.startsWith('.')).length;
    const photoFiles = (photosRes.data || []).filter((f) => !f.name.startsWith('.')).length;
    const fowlImageFiles = (fowlImagesRes.data || []).filter((f) => !f.name.startsWith('.')).length;
    const totalMedia = videoFiles + photoFiles + fowlImageFiles;

    return NextResponse.json({
      pairingsCount,
      mediaCounts: {
        videos: videoFiles,
        photos: photoFiles,
        fowlImages: fowlImageFiles,
        total: totalMedia,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to query owner media counts' },
      { status: 500 }
    );
  }
}

/**
 * POST: Purges storage media files strictly under the authenticated user's prefix.
 * Never touches any other user's files or un-prefixed directories.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { scope?: 'match' | 'fowl' | 'all' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const scope = body.scope;
  if (!scope || (scope !== 'match' && scope !== 'fowl' && scope !== 'all')) {
    return NextResponse.json({ error: 'Scope must be "match", "fowl", or "all"' }, { status: 400 });
  }

  const admin = getAdminClient();
  const userId = user.id;
  const buckets = MEDIA_BUCKETS[scope];

  let removedCount = 0;
  const errors: string[] = [];

  for (const bucket of buckets) {
    try {
      const { data: files, error: listError } = await admin.storage.from(bucket).list(userId);
      if (listError) {
        errors.push(`Failed to list files in ${bucket}/${userId}: ${listError.message}`);
        continue;
      }

      if (!files || files.length === 0) continue;

      // Construct and strictly validate path prefixes
      const pathsToDelete: string[] = [];
      for (const file of files) {
        if (!file.name || file.name.startsWith('.')) continue;
        const objectPath = `${userId}/${file.name}`;
        // Strict guard: verify path starts with userId and contains no traversal
        if (!objectPath.startsWith(`${userId}/`) || objectPath.includes('..')) {
          errors.push(`Refusing to delete unsafe path in ${bucket}: ${objectPath}`);
          continue;
        }
        pathsToDelete.push(objectPath);
      }

      if (pathsToDelete.length > 0) {
        const { data: removeData, error: removeError } = await admin.storage
          .from(bucket)
          .remove(pathsToDelete);

        if (removeError) {
          errors.push(`Failed to delete files in ${bucket}: ${removeError.message}`);
        } else {
          removedCount += removeData?.length ?? pathsToDelete.length;
        }
      }
    } catch (bucketErr: unknown) {
      errors.push(`Error purging ${bucket}: ${bucketErr instanceof Error ? bucketErr.message : String(bucketErr)}`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    removedCount,
    errors,
  });
}
