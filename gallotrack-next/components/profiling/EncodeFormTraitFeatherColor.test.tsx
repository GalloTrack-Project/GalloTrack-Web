import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EncodeForm from './EncodeForm';
import EditFowlModal from '../modals/EditFowlModal';
import type { FowlRecord } from '@/lib/types';

vi.mock('@/lib/units', () => ({
  useUnitPrefs: () => ({ weightUnit: 'kg', heightUnit: 'cm' }),
  weightUnitLabel: () => 'kg',
  heightUnitLabel: () => 'cm',
  weightToStorage: (v: string) => v,
  heightToStorage: (v: string) => v,
  weightFromStorage: (v: string) => v,
  heightFromStorage: (v: string) => v,
}));

describe('Trait and Feather Color UI Integration', () => {
  it('renders Feather Color and Trait inputs in EncodeForm with accessible labels and options', () => {
    const setNewColor = vi.fn();
    const setNewBehaviorTrait = vi.fn();

    const mockProps: any = {
      fowls: [],
      newName: 'Storm Rider',
      setNewName: vi.fn(),
      newBreed: 'Sweater',
      setNewBreed: vi.fn(),
      newGender: 'Rooster',
      setNewGender: vi.fn(),
      newColor: 'Wheaten',
      setNewColor,
      newBehaviorTrait: 'Aggressive',
      setNewBehaviorTrait,
      newBirthdate: '2024-05-01',
      handleNewBirthdateChange: vi.fn(),
      age: '12',
      handleAgeChange: vi.fn(),
      newGrowthStage: 'Cock',
      setNewGrowthStage: vi.fn(),
      height: '45',
      setHeight: vi.fn(),
      weight: '2.2',
      setWeight: vi.fn(),
      newLegColor: 'Yellow',
      setNewLegColor: vi.fn(),
      availableLegColors: ['Yellow', 'White'],
      customLegColorNames: new Set<string>(),
      deleteCustomLegColor: vi.fn(),
      legColorQuery: '',
      setLegColorQuery: vi.fn(),
      legColorOpen: false,
      setLegColorOpen: vi.fn(),
      sireName: '',
      setSireName: vi.fn(),
      damName: '',
      setDamName: vi.fn(),
      birdCode: '',
      setBirdCode: vi.fn(),
      wingBand: 'WB-001',
      setWingBand: vi.fn(),
      suggestedBirdCode: '1',
      previewBloodlineStats: null,
      selectedImage: null,
      setSelectedImage: vi.fn(),
      imagePreview: '',
      setImagePreview: vi.fn(),
      strainQuery: '',
      setStrainQuery: vi.fn(),
      strainOpen: false,
      setStrainOpen: vi.fn(),
      availableStrains: [],
      selectedStrains: [],
      addStrain: vi.fn(),
      removeStrain: vi.fn(),
      loading: false,
      uploadingImage: false,
      nextNodeId: '1',
      dataCompleteness: 100,
      validationPassed: true,
      bloodlineVerified: true,
      computedBloodlinePct: 100,
      offspringGenInfo: { short: 'F0', label: 'Base Stock' },
      sireGenInfo: { short: 'F0', label: 'Base Stock' },
      damGenInfo: { short: 'F0', label: 'Base Stock' },
      sireGen: 0,
      damGen: 0,
      generationPurity: vi.fn(),
      handleAddFowl: vi.fn(),
      autoCalcAge: true,
      getAutoCalcAge: () => true,
    };

    render(<EncodeForm {...mockProps} />);

    // Assert inputs exist with proper IDs and labels
    const colorInput = screen.getByLabelText(/Feather Color/i);
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveValue('Wheaten');

    const traitInput = screen.getByLabelText(/Trait/i);
    expect(traitInput).toBeInTheDocument();
    expect(traitInput).toHaveValue('Aggressive');

    // Test typing / change events
    fireEvent.change(colorInput, { target: { value: 'Black-Breasted Red' } });
    expect(setNewColor).toHaveBeenCalledWith('Black-Breasted Red');

    fireEvent.change(traitInput, { target: { value: 'Smart Fighter' } });
    expect(setNewBehaviorTrait).toHaveBeenCalledWith('Smart Fighter');
  });

  it('displays custom badge when custom trait or color is entered in EncodeForm', () => {
    const mockProps: any = {
      fowls: [],
      newName: 'Storm Rider',
      setNewName: vi.fn(),
      newBreed: 'Sweater',
      setNewBreed: vi.fn(),
      newGender: 'Rooster',
      setNewGender: vi.fn(),
      newColor: 'Unique Turquoise Spark',
      setNewColor: vi.fn(),
      newBehaviorTrait: 'Acrobatic Evader',
      setNewBehaviorTrait: vi.fn(),
      newBirthdate: '2024-05-01',
      handleNewBirthdateChange: vi.fn(),
      age: '12',
      handleAgeChange: vi.fn(),
      newGrowthStage: 'Cock',
      setNewGrowthStage: vi.fn(),
      height: '45',
      setHeight: vi.fn(),
      weight: '2.2',
      setWeight: vi.fn(),
      newLegColor: 'Yellow',
      setNewLegColor: vi.fn(),
      availableLegColors: ['Yellow', 'White'],
      customLegColorNames: new Set<string>(),
      deleteCustomLegColor: vi.fn(),
      legColorQuery: '',
      setLegColorQuery: vi.fn(),
      legColorOpen: false,
      setLegColorOpen: vi.fn(),
      sireName: '',
      setSireName: vi.fn(),
      damName: '',
      setDamName: vi.fn(),
      birdCode: '',
      setBirdCode: vi.fn(),
      wingBand: 'WB-001',
      setWingBand: vi.fn(),
      suggestedBirdCode: '1',
      previewBloodlineStats: null,
      selectedImage: null,
      setSelectedImage: vi.fn(),
      imagePreview: '',
      setImagePreview: vi.fn(),
      strainQuery: '',
      setStrainQuery: vi.fn(),
      strainOpen: false,
      setStrainOpen: vi.fn(),
      availableStrains: [],
      selectedStrains: [],
      addStrain: vi.fn(),
      removeStrain: vi.fn(),
      loading: false,
      uploadingImage: false,
      nextNodeId: '1',
      dataCompleteness: 100,
      validationPassed: true,
      bloodlineVerified: true,
      computedBloodlinePct: 100,
      offspringGenInfo: { short: 'F0', label: 'Base Stock' },
      sireGenInfo: { short: 'F0', label: 'Base Stock' },
      damGenInfo: { short: 'F0', label: 'Base Stock' },
      sireGen: 0,
      damGen: 0,
      generationPurity: vi.fn(),
      handleAddFowl: vi.fn(),
      autoCalcAge: true,
      getAutoCalcAge: () => true,
    };

    render(<EncodeForm {...mockProps} />);

    // Custom badges should be rendered for non-standard options
    const customBadges = screen.getAllByText('custom');
    expect(customBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Feather Color and Trait inputs in EditFowlModal with accessible labels', () => {
    const setEditColor = vi.fn();
    const setEditBehaviorTrait = vi.fn();

    const mockEditingFowl: FowlRecord = {
      id: 10,
      name: 'Iron Clad',
      breed: 'Hatch',
      gender: 'Rooster',
      color: 'Dark Red',
      behavior_trait: 'High Velocity Cutter',
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

    render(
      <EditFowlModal
        editingFowl={mockEditingFowl}
        setEditingFowl={vi.fn()}
        handleUpdateFowl={vi.fn()}
        loading={false}
        fowls={[mockEditingFowl]}
        availableStrains={['Hatch', 'Sweater']}
        customStrainNames={new Set()}
        deleteCustomStrain={vi.fn()}
        editName="Iron Clad"
        setEditName={vi.fn()}
        editBreed="Hatch"
        setEditBreed={vi.fn()}
        editGender="Rooster"
        setEditGender={vi.fn()}
        editColorCategory="Red"
        setEditColorCategory={vi.fn()}
        editColor="Dark Red"
        setEditColor={setEditColor}
        editBehaviorTrait="High Velocity Cutter"
        setEditBehaviorTrait={setEditBehaviorTrait}
        editEyeVariant="Pearl"
        setEditEyeVariant={vi.fn()}
        editAge="12"
        setEditAge={vi.fn()}
        editBirthdate="2024-01-01"
        setEditBirthdate={vi.fn()}
        editGrowthStage="Cock"
        setEditGrowthStage={vi.fn()}
        editWeight="2.1"
        setEditWeight={vi.fn()}
        editHeight="44"
        setEditHeight={vi.fn()}
        editLegColor="Green / Slate"
        setEditLegColor={vi.fn()}
        availableLegColors={['Green / Slate', 'Yellow']}
        customLegColorNames={new Set()}
        deleteCustomLegColor={vi.fn()}
        editSire="Foundation Stock"
        setEditSire={vi.fn()}
        editDam="Foundation Stock"
        setEditDam={vi.fn()}
        setEditSirePct={vi.fn()}
        setEditDamPct={vi.fn()}
        editBirdCode="2"
        setEditBirdCode={vi.fn()}
        editWingBand="WB-002"
        setEditWingBand={vi.fn()}
        handleEditBirthdateChange={vi.fn()}
        handleEditAgeChange={vi.fn()}
        autoComputeGrowthStage={vi.fn()}
        getAgeParts={vi.fn()}
        getAgeLabel={vi.fn()}
        getAgeMetrics={vi.fn()}
        generationOf={vi.fn()}
        generationPurity={vi.fn()}
      />
    );

    const colorInput = screen.getByLabelText(/Feather Color/i);
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toHaveValue('Dark Red');

    const traitInput = screen.getByLabelText(/Trait/i);
    expect(traitInput).toBeInTheDocument();
    expect(traitInput).toHaveValue('High Velocity Cutter');

    fireEvent.change(colorInput, { target: { value: 'White' } });
    expect(setEditColor).toHaveBeenCalledWith('White');

    fireEvent.change(traitInput, { target: { value: 'Tenacious Offense' } });
    expect(setEditBehaviorTrait).toHaveBeenCalledWith('Tenacious Offense');
  });
});
