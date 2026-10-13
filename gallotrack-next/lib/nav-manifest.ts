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
  /** Sidebar group label; consecutive items with the same group are grouped. */
  group: string;
};

/** Mobile bottom bar keeps this many primary items; the rest live under More. */
export const MOBILE_PRIMARY_COUNT = 4;

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
  { href: '/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, match: 'exact', group: 'Farm' },
  { href: '/profiling', label: 'Chicken Registry', shortLabel: 'Registry', icon: Dna, match: 'prefix', group: 'Farm' },
  { href: '/catalog', label: 'Chicken Inventory', shortLabel: 'Inventory', icon: ChickenIcon, match: 'prefix', group: 'Farm' },
  { href: '/lineage', label: 'Lineage Directory', shortLabel: 'Lineage', icon: TreePine, match: 'prefix', group: 'Farm' },
  { href: '/breeding', label: 'Breeding Hub', shortLabel: 'Breeding', icon: FlaskConical, match: 'prefix', group: 'Farm' },
  { href: '/marketplace', label: 'Marketplace', shortLabel: 'Market', icon: Store, match: 'prefix', group: 'Trade' },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User, match: 'prefix', group: 'Account' },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/dashboard', label: 'System Overview', shortLabel: 'Overview', icon: LayoutDashboard, match: 'exact', group: 'Console' },
  { href: '/admin', label: 'User Registry', shortLabel: 'Users', icon: Users, match: 'exact', group: 'Console' },
  { href: '/admin/settings', label: 'System Config', shortLabel: 'Config', icon: Settings, match: 'prefix', group: 'Console' },
  { href: '/profile', label: 'My Profile', shortLabel: 'Profile', icon: User, match: 'prefix', group: 'Account' },
];

/** Secondary admin pages: not sidebar items, but titled in the header. */
export const ADMIN_SUBPAGES: { href: string; label: string }[] = [
  { href: '/settings', label: 'Settings' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/flocks', label: 'Flocks' },
  { href: '/admin/matches', label: 'Match History' },
  { href: '/admin/marketplace', label: 'Marketplace' },
];

/** Deep links surfaced as quick actions in the global search palette. */
export type QuickAction = { id: string; label: string; hint: string; href: string };

export const OWNER_QUICK_ACTIONS: QuickAction[] = [
  { id: 'register', label: 'Register a chicken', hint: 'Registry form', href: '/profiling?tab=form' },
  { id: 'log-match', label: 'Log a match', hint: 'Match logs', href: '/profiling?tab=matchForm' },
  { id: 'fight-prospects', label: 'View Fight Prospects', hint: 'Registry tab', href: '/profiling?tab=offspring' },
  { id: 'breeders-stock', label: 'Browse Breeders Stock', hint: 'Inventory tab', href: '/catalog?status=active' },
  { id: 'ready-to-breed', label: 'View Ready to Breed', hint: 'Inventory tab', href: '/catalog?status=breeding' },
  { id: 'create-listing', label: 'Create a marketplace listing', hint: 'Marketplace', href: '/marketplace?tab=create' },
  { id: 'my-listings', label: 'Manage my listings', hint: 'Marketplace', href: '/marketplace?tab=my' },
];

export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { id: 'audit-logs', label: 'Open Audit Logs', hint: '/admin/audit-logs', href: '/admin/audit-logs' },
  { id: 'flocks', label: 'Open Flocks', hint: '/admin/flocks', href: '/admin/flocks' },
  { id: 'admin-matches', label: 'Open Match History', hint: '/admin/matches', href: '/admin/matches' },
  { id: 'admin-marketplace', label: 'Open Marketplace moderation', hint: '/admin/marketplace', href: '/admin/marketplace' },
];

export function isActiveNav(item: NavItem, pathname: string): boolean {
  if (item.match === 'exact') return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function findActiveNav(navItems: NavItem[], pathname: string): NavItem | undefined {
  return navItems.find((item) => isActiveNav(item, pathname));
}

/** Groups consecutive same-group items, preserving manifest order. */
export function groupNavItems(navItems: NavItem[]): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = [];
  for (const item of navItems) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
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
