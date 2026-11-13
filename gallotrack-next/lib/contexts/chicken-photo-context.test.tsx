import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FowlProviderWrapper, useFowl } from '@/lib/contexts/fowl-context';
import { UIProvider, useUI } from '@/lib/contexts/ui-context';
import type { FowlRecord } from '@/lib/types';

const uploadPhoto = vi.hoisted(() => vi.fn());
const deletePhotos = vi.hoisted(() => vi.fn());
const updateFowl = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profiling',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/services/chicken-photo-service', () => ({
  uploadChickenPhoto: uploadPhoto,
  deleteChickenPhotoPaths: deletePhotos,
}));

vi.mock('@/lib/services/fowl-service', () => ({
  fetchFowls: vi.fn().mockResolvedValue([
    {
      id: 42,
      user_id: 'user-1',
      name: 'Hatch Silver',
      breed: 'Hatch',
      gender: 'Rooster',
      color: 'Silver',
      color_category: 'Silver',
      growth_stage: 'Cock',
      behavior_trait: 'Calm',
      eye_variant: 'Standard Eye',
      birthdate: '2025-01-01',
      age: '12 Months',
      weight: '2 kg',
      height: '40 cm',
      leg_color: 'Yellow',
      sire: 'Foundation Stock',
      dam: 'Foundation Stock',
      sire_pct: 100,
      dam_pct: 100,
      bloodline_pct: 100,
      bird_code: '1A',
      status: 'Active',
      image_url: '',
      photo_path: 'user-1/42/old-full.webp',
      photo_thumb_path: 'user-1/42/old-thumb.webp',
    } as FowlRecord,
  ]),
  fetchStatusHistory: vi.fn().mockResolvedValue([]),
  updateFowl,
  insertFowl: vi.fn(),
  deleteFowl: vi.fn(),
  isChickenCodeUniqueViolation: vi.fn().mockReturnValue(false),
  getNextIdentifier: vi.fn(),
  uploadFowlImage: vi.fn(),
  deleteFowlImageFile: vi.fn(),
}));

vi.mock('@/lib/services/match-service', () => ({
  fetchMatches: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/media-service', () => ({
  fetchMatchMedia: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('@/lib/services/strain-service', () => ({
  fetchStrains: vi.fn().mockResolvedValue([]),
  fetchLegColors: vi.fn().mockResolvedValue([]),
  saveCustomStrain: vi.fn().mockResolvedValue(true),
  deleteStrain: vi.fn(),
  deleteLegColor: vi.fn(),
}));

vi.mock('@/lib/services/breeding-service', () => ({
  fetchBreedingPairings: vi.fn().mockResolvedValue({ data: [] }),
}));

function SetPage() {
  const ui = useUI();
  React.useEffect(() => {
    ui.setCurrentPage('profiling');
  }, [ui.setCurrentPage]);
  return null;
}

function Harness() {
  const store = useFowl();
  const ui = useUI();
  const fowl = store.fowls[0];
  return (
    <div>
      {fowl ? <span>{fowl.name}</span> : null}
      <button type="button" onClick={() => fowl && store.handleOpenEditModal(fowl)}>
        Open edit
      </button>
      <button
        type="button"
        onClick={() => {
          store.setEditPhotoFile(new File(['full'], 'full.webp', { type: 'image/webp' }));
          store.setEditPhotoThumbnail(new File(['thumb'], 'thumb.webp', { type: 'image/webp' }));
        }}
      >
        Add pending photo
      </button>
      <button type="button" onClick={() => store.setEditPhotoRemoved(true)}>
        Remove photo
      </button>
      <button type="button" onClick={() => ui.setEditingFowl(null)}>
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          void store.handleUpdateFowl({ preventDefault: () => {} } as React.FormEvent);
        }}
      >
        Save
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <UIProvider theme="light" setTheme={() => {}}>
      <FowlProviderWrapper>
        <SetPage />
        <Harness />
      </FowlProviderWrapper>
    </UIProvider>,
  );
}

describe('chicken photo record updates', () => {
  beforeEach(() => {
    uploadPhoto.mockReset();
    deletePhotos.mockReset();
    updateFowl.mockReset();
    updateFowl.mockResolvedValue({});
    uploadPhoto.mockResolvedValue({
      fullPath: 'user-1/42/new-full.webp',
      thumbPath: 'user-1/42/new-thumb.webp',
    });
    deletePhotos.mockResolvedValue({});
  });

  it('saves a new photo on the record and deletes the replaced objects after save', async () => {
    renderHarness();
    await screen.findByText('Hatch Silver');
    fireEvent.click(screen.getByRole('button', { name: 'Open edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add pending photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateFowl).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          photo_path: 'user-1/42/new-full.webp',
          photo_thumb_path: 'user-1/42/new-thumb.webp',
        }),
      ),
    );
    expect(deletePhotos).toHaveBeenCalledWith(42, [
      'user-1/42/old-full.webp',
      'user-1/42/old-thumb.webp',
    ]);
  });

  it('removes the photo path and deletes both old objects after save', async () => {
    renderHarness();
    await screen.findByText('Hatch Silver');
    fireEvent.click(screen.getByRole('button', { name: 'Open edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateFowl).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ photo_path: null, photo_thumb_path: null }),
      ),
    );
    expect(deletePhotos).toHaveBeenCalledWith(42, [
      'user-1/42/old-full.webp',
      'user-1/42/old-thumb.webp',
    ]);
  });

  it('discards a pending photo on cancel without uploading or updating the record', async () => {
    renderHarness();
    await screen.findByText('Hatch Silver');
    fireEvent.click(screen.getByRole('button', { name: 'Open edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add pending photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(updateFowl).not.toHaveBeenCalled();
  });
});
