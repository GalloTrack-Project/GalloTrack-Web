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
 * Recursively lists all concrete object paths under a prefix, handling pagination beyond 1000 objects.
 */
async function listAllFilePathsRecursively(
  admin: ReturnType<typeof getAdminClient>,
  bucket: string,
  prefix: string,
): Promise<{ paths: string[]; errors: string[] }> {
  const paths: string[] = [];
  const errors: string[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: items, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });

    if (error) {
      errors.push(`Failed to list in ${bucket}/${prefix}: ${error.message}`);
      break;
    }

    if (!items || items.length === 0) {
      break;
    }

    for (const item of items) {
      if (!item.name || item.name.startsWith('.')) continue;
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      // In Supabase storage, folders have id === null. Files always have a valid id or size.
      const isFolder = item.id === null;
      if (isFolder) {
        const sub = await listAllFilePathsRecursively(admin, bucket, fullPath);
        paths.push(...sub.paths);
        errors.push(...sub.errors);
      } else {
        paths.push(fullPath);
      }
    }

    if (items.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }

  return { paths, errors };
}

/**
 * GET: Returns accurate live counts for owner media files and breeding pairings.
 * Recursively traverses nested user folders (e.g., {user_id}/fowl/...).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const userId = user.id;

  try {
    const [pairingsRes, videosResult, photosResult, fowlImagesResult] = await Promise.all([
      admin.from('breeding_pairings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      listAllFilePathsRecursively(admin, 'match-videos', userId),
      listAllFilePathsRecursively(admin, 'match-photos', userId),
      listAllFilePathsRecursively(admin, 'fowl-images', userId),
    ]);

    const pairingsCount = pairingsRes.count ?? 0;
    const videoFiles = videosResult.paths.length;
    const photoFiles = photosResult.paths.length;
    const fowlImageFiles = fowlImagesResult.paths.length;
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
 * Recursively traverses nested folders ({user_id}/fowl/...) with pagination and removes
 * objects by full path in chunks of 1000. Never touches any other user's files or
 * un-prefixed directories (e.g. fowl-images/profiles/{user_id}/ is preserved).
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
      const { paths, errors: listErrors } = await listAllFilePathsRecursively(admin, bucket, userId);
      if (listErrors.length > 0) {
        errors.push(...listErrors);
      }

      if (paths.length === 0) continue;

      // Construct and strictly validate path prefixes
      const pathsToDelete: string[] = [];
      for (const objectPath of paths) {
        // Strict guard: verify path starts with userId and contains no traversal
        if (!objectPath.startsWith(`${userId}/`) || objectPath.includes('..')) {
          errors.push(`Refusing to delete unsafe path in ${bucket}: ${objectPath}`);
          continue;
        }
        pathsToDelete.push(objectPath);
      }

      // Delete in batches of 1000 (Supabase batch limit)
      const batchSize = 1000;
      for (let i = 0; i < pathsToDelete.length; i += batchSize) {
        const batch = pathsToDelete.slice(i, i + batchSize);
        const { data: removeData, error: removeError } = await admin.storage
          .from(bucket)
          .remove(batch);

        if (removeError) {
          errors.push(`Failed to delete batch of ${batch.length} files in ${bucket}: ${removeError.message}`);
        } else {
          removedCount += removeData?.length ?? batch.length;
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
