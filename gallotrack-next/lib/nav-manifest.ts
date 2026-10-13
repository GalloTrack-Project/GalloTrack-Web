import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Dna,
  TreePine,
  User,
  Users,
  Settings,
  FlaskConical,
  Store,
} from 'lucide-react';
import ChickenIcon from '@/components/ChickenIcon';

/**
 * Single source of truth for dashboard navigation: which pages exist for
 * each role, what they are called, and how the active item is matched.
 * Sidebar rendering (groups, mobile sheet) is layered on top of this in
 * later phases; Phase 1 only consumes the flat arrays below.
 */

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  /** 'exact' matches only the bare path; 'prefix' also matches child paths. */
  match: 'exact' | 'prefix';
};

/** URL tab contracts per page. Values are shareable; ids must stay stable. */
export const REGISTRY_TABS = [
  'form',
  'males',
  'females',
  'archived',
  'deceased',
  'sireMaterial',
  'offspring',
  'matchForm',
  'breeds',
] as const;
export const INVENTORY_STATUS_TABS = [
  'all',
  'active',
  'breeding',
  'archived',
  'deceased',
] as const;
export const BREEDING_TABS = ['coding', 'pairs', 'identity', 'safety'] as const;
export const MARKETPLACE_TABS = ['browse', 'my', 'create'] as const;
/** Lineage already reads/writes these via window.location - documented, not rewired. */
export const LINEAGE_TABS = ['tree', 'families', 'sire', 'dam', 'pedigree'] as const;

export const OWNER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
  { href: '/profiling', label: 'Chicken Registry', shortLabel: 'Registry', icon: Dna, match: 'prefix' },
  { href: '/catalog', label: 'Chicken Inventory', shortLabel: 'Inventory', icon: ChickenIcon, match: 'prefix' },
  { href: '/lineage', label: 'Lineage Directory', shortLabel: 'Lineage', icon: TreePine, match: 'prefix' },
  { href: '/breeding', label: 'Breeding Hub', shortLabel: 'Breeding', icon: FlaskConical, match: 'prefix' },
  { href: '/marketplace', label: 'Marketplace', shortLabel: 'Market', icon: Store, match: 'prefix' },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User, match: 'prefix' },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'System Overview', shortLabel: 'Overview', icon: LayoutDashboard, match: 'exact' },
  { href: '/admin', label: 'User Registry', shortLabel: 'Users', icon: Users, match: 'exact' },
  { href: '/admin/settings', label: 'System Config', shortLabel: 'Config', icon: Settings, match: 'prefix' },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User, match: 'prefix' },
];

/** Secondary admin pages: not sidebar items, but titled in the header. */
export const ADMIN_SUBPAGES: { href: string; label: string }[] = [
  { href: '/settings', label: 'Settings' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/flocks', label: 'Flocks' },
  { href: '/admin/matches', label: 'Match History' },
  { href: '/admin/marketplace', label: 'Marketplace' },
];

export function isActiveNav(item: NavItem, pathname: string): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function findActiveNav(navItems: NavItem[], pathname: string): NavItem | undefined {
  return navItems.find((item) => isActiveNav(item, pathname));
}

export function getPageTitle(pathname: string): string {
  const subpage = ADMIN_SUBPAGES.find((page) =>
    page.href === '/settings' ? pathname === page.href : pathname.startsWith(page.href),
  );
  if (subpage) return subpage.label;
  return (
    pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'Dashboard'
  );
}
