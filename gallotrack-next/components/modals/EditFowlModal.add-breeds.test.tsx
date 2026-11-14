import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditFowlModal from '@/components/modals/EditFowlModal';
import type { FowlRecord } from '@/lib/types';

const createRegisteredBreed = vi.hoisted(() => vi.fn());

vi.mock('@/lib/services/options-service', () => ({
  fetchRegistryOptions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/strain-service', () => ({
  createRegisteredBreed,
  saveCustomStrain: vi.fn().mockResolvedValue(true),
  fetchStrains: vi.fn().mockResolvedValue([]),
  deleteStrain: vi.fn().mockResolvedValue({}),
}));

const fowl: FowlRecord = {
  id: 10,
  name: 'Iron Clad',
  breed: 'Hatch',
  gender: 'Rooster',
  color: 'Dark Red',
  behavior_trait: 'Calm',
  color_category: 'Red',
  growth_stage: 'Cock',
  eye_variant: 'Red',
  birthdate: '2024-01-01',
  age: '12 Months',
  weight: '2.1',
  height: '44',
  leg_color: 'Green / Slate',
  sire: 'Foundation Stock',
  dam: 'Foundation Stock',
  sire_pct: 100,
  dam_pct: 100,
  bloodline_pct: 100,
  status: 'Active',
  bird_code: '2',
  wing_band: 'WB-002',
};

function renderModal(onAddBreeds: () => void, overrides: Record<string, unknown> = {}) {
  return render(
    <EditFowlModal
      editingFowl={fowl}
      setEditingFowl={vi.fn()}
      handleUpdateFowl={vi.fn()}
      loading={false}
      onAddBreeds={onAddBreeds}
      fowls={[fowl]}
      availableStrains={[]}
      customStrainNames={new Set()}
      deleteCustomStrain={vi.fn()}
      editName={fowl.name}
      setEditName={vi.fn()}
      editBreed={fowl.breed}
      setEditBreed={vi.fn()}
      editGender={fowl.gender}
      setEditGender={vi.fn()}
      editColorCategory={fowl.color_category ?? ''}
      setEditColorCategory={vi.fn()}
      editColor={fowl.color ?? ''}
      setEditColor={vi.fn()}
      editBehaviorTrait=""
      setEditBehaviorTrait={vi.fn()}
      editEyeVariant={fowl.eye_variant ?? ''}
      setEditEyeVariant={vi.fn()}
      editAge="12"
      setEditAge={vi.fn()}
      editBirthdate={fowl.birthdate ?? ''}
      setEditBirthdate={vi.fn()}
      editGrowthStage={fowl.growth_stage ?? ''}
      setEditGrowthStage={vi.fn()}
      editWeight="2.1"
      setEditWeight={vi.fn()}
      editHeight="44"
      setEditHeight={vi.fn()}
      editLegColor={fowl.leg_color ?? ''}
      setEditLegColor={vi.fn()}
      availableLegColors={['Green / Slate', 'Yellow']}
      customLegColorNames={new Set()}
      deleteCustomLegColor={vi.fn()}
      editSire={fowl.sire}
      setEditSire={vi.fn()}
      editDam={fowl.dam}
      setEditDam={vi.fn()}
      setEditSirePct={vi.fn()}
      setEditDamPct={vi.fn()}
      editBirdCode={fowl.bird_code ?? ''}
      setEditBirdCode={vi.fn()}
      editWingBand={fowl.wing_band ?? ''}
      setEditWingBand={vi.fn()}
      handleEditBirthdateChange={vi.fn()}
      handleEditAgeChange={vi.fn()}
      autoComputeGrowthStage={vi.fn()}
      getAgeParts={vi.fn()}
      getAgeLabel={vi.fn()}
      getAgeMetrics={vi.fn()}
      generationOf={vi.fn()}
      generationPurity={vi.fn()}
      {...overrides}
    />,
  );
}

describe('EditFowlModal Add Breeds', () => {
  it('shows Not registered for a legacy strain and allows saving other fields', async () => {
    const handleUpdateFowl = vi.fn((event: React.FormEvent) => event.preventDefault());
    renderModal(vi.fn(), { handleUpdateFowl, canCreateBreed: false });

    expect(await screen.findByText('Not registered')).toBeInTheDocument();
    expect(
      screen.getByText('Ask the farm owner to register this breed'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => expect(handleUpdateFowl).toHaveBeenCalled());
  });

  it('shows the owner-permission message for an unmatched typed breed', async () => {
    renderModal(vi.fn(), {
      availableStrains: ['Kelso'],
      editBreed: 'Roundhead',
      canCreateBreed: false,
    });

    fireEvent.focus(screen.getByLabelText('Genetic Strain'));
    expect(
      await screen.findByText('Ask the farm owner to register this breed'),
    ).toBeInTheDocument();
  });

  it('opens the inline Breed Registry from the single Add breed button', async () => {
    const onAddBreeds = vi.fn();
    renderModal(onAddBreeds);

    fireEvent.click(await screen.findByRole('button', { name: /Add breed/i }));
    expect(onAddBreeds).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: /Add Breeds/i })).not.toBeInTheDocument();
  });
});
