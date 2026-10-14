import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  OWNER_NAV,
  ADMIN_NAV,
  ADMIN_SUBPAGES,
  REGISTRY_TABS,
  INVENTORY_STATUS_TABS,
  BREEDING_TABS,
  MARKETPLACE_TABS,
  LINEAGE_TABS,
  MOBILE_PRIMARY_COUNT,
  isActiveNav,
  findActiveNav,
  groupNavItems,
  getPageTitle,
} from './nav-manifest';

const appDir = path.join(__dirname, '..', 'app', '(dashboard)');

describe('nav-manifest', () => {
  it('owner nav uses the final agreed labels', () => {
    const labels = OWNER_NAV.map((item) => item.label);
    expect(labels).toContain('Chicken Registry');
    expect(labels).toContain('Chicken Inventory');
    expect(labels).not.toContain('Marketplace');
    expect(labels).toContain('Breeding Hub');
    expect(labels).toContain('Lineage Directory');
    expect(labels).not.toContain('Fight Prospects'); // registry-internal label, not a page
  });

  it('every owner href has a page.tsx', () => {
    for (const item of OWNER_NAV) {
      expect(fs.existsSync(path.join(appDir, item.href, 'page.tsx')), `missing page for ${item.href}`).toBe(true);
    }
  });

  it('every admin nav and admin subpage href has a page.tsx', () => {
    for (const item of ADMIN_NAV) {
      expect(fs.existsSync(path.join(appDir, item.href, 'page.tsx')), `missing page for ${item.href}`).toBe(true);
    }
    for (const sub of ADMIN_SUBPAGES) {
      expect(fs.existsSync(path.join(appDir, sub.href, 'page.tsx')), `missing page for ${sub.href}`).toBe(true);
    }
  });

  it('hrefs are unique within each nav list', () => {
    expect(new Set(OWNER_NAV.map((i) => i.href)).size).toBe(OWNER_NAV.length);
    expect(new Set(ADMIN_NAV.map((i) => i.href)).size).toBe(ADMIN_NAV.length);
  });

  it('admin nav keeps its final labels', () => {
    expect(ADMIN_NAV.map((i) => i.label)).toEqual([
      'System Overview',
      'User Registry',
      'System Config',
      'My Profile',
    ]);
  });

  it('isActiveNav honours exact vs prefix matching', () => {
    const admin = ADMIN_NAV.find((i) => i.href === '/admin')!;
    expect(isActiveNav(admin, '/admin')).toBe(true);
    expect(isActiveNav(admin, '/admin/flocks')).toBe(false);
    const dashboard = OWNER_NAV.find((i) => i.href === '/dashboard')!;
    expect(isActiveNav(dashboard, '/dashboard')).toBe(true);
    const profiling = OWNER_NAV.find((i) => i.href === '/profiling')!;
    expect(isActiveNav(profiling, '/profiling')).toBe(true);
  });

  it('findActiveNav picks the first matching item', () => {
    expect(findActiveNav(OWNER_NAV, '/profiling')?.label).toBe('Chicken Registry');
    expect(findActiveNav(OWNER_NAV, '/nowhere')).toBeUndefined();
  });

  it('getPageTitle resolves known admin subpages and falls back to the last path segment', () => {
    expect(getPageTitle('/admin/audit-logs')).toBe('Audit Logs');
    expect(getPageTitle('/admin/flocks')).toBe('Flocks');
    expect(getPageTitle('/admin/matches')).toBe('Match History');
    expect(getPageTitle('/admin/marketplace')).toBe('Marketplace');
    expect(getPageTitle('/settings')).toBe('Settings');
    expect(getPageTitle('/catalog')).toBe('Catalog');
    expect(getPageTitle('/')).toBe('Dashboard');
  });

  it('tab contracts contain the ids the components actually use', () => {
    // Registry: form + 5 RegistryNav tabs + archived/deceased lists + breeds
    expect(REGISTRY_TABS).toContain('males');
    expect(REGISTRY_TABS).toContain('offspring');
    expect(REGISTRY_TABS).toContain('matchForm');
    expect(REGISTRY_TABS).toContain('sireMaterial');
    expect(REGISTRY_TABS).toContain('archived');
    expect(REGISTRY_TABS).toContain('deceased');
    expect(REGISTRY_TABS).toContain('breeds');
    // Legacy 'match' renders nothing - deliberately excluded
    expect(REGISTRY_TABS).not.toContain('match');
    expect([...INVENTORY_STATUS_TABS]).toEqual(['all', 'active', 'breeding', 'archived', 'deceased']);
    expect([...BREEDING_TABS]).toEqual(['coding', 'pairs', 'identity', 'safety']);
    expect([...MARKETPLACE_TABS]).toEqual(['browse', 'my', 'create']);
    expect([...LINEAGE_TABS]).toEqual(['tree', 'families', 'sire', 'dam', 'pedigree']);
  });

  it('groups consecutive sidebar items by their group label', () => {
    const ownerGroups = groupNavItems(OWNER_NAV);
    expect(ownerGroups.map((g) => g.group)).toEqual(['Farm', 'Account']);
    expect(ownerGroups[0].items.map((i) => i.href)).toEqual([
      '/dashboard',
      '/profiling',
      '/catalog',
      '/lineage',
      '/breeding',
    ]);
    expect(ownerGroups[1].items.map((i) => i.href)).toEqual(['/profile']);
    const adminGroups = groupNavItems(ADMIN_NAV);
    expect(adminGroups.map((g) => g.group)).toEqual(['Console', 'Account']);
  });

  it('keeps 4 primary mobile items so owner nav needs a More overflow', () => {
    expect(MOBILE_PRIMARY_COUNT).toBe(4);
    expect(OWNER_NAV.length).toBeGreaterThan(MOBILE_PRIMARY_COUNT);
    expect(ADMIN_NAV.length).toBe(MOBILE_PRIMARY_COUNT);
  });
});
