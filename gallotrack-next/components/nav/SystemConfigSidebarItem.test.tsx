import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import SystemConfigSidebarItem from './SystemConfigSidebarItem';
import {
  SystemConfigNavProvider,
  useSystemConfigNav,
} from '@/lib/contexts/system-config-nav';
import { ADMIN_NAV } from '@/lib/nav-manifest';
import type { SystemConfigSection } from '@/lib/system-config-nav';

const navigation = vi.hoisted(() => ({
  pathname: '/admin',
  push: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));

const configItem = ADMIN_NAV.find((item) => item.href === '/admin/settings')!;

function Harness({
  dirty = false,
  section = 'general',
  onDiscard,
}: {
  dirty?: boolean;
  section?: SystemConfigSection;
  onDiscard?: () => void;
}) {
  const { setDirty, setActiveSection, setDiscardHandler } = useSystemConfigNav();

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  useEffect(() => {
    setActiveSection(section);
  }, [section, setActiveSection]);

  useEffect(() => {
    setDiscardHandler(onDiscard ?? null);
    return () => setDiscardHandler(null);
  }, [onDiscard, setDiscardHandler]);

  return <SystemConfigSidebarItem item={configItem} />;
}

function renderItem(props: Parameters<typeof Harness>[0] = {}) {
  return render(
    <SystemConfigNavProvider>
      <Harness {...props} />
    </SystemConfigNavProvider>,
  );
}

describe('SystemConfigSidebarItem', () => {
  beforeEach(() => {
    navigation.pathname = '/admin';
    navigation.push.mockClear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('expands the submenu and opens General when first opened', () => {
    renderItem();
    const parent = screen.getByRole('button', { name: 'System Config' });

    expect(parent).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(parent);

    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute(
      'href',
      '/admin/settings?section=general',
    );
    expect(navigation.push).toHaveBeenCalledWith('/admin/settings?section=general');
  });

  it('renders every section and marks the active child and parent', async () => {
    navigation.pathname = '/admin/settings';
    renderItem({ section: 'alerts' });

    for (const label of ['General', 'Alerts', 'Users', 'Transfer', 'Backup']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(screen.getByRole('link', { name: 'General' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('button', { name: 'System Config' })).toHaveClass(
      'bg-accent',
    );
  });

  it('prompts before discarding dirty changes and stays on cancel', async () => {
    navigation.pathname = '/admin/settings';
    const onDiscard = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderItem({ dirty: true, onDiscard });

    fireEvent.click(screen.getByRole('link', { name: 'Alerts' }));

    expect(confirm).toHaveBeenCalledWith('Discard changes?');
    expect(navigation.push).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('link', { name: 'Alerts' }));

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith('/admin/settings?section=alerts'),
    );
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('does not prompt when there are no unsaved changes', () => {
    navigation.pathname = '/admin/settings';
    const confirm = vi.spyOn(window, 'confirm');

    renderItem({ dirty: false });
    fireEvent.click(screen.getByRole('link', { name: 'Alerts' }));

    expect(confirm).not.toHaveBeenCalled();
    expect(navigation.push).toHaveBeenCalledWith('/admin/settings?section=alerts');
  });

  it('moves focus with arrow keys and collapses on Escape', async () => {
    renderItem();
    const parent = screen.getByRole('button', { name: 'System Config' });
    fireEvent.click(parent);

    const general = screen.getByRole('link', { name: 'General' });
    general.focus();
    fireEvent.keyDown(general, { key: 'ArrowDown' });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Alerts' })).toHaveFocus(),
    );

    fireEvent.keyDown(screen.getByRole('link', { name: 'Alerts' }), {
      key: 'Escape',
    });

    await waitFor(() => expect(parent).toHaveAttribute('aria-expanded', 'false'));
    expect(parent).toHaveFocus();
  });
});
