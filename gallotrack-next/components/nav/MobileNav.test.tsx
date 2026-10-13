import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileNav from './MobileNav';
import { OWNER_NAV, ADMIN_NAV } from '@/lib/nav-manifest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('MobileNav', () => {
  it('shows 4 primary owner items plus a More button', () => {
    render(<MobileNav navItems={OWNER_NAV} pathname="/dashboard" />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Registry' })).toHaveAttribute('href', '/profiling');
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/catalog');
    expect(screen.getByRole('link', { name: 'Lineage' })).toHaveAttribute('href', '/lineage');
    expect(screen.queryByRole('link', { name: 'Breeding' })).toBeNull();
    expect(screen.getByRole('button', { name: 'More navigation pages' })).toBeInTheDocument();
  });

  it('More dialog lists the overflow items and closes on select', () => {
    render(<MobileNav navItems={OWNER_NAV} pathname="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: 'More navigation pages' }));
    const dialog = screen.getByRole('dialog', { name: 'More' });
    expect(dialog).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/breeding', '/marketplace', '/profile']),
    );
    fireEvent.click(screen.getByRole('link', { name: 'Breeding Hub' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks the active primary item with aria-current', () => {
    render(<MobileNav navItems={OWNER_NAV} pathname="/profiling" />);
    expect(screen.getByRole('link', { name: 'Registry' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('hides More for admin nav, which fits in the primary slots', () => {
    render(<MobileNav navItems={ADMIN_NAV} pathname="/dashboard" />);
    expect(screen.queryByRole('button', { name: 'More navigation pages' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Config' })).toHaveAttribute('href', '/admin/settings');
  });

  it('marks More as active when the current page lives in the overflow', () => {
    render(<MobileNav navItems={OWNER_NAV} pathname="/marketplace" />);
    expect(screen.getByRole('button', { name: 'More navigation pages' })).toHaveAttribute('data-active', 'true');
  });
});
