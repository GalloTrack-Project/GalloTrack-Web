import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FowlLists from './FowlLists';
import type { FowlRecord } from '@/lib/types';

const mockFowls: FowlRecord[] = [
  { id: 1, name: 'Iron Lemon', breed: 'Lemon', gender: 'Rooster', sire: '', dam: '', bird_code: '1', wing_band: 'WB-1', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 2, name: 'Titan Sweater', breed: 'Sweater', gender: 'Rooster', sire: '', dam: '', bird_code: '2', wing_band: 'WB-2', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 3, name: 'True Hatch', breed: 'Hatch', gender: 'Rooster', sire: '', dam: '', bird_code: '3', wing_band: 'WB-3', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 4, name: 'Lemon Storm', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', bird_code: '1A1', wing_band: 'WB-4', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 5, name: 'Lemon Blaze', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', bird_code: '1A2', wing_band: 'WB-5', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 6, name: 'Lemon Duke', breed: 'Lemon', gender: 'Rooster', sire: 'Iron Lemon', dam: 'Golden Pearl', bird_code: '1A4', wing_band: 'WB-6', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 7, name: 'Sweater Flash', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', bird_code: '2B1', wing_band: 'WB-7', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 8, name: 'Sweater Bolt', breed: 'Sweater', gender: 'Rooster', sire: 'Titan Sweater', dam: 'Sunrise Queen', bird_code: '2B2', wing_band: 'WB-8', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 9, name: 'Hatch Thunder', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', bird_code: '3C1', wing_band: 'WB-9', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 10, name: 'Hatch Storm', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', bird_code: '3C2', wing_band: 'WB-10', status: 'Active', bloodline_pct: 100 } as FowlRecord,
  { id: 11, name: 'Hatch Mountain', breed: 'Hatch', gender: 'Rooster', sire: 'True Hatch', dam: 'Mountain Rose', bird_code: '3C4', wing_band: 'WB-11', status: 'Active', bloodline_pct: 100 } as FowlRecord,
];

function renderFowlLists(overrides = {}) {
  return render(
    <FowlLists
      tab="males"
      fowls={mockFowls}
      maleActiveFowls={mockFowls}
      femaleActiveFowls={[]}
      archivedFowls={[]}
      deceasedFowls={[]}
      sireMaterialFowls={[]}
      matchHistory={[]}
      loading={false}
      setProfilingSubTab={vi.fn()}
      setPendingPermanentDelete={vi.fn()}
      handleRestoreFowlOnly={vi.fn()}
      setSelectedFowlForArchive={vi.fn()}
      setSelectedFowlForDeceased={vi.fn()}
      handleOpenEditModal={vi.fn()}
      handleSetActiveStatus={vi.fn()}
      setSelectedFowlForDetails={vi.fn()}
      {...overrides}
    />
  );
}

describe('FowlLists search and filter', () => {
  it('renders initial live count and search input with shortcut hint', () => {
    renderFowlLists();
    expect(screen.getAllByText(/11 of 11/i).length).toBeGreaterThan(0);
    const searchInput = screen.getByLabelText(/Search Registry/i);
    expect(searchInput).toHaveAttribute('placeholder', 'Search name, ID, wing band…');
  });

  it('filters by chicken name with debounce and updates live count', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Blaze' } });

    await waitFor(() => {
      expect(screen.getAllByText(/\b1 of 11\b/).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Iron Lemon/i })).not.toBeInTheDocument();
  });

  it('filters by unique identifier code (e.g. 1A1)', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: '1A1' } });

    await waitFor(() => {
      expect(screen.getAllByText(/\b1 of 11\b/).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Storm/i })).toBeInTheDocument();
  });

  it('filters by parent pair code prefix (e.g. 1A matches all offspring in 1A)', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: '1A' } });

    await waitFor(() => {
      expect(screen.getAllByText(/3 of 11/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Storm/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Duke/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Flash/i })).not.toBeInTheDocument();
  });

  it('filters by wing band number', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'WB-9' } });

    await waitFor(() => {
      expect(screen.getAllByText(/\b1 of 11\b/).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Hatch Thunder/i })).toBeInTheDocument();
  });

  it('matches only chicken own fields by default (does not match offspring via sire name)', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Titan' } });

    await waitFor(() => {
      expect(screen.getAllByText(/\b1 of 11\b/).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Titan Sweater/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Flash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4, name: /Sweater Bolt/i })).not.toBeInTheDocument();
  });

  it('shows friendly empty state when no chickens match and allows clearing', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistentChicken' } });

    await waitFor(() => {
      expect(screen.getByText(/No chickens found for "NonExistentChicken"/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getAllByText(/11 of 11/i).length).toBeGreaterThan(0);
    });
  });

  it('clears search input when Escape key is pressed', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Sweater' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('Sweater');
    });

    fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('clears search input when the X button is clicked', async () => {
    renderFowlLists();
    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Hatch' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('Hatch');
    });

    const clearInputButton = screen.getByRole('button', { name: 'Clear search input' });
    fireEvent.click(clearInputButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('combines text search with Breed dropdown filter', async () => {
    renderFowlLists();
    const breedSelect = screen.getByLabelText(/Breed/i);
    fireEvent.change(breedSelect, { target: { value: 'Lemon' } });

    await waitFor(() => {
      expect(screen.getAllByText(/4 of 11/i).length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByLabelText(/Search Registry/i);
    fireEvent.change(searchInput, { target: { value: 'Blaze' } });

    await waitFor(() => {
      expect(screen.getAllByText(/\b1 of 11\b/).length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { level: 4, name: /Lemon Blaze/i })).toBeInTheDocument();
  });
});
