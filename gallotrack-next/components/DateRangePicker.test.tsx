import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import DateRangePicker from './DateRangePicker';

const OCTOBER = { start: '2026-10-10', end: '2026-10-20' };

function renderPicker(overrides: Partial<ComponentProps<typeof DateRangePicker>> = {}) {
  const onOpenChange = vi.fn();
  const onApply = vi.fn();
  const props = {
    label: 'Sep 29, 2026 - Oct 6, 2026',
    preset: 'custom' as const,
    custom: OCTOBER,
    open: true,
    onOpenChange,
    onApply,
    ...overrides,
  };
  const view = render(<DateRangePicker {...props} />);
  return { ...view, onOpenChange, onApply, props };
}

const day = (name: string, calendar: 0 | 1) => {
  const desktop = screen.getByTestId('desktop-calendars');
  return within(desktop).getAllByRole('button', { name })[calendar];
};

describe('DateRangePicker', () => {
  it('keeps the trigger design with calendar icon, range label, and chevron', () => {
    renderPicker({ open: false });
    const trigger = screen.getByRole('button', { name: /Sep 29, 2026 - Oct 6, 2026/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requests the popover to open when the trigger is clicked', () => {
    const { onOpenChange } = renderPicker({ open: false });
    fireEvent.click(screen.getByRole('button', { name: /Sep 29, 2026 - Oct 6, 2026/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('shows Start Date and End Date calendars with the selected range above them', () => {
    renderPicker();
    expect(screen.getByRole('dialog', { name: 'Select date range' })).toBeInTheDocument();
    const desktop = screen.getByTestId('desktop-calendars');
    expect(within(desktop).getByRole('group', { name: 'Start Date calendar' })).toBeInTheDocument();
    expect(within(desktop).getByRole('group', { name: 'End Date calendar' })).toBeInTheDocument();
    expect(screen.getAllByText('Start:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Oct 10, 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('End:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Oct 20, 2026').length).toBeGreaterThan(0);
  });

  it('disables end-calendar days earlier than the start date but keeps the start calendar usable', () => {
    renderPicker();
    expect(day('October 5, 2026', 0)).toBeEnabled();
    expect(day('October 5, 2026', 1)).toBeDisabled();
  });

  it('does not apply until Apply is clicked', () => {
    const { onApply } = renderPicker();
    fireEvent.click(day('October 15, 2026', 0));
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('custom', { start: '2026-10-15', end: '2026-10-20' });
  });

  it('auto-adjusts the end date when the start date moves past it', () => {
    const { onApply } = renderPicker({ custom: { start: '2026-10-10', end: '2026-10-12' } });
    fireEvent.click(day('October 20, 2026', 0));
    expect(screen.getAllByText('Oct 20, 2026').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('custom', { start: '2026-10-20', end: '2026-10-20' });
  });

  it('allows the same day for start and end', () => {
    const { onApply } = renderPicker();
    fireEvent.click(day('October 15, 2026', 0));
    expect(day('October 15, 2026', 1)).toBeEnabled();
    fireEvent.click(day('October 15, 2026', 1));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('custom', { start: '2026-10-15', end: '2026-10-15' });
  });

  it('Cancel closes without applying changes', () => {
    const { onApply, onOpenChange } = renderPicker();
    fireEvent.click(day('October 15, 2026', 0));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('clicking outside closes the popover without applying changes', () => {
    const { onApply, onOpenChange } = renderPicker();
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('fills both calendars from quick presets and only commits on Apply', () => {
    const { onApply } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('today', { start: key, end: key });
  });

  it('renders modern header with title and arrow-formatted date range', () => {
    renderPicker();
    expect(screen.getByText('Select Date Range')).toBeInTheDocument();
    expect(screen.getByText(/Oct 10, 2026 → Oct 20, 2026/)).toBeInTheDocument();
  });

  it('uses consistent primary accent color across start, end, and apply button without cyan/sky clash', () => {
    renderPicker();
    const startDay = day('October 10, 2026', 0);
    const endDay = day('October 20, 2026', 1);
    const applyBtn = screen.getByRole('button', { name: 'Apply' });

    // Both start and end use emerald-600 primary accent
    expect(startDay.className).toContain('bg-emerald-600');
    expect(endDay.className).toContain('bg-emerald-600');
    expect(applyBtn.className).toContain('bg-emerald-600');

    // No conflicting sky-600 accent
    expect(endDay.className).not.toContain('bg-sky-600');
  });

  it('renders all required quick date range presets', () => {
    renderPicker();
    const presets = ['Today', 'Last 7 days', 'Last 30 days', 'This month', 'Last 3 months', 'All Time', 'Custom'];
    presets.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('renders as a dialog with Apply and Cancel buttons and an accessible close button', () => {
    renderPicker();
    const dialog = screen.getByRole('dialog', { name: 'Select date range' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close date range dialog' })).toBeInTheDocument();
  });

  it('switches between Start Date and End Date in mobile single-month view', () => {
    renderPicker();
    const mobileContainer = screen.getByTestId('mobile-calendar');
    expect(within(mobileContainer).getByRole('group', { name: 'Start Date calendar' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mobile-cal-tab-end'));
    expect(within(mobileContainer).getByRole('group', { name: 'End Date calendar' })).toBeInTheDocument();
  });

  it('discards pending changes and closes when Escape is pressed', () => {
    const { onApply, onOpenChange } = renderPicker();
    fireEvent.click(day('October 15, 2026', 0));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('discards pending changes and closes when the header X close button is clicked', () => {
    const { onApply, onOpenChange } = renderPicker();
    fireEvent.click(day('October 15, 2026', 0));
    fireEvent.click(screen.getByRole('button', { name: 'Close date range dialog' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('locks body scroll while open and restores on unmount and close', () => {
    document.body.style.overflow = 'visible';
    const { unmount } = renderPicker({ open: true });
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('visible');
  });
});

