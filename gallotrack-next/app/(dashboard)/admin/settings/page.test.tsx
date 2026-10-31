import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminSettingsPage from './page';

const state = vi.hoisted(() => ({
  section: 'general',
  setActiveSection: vi.fn(),
  setDirty: vi.fn(),
  setDiscardHandler: vi.fn(),
  setTheme: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () =>
    new URLSearchParams(state.section ? `section=${state.section}` : ''),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: state.setTheme }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fetchDatabaseResources: vi.fn() }),
}));

vi.mock('@/lib/contexts/system-config-nav', () => ({
  useSystemConfigNav: () => ({
    activeSection: 'general',
    setActiveSection: state.setActiveSection,
    dirty: false,
    setDirty: state.setDirty,
    setDiscardHandler: state.setDiscardHandler,
    requestSection: vi.fn(),
  }),
}));

vi.mock('@/lib/admin', () => ({
  adminGuard: vi.fn(async () => ({
    full_name: 'Admin User',
    email: 'admin@example.com',
  })),
  fetchSystemSettings: vi.fn(async () => ({})),
  updateSystemSettings: vi.fn(async () => undefined),
}));

describe('Admin System Config page', () => {
  beforeEach(() => {
    state.section = 'general';
    vi.clearAllMocks();
  });

  it('opens Alerts from a ?section=alerts deep link and syncs the sidebar', async () => {
    state.section = 'alerts';
    render(<AdminSettingsPage />);

    expect(await screen.findByText('System Settings · Alerts')).toBeInTheDocument();
    expect(screen.getByText('Milestone Alerts')).toBeInTheDocument();
    await waitFor(() =>
      expect(state.setActiveSection).toHaveBeenCalledWith('alerts'),
    );
  });

  it('falls back to General for an invalid section value', async () => {
    state.section = 'not-a-section';
    render(<AdminSettingsPage />);

    expect(await screen.findByText('System Settings · General')).toBeInTheDocument();
    expect(screen.getByLabelText('System Name')).toBeInTheDocument();
    expect(screen.queryByText('Milestone Alerts')).toBeNull();
    await waitFor(() =>
      expect(state.setActiveSection).toHaveBeenCalledWith('general'),
    );
  });

  it('no longer renders the inner Settings sections panel', async () => {
    render(<AdminSettingsPage />);
    await screen.findByText('System Settings · General');

    expect(
      screen.queryByRole('navigation', { name: /settings sections/i }),
    ).toBeNull();
  });

  it('marks the form dirty when a field changes', async () => {
    render(<AdminSettingsPage />);
    const name = await screen.findByLabelText('System Name');

    fireEvent.change(name, { target: { value: 'Updated System' } });

    await waitFor(() => expect(state.setDirty).toHaveBeenCalledWith(true));
  });
});
