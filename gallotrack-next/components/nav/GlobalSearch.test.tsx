import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  isAdmin: false,
  setSelectedFowlForDetails: vi.fn(),
  fowls: [
    { id: 1, name: 'Sweater Crimson', bird_code: '1A1', wing_band: 'WB-01', status: 'Active' },
    { id: 2, name: 'Crimson Belle', bird_code: 'A', wing_band: 'WB-99', status: 'Active' },
    { id: 3, name: 'Iron Thunder', bird_code: '2B1', wing_band: '', status: 'Active' },
  ],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: mocks.push }),
  usePathname: () => '/dashboard',
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ isAdmin: mocks.isAdmin }),
}));

vi.mock('@/lib/contexts/fowl-context', () => ({
  useFowl: () => ({ fowls: mocks.fowls }),
}));

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({ setSelectedFowlForDetails: mocks.setSelectedFowlForDetails }),
}));

import GlobalSearch from './GlobalSearch';
import { expectNoSeriousA11yViolations } from '@/components/ui/axe';
import type { FowlRecord } from '@/lib/types';

function openWithShortcut() {
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    mocks.push.mockClear();
    mocks.setSelectedFowlForDetails.mockClear();
    mocks.isAdmin = false;
  });

  it('renders a search trigger and opens the dialog on click', () => {
    render(<GlobalSearch />);
    const trigger = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Search' })).toHaveFocus();
  });

  it('toggles the dialog with Ctrl+K', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    openWithShortcut();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists owner pages and quick actions, navigates on Enter', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const listbox = screen.getByRole('listbox', { name: /search results/i });
    expect(within(listbox).getByText('Chicken Inventory')).toBeInTheDocument();
    expect(within(listbox).getByText('Log a match')).toBeInTheDocument();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
  });

  it('filters by query and jumps to the matching action', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'log a' } });
    const listbox = screen.getByRole('listbox', { name: /search results/i });
    expect(within(listbox).getByRole('option', { name: /log a match/i })).toBeInTheDocument();
    expect(within(listbox).queryByRole('option', { name: /chicken inventory/i })).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.push).toHaveBeenCalledWith('/profiling?tab=matchForm');
  });

  it('arrow keys move the active option', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('shows an empty state for a query with no matches', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'zzzz' } });
    expect(screen.getByRole('status')).toHaveTextContent('No results for “zzzz”.');
  });

  it('admin mode searches admin pages and actions only', () => {
    mocks.isAdmin = true;
    render(<GlobalSearch />);
    openWithShortcut();
    const listbox = screen.getByRole('listbox', { name: /search results/i });
    expect(within(listbox).getByText('System Config')).toBeInTheDocument();
    expect(within(listbox).queryByText('Register a chicken')).toBeNull();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'audit' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.push).toHaveBeenCalledWith('/admin/audit-logs');
  });

  it('closes on Escape', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('finds chickens by name and opens the details modal on Enter', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'crim' } });
    const listbox = screen.getByRole('listbox', { name: /search results/i });
    expect(within(listbox).getByRole('option', { name: /crimson belle/i })).toBeInTheDocument();
    expect(within(listbox).getByRole('option', { name: /sweater crimson/i })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    // Crimson Belle ranks first (name prefix) and opens via the details modal.
    expect(mocks.setSelectedFowlForDetails).toHaveBeenCalledWith(mocks.fowls[1] as unknown as FowlRecord);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('finds chickens by bird code and wing band', () => {
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: '1a1' } });
    expect(screen.getByRole('option', { name: /sweater crimson/i })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'wb-99' } });
    expect(screen.getByRole('option', { name: /crimson belle/i })).toBeInTheDocument();
  });

  it('admin palette never searches chickens', () => {
    mocks.isAdmin = true;
    render(<GlobalSearch />);
    openWithShortcut();
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: 'crim' } });
    expect(screen.queryByRole('option', { name: /crimson/i })).toBeNull();
  });

  it('has no serious a11y violations with the dialog open', async () => {
    render(<GlobalSearch />);
    openWithShortcut();
    expect(screen.getByRole('dialog', { name: /search/i })).toBeInTheDocument();
    // Modal portals to document.body, so scan the whole page, not the container.
    await expectNoSeriousA11yViolations(document.body);
  });
});
