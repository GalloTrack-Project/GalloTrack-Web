/**
 * @deprecated Marketplace has been deprecated and removed from GalloTrack.
 * This route is kept as a redirect stub to avoid broken links.
 */
import { redirect } from 'next/navigation';

export default function MarketplaceDeprecatedPage() {
  redirect('/dashboard');
}
