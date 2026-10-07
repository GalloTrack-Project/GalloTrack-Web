import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PerFowlBreakdownModal from './PerFowlBreakdownModal';
import type { FowlRecord, MatchRecord } from '@/lib/types';

// Mock UI context
const mockSetFightHistoryFowl = vi.fn();
const mockSetSelectedFowlForDetails = vi.fn();

vi.mock('@/lib/contexts/ui-context', () => ({
  useUI: () => ({
    setFightHistoryFowl: mockSetFightHistoryFowl,
    setSelectedFowlForDetails: mockSetSelectedFowlForDetails,
  }),
}));

const mockFowls: FowlRecord[] = [
  { id: 1, name: 'Sweater Red Storm', gender: 'Rooster', breed: 'Sweater', registry_role: 'Breeding Male', status: 'Active', chicken_code: '1A1' } as FowlRecord,
  { id: 2, name: 'Iron Lemon', gender: 'Rooster', breed: 'Lemon', registry_role: 'Breeding Male', status: 'Active', chicken_code: '2B1' } as FowlRecord,
  { id: 3, name: 'Hatch Crown', gender: 'Rooster', breed: 'Hatch', registry_role: 'Non-Breeding', status: 'Active', chicken_code: '3C1' } as FowlRecord,
  { id: 4, name: 'Hatch Mountain', gender: 'Rooster', breed: 'Hatch', registry_role: 'Non-Breeding', status: 'Active', chicken_code: '3C2' } as FowlRecord,
  { id: 5, name: 'Hatch Silver', gender: 'Rooster', breed: 'Hatch', registry_role: 'Non-Breeding', status: 'Active', chicken_code: '3C3' } as FowlRecord,
  { id: 6, name: 'Untested Hen', gender: 'Hen', breed: 'Kelso', registry_role: 'Breeding Female', status: 'Active', chicken_code: '4D1' } as FowlRecord,
];

const mockMatches: MatchRecord[] = [
  { id: 101, entry_name: 'Sweater Red Storm', outcome: 'Win', date: '2026-05-01', status: 'Completed' } as MatchRecord,
  { id: 102, entry_name: 'Iron Lemon', outcome: 'Win', date: '2026-05-02', status: 'Completed' } as MatchRecord,
  { id: 103, entry_name: 'Hatch Crown', outcome: 'Win', date: '2026-05-03', status: 'Completed' } as MatchRecord,
  { id: 104, entry_name: 'Hatch Mountain', outcome: 'Win', date: '2026-05-04', status: 'Completed' } as MatchRecord,
  { id: 105, entry_name: 'Hatch Silver', outcome: 'Loss', date: '2026-05-05', status: 'Completed' } as MatchRecord,
];

describe('PerFowlBreakdownModal', () => {
  it('renders modal titled "Win rate by chicken" with 5 fought chickens and excludes chickens with no matches', () => {
    render(
      <PerFowlBreakdownModal
        show={true}
        onClose={vi.fn()}
        fowls={mockFowls}
        matchHistory={mockMatches}
      />
    );

    expect(screen.getByText('Win rate by chicken')).toBeInTheDocument();

    // Untested Hen has no matches, so should NOT appear in table
    expect(screen.queryByText('Untested Hen')).not.toBeInTheDocument();

    // The 5 chickens with matches should be visible
    expect(screen.getAllByText('Sweater Red Storm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Iron Lemon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hatch Crown').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hatch Mountain').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Hatch Silver').length).toBeGreaterThanOrEqual(1);
  });

  it('renders pinned total row reconciling with dashboard overall numbers: 5 chickens, 5 matches, 4W-1L, 80%', () => {
    render(
      <PerFowlBreakdownModal
        show={true}
        onClose={vi.fn()}
        fowls={mockFowls}
        matchHistory={mockMatches}
      />
    );

    const totalRow = screen.getByTestId('breakdown-total-row');
    expect(totalRow).toBeInTheDocument();
    expect(within(totalRow).getByText(/5 chickens/i)).toBeInTheDocument();
    expect(within(totalRow).getAllByText(/4W-1L/i).length).toBeGreaterThanOrEqual(1);
    expect(within(totalRow).getAllByText(/80%/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters by chicken role (Breeding Male vs Non-Breeding)', () => {
    render(
      <PerFowlBreakdownModal
        show={true}
        onClose={vi.fn()}
        fowls={mockFowls}
        matchHistory={mockMatches}
      />
    );

    const breedingMaleFilter = screen.getByRole('button', { name: /Breeding Male/i });
    fireEvent.click(breedingMaleFilter);

    // Breeding males are Sweater Red Storm and Iron Lemon
    expect(screen.getAllByText('Sweater Red Storm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Iron Lemon').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Hatch Crown')).not.toBeInTheDocument();
    expect(screen.queryByText('Hatch Mountain')).not.toBeInTheDocument();
    expect(screen.queryByText('Hatch Silver')).not.toBeInTheDocument();

    // Total row updates to reflect filtered subtotal (2 chickens, 2 matches, 2W-0L, 100%)
    const totalRow = screen.getByTestId('breakdown-total-row');
    expect(within(totalRow).getByText(/2 chickens/i)).toBeInTheDocument();
    expect(within(totalRow).getAllByText(/2W-0L/i).length).toBeGreaterThanOrEqual(1);
    expect(within(totalRow).getAllByText(/100%/i).length).toBeGreaterThanOrEqual(1);
  });
});
