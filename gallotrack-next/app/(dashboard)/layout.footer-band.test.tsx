import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const currentPath = vi.hoisted(() => ({ value: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => currentPath.value,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ setShowLogoutModal: vi.fn() }),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    isAdmin: false,
    avatarUrl: null,
    adminName: 'Test User',
    userActive: true,
  }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ loadError: null, fetchDatabaseResources: vi.fn() }),
}));

vi.mock('@/lib/contexts/system-config-nav', () => ({
  SystemConfigNavProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/contexts/notification-context', () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
  useNotificationUnreadCount: () => 0,
}));

vi.mock('@/components/nav/GlobalSearch', () => ({ default: () => null }));
vi.mock('@/components/nav/NotificationBell', () => ({ default: () => null }));
vi.mock('@/components/nav/SystemConfigSidebarItem', () => ({ default: () => null }));
vi.mock('@/components/dashboard/DashboardHeaderActions', () => ({ default: () => null }));
vi.mock('@/components/i18n/LanguageSwitcher', () => ({
  CompactLanguageSwitcher: () => null,
}));
vi.mock('./wrappers', () => ({ ModalsWrapper: () => null }));

import DashboardLayout from './layout';

const routes = [
  '/dashboard',
  '/profiling',
  '/breeds',
  '/catalog',
  '/lineage',
  '/breeding',
  '/notifications',
  '/profile',
  '/settings',
  '/milestones',
  '/admin',
  '/admin/users',
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

describe('DashboardLayout footer band', () => {
  it.each(routes)('renders exactly one footer band for %s', (path) => {
    currentPath.value = path;
    const { unmount } = render(
      <DashboardLayout>
        <div data-testid="route-content">{path}</div>
      </DashboardLayout>,
    );

    const main = screen.getByRole('main');
    const footerBands = within(main).getAllByTestId('footer-band');
    expect(footerBands).toHaveLength(1);

    const content = within(main).getByTestId('route-content');
    const footer = footerBands[0];
    expect(content.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(footer.className).toContain('hidden');
    expect(footer.className).toContain('md:flex');
    expect(footer.className).toContain('[@media(max-height:700px)]:hidden');
    expect(footer).toHaveAttribute('aria-hidden', 'true');

    const sidebar = document.querySelector('aside');
    expect(sidebar).not.toBeNull();
    expect(within(sidebar as HTMLElement).getAllByText(/Track · Breed · Excel/i)).toHaveLength(1);

    unmount();
  });

  it('renders exactly one band across every Lineage Directory and Breeding Hub tab', () => {
    const tabSets: Array<[string, string[]]> = [
      [
        '/lineage',
        [
          'Family Tree',
          'Full Siblings & Families',
          'Sire Offspring Tree',
          'Dam Offspring Tree',
          'Pedigree / Ancestors',
        ],
      ],
      [
        '/breeding',
        ['Coding System', 'Breeding Pairs', 'Chicken Identity', 'Safety Incidents'],
      ],
    ];

    for (const [path, tabs] of tabSets) {
      currentPath.value = path;
      for (const tab of tabs) {
        const { unmount } = render(
          <DashboardLayout>
            <div data-testid="route-content">{tab}</div>
          </DashboardLayout>,
        );
        expect(within(screen.getByRole('main')).getAllByTestId('footer-band')).toHaveLength(1);
        unmount();
      }
    }
  });

  it('keeps the layout content column flexible so short pages keep the band at the bottom', () => {
    currentPath.value = '/settings';
    const { unmount } = render(
      <DashboardLayout>
        <div data-testid="route-content">short page</div>
      </DashboardLayout>,
    );

    const main = screen.getByRole('main');
    const column = within(main).getByTestId('route-content').parentElement?.parentElement;
    expect(column).toHaveClass('flex', 'min-h-full', 'flex-col');
    expect(within(main).getByTestId('route-content').parentElement).toHaveClass('flex-1');
    unmount();
  });

  it('never imports FooterBand from a page or feature component', () => {
    const root = process.cwd();
    const layoutPath = join(root, 'app', '(dashboard)', 'layout.tsx');
    const files = [...walk(join(root, 'app')), ...walk(join(root, 'components'))].filter(
      (file) =>
        /\.(tsx?|jsx?)$/.test(file) &&
        !/\.test\.(tsx?|jsx?)$/.test(file) &&
        file !== layoutPath &&
        !file.endsWith(join('components', 'layout', 'FooterBand.tsx')),
    );

    const offenders = files.filter((file) =>
      /from\s+['"]@\/components\/layout\/FooterBand['"]/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders.map((file) => relative(root, file))).toEqual([]);
  });
});
