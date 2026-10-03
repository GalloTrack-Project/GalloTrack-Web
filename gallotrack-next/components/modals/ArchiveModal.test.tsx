import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArchiveModal from './ArchiveModal';
import type { FowlRecord } from '@/lib/types';

const fowl = { id: 'f1', name: 'True Hatch', breed: 'Hatch' } as unknown as FowlRecord;

function setup(overrides: Partial<React.ComponentProps<typeof ArchiveModal>> = {}) {
  const props = {
    selectedFowlForArchive: fowl,
    setSelectedFowlForArchive: vi.fn(),
    handleArchiveFowlWithReason: vi.fn(),
    archiveReasonInput: 'SOLD',
    setArchiveReasonInput: vi.fn(),
    archiveReasonNote: '',
    setArchiveReasonNote: vi.fn(),
    loading: false,
    ...overrides,
  };
  return { ...render(<ArchiveModal {...props} />), props };
}

/**
 * K2 regression guard: the eight shells in components/modals/ used to be plain
 * divs with no dialog semantics. These assert the migration to the Modal
 * primitive actually holds, rather than trusting the diff.
 */
describe('ArchiveModal — dialog semantics (K2)', () => {
  it('renders nothing when no chicken is selected', () => {
    setup({ selectedFowlForArchive: null });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes role=dialog, aria-modal and a name from the title', () => {
    setup();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Archive Chicken Node');
  });

  it('describes itself with the subtitle', () => {
    setup();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Select a NON-MORTALITY reason for inventory removal',
    );
  });

  it('moves focus into the dialog on open', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  });

  it('closes on Escape', () => {
    const { props } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.setSelectedFowlForArchive).toHaveBeenCalledWith(null);
  });

  it('closes on the labelled close button', () => {
    const { props } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(props.setSelectedFowlForArchive).toHaveBeenCalledWith(null);
  });

  it('keeps its form controls associated and inside the dialog', () => {
    setup();
    const select = screen.getByLabelText('Select Archive Reason (Non-Mortality)');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toContainElement(select);
  });
});
