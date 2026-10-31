import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MobileNav from './MobileNav';
import { OWNER_NAV, ADMIN_NAV } from '@/lib/nav-manifest';
import { SystemConfigNavProvider } from '@/lib/contexts/system-config-nav';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}));

function renderNav(ui: React.ReactElement) {
  return render(<SystemConfigNavProvider>{ui}</SystemConfigNavProvider>);
}

describe('MobileNav', () => {
  it('shows 4 primary owner items plus a More button', () => {
    renderNav(<MobileNav navItems={OWNER_NAV} pathname="/dashboard" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Registry' })).toHaveAttribute('href', '/profiling');
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/catalog');
    expect(screen.getByRole('link', { name: 'Lineage' })).toHaveAttribute('href', '/lineage');
    expect(screen.queryByRole('link', { name: 'Breeding' })).toBeNull();
    expect(screen.getByRole('button', { name: 'More navigation pages' })).toBeInTheDocument();
  });

  it('More dialog lists the overflow items and closes on select', () => {
    renderNav(<MobileNav navItems={OWNER_NAV} pathname="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: 'More navigation pages' }));
    const dialog = screen.getByRole('dialog', { name: 'More' });
    expect(dialog).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/breeding', '/profile']),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Breeding Hub' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks the active primary item with aria-current', () => {
    renderNav(<MobileNav navItems={OWNER_NAV} pathname="/profiling" />);
    expect(screen.getByRole('link', { name: 'Registry' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('opens the System Config section sheet for admins', () => {
    renderNav(<MobileNav navItems={ADMIN_NAV} pathname="/dashboard" />);
    expect(screen.queryByRole('button', { name: 'More navigation pages' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Config' }));
    const dialog = screen.getByRole('dialog', { name: 'System Config' });

    expect(within(dialog).getByRole('link', { name: 'General' })).toHaveAttribute(
      'href',
      '/admin/settings?section=general',
    );
    expect(within(dialog).getByRole('link', { name: 'Alerts' })).toHaveAttribute(
      'href',
      '/admin/settings?section=alerts',
    );
    expect(within(dialog).getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Transfer' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Backup' })).toBeInTheDocument();
  });

  it('marks More as active when the current page lives in the overflow', () => {
    renderNav(<MobileNav navItems={OWNER_NAV} pathname="/profile" />);
    expect(screen.getByRole('button', { name: 'More navigation pages' })).toHaveAttribute('data-active', 'true');
  });
});
