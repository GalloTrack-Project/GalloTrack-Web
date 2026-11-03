import { supabase } from '@/lib/registry';
import { CHICKEN_PHOTO_SETUP_MESSAGE, isChickenPhotoSetupError } from '@/lib/chicken-photo';

export type ChickenPhotoUploadResult = {
  fullPath?: string;
  thumbPath?: string;
  error?: string;
};

export async function uploadChickenPhoto(
  fowlId: number,
  full: File,
  thumbnail: File,
  onProgress?: (percent: number) => void,
): Promise<ChickenPhotoUploadResult> {
  if (!Number.isFinite(fowlId) || fowlId <= 0) {
    return { error: 'Save the chicken before adding a photo.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const form = new FormData();
  form.append('fowlId', String(fowlId));
  form.append('photo', full);
  form.append('thumbnail', thumbnail);

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/fowl/photo');
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      let body: { fullPath?: string; thumbPath?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response; keep the generic status message below.
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.fullPath && body.thumbPath) {
        onProgress?.(100);
        resolve({ fullPath: body.fullPath, thumbPath: body.thumbPath });
        return;
      }
      const message = body.error || `Photo upload failed (${xhr.status}).`;
      resolve({ error: isChickenPhotoSetupError(message) ? CHICKEN_PHOTO_SETUP_MESSAGE : message });
    };
    xhr.onerror = () => resolve({ error: 'Network error during photo upload.' });
    xhr.onabort = () => resolve({ error: 'Photo upload was cancelled.' });
    xhr.send(form);
  });
}

export async function deleteChickenPhotoPaths(
  fowlId: number,
  paths: Array<string | null | undefined>,
): Promise<{ error?: string }> {
  const clean = Array.from(new Set(paths.filter((path): path is string => Boolean(path))));
  if (clean.length === 0) return {};

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  try {
    const response = await fetch('/api/fowl/photo', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fowlId, paths: clean }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error || `Photo cleanup failed (${response.status}).`;
      return { error: isChickenPhotoSetupError(message) ? CHICKEN_PHOTO_SETUP_MESSAGE : message };
    }
    return {};
  } catch {
    return { error: 'Network error while removing the previous photo.' };
  }
}
