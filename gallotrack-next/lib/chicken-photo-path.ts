/**
 * Storage paths for chicken photos are always `<user_id>/<fowl_id>/<file>`.
 * The first folder must match the authenticated user so one owner can never
 * read another owner's private photo.
 */
export function isOwnedChickenPhotoPath(userId: string, path: string): boolean {
  if (!userId || !path) return false;
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return Boolean(rest) && !path.includes('..') && !rest.startsWith('/');
}
