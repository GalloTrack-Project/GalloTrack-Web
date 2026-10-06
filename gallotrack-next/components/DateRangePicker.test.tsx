import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const day = (name: string, calendar: 0 | 1) =>
  screen.getAllByRole('button', { name })[calendar];

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
    expect(screen.getByRole('group', { name: 'Start Date calendar' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'End Date calendar' })).toBeInTheDocument();
    expect(screen.getByText('Start:')).toBeInTheDocument();
    expect(screen.getByText('Oct 10, 2026')).toBeInTheDocument();
    expect(screen.getByText('End:')).toBeInTheDocument();
    expect(screen.getByText('Oct 20, 2026')).toBeInTheDocument();
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
});
