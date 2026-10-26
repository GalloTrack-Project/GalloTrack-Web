import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import EncodeForm from './EncodeForm';
import EditFowlModal from '../modals/EditFowlModal';
import type { FowlRecord } from '@/lib/types';
import { GENDER_CLASS_OPTIONS, genderClassLabel } from '@/lib/gender-class';
import { en } from '@/lib/i18n/en';
import { tl } from '@/lib/i18n/tl';
import { hil } from '@/lib/i18n/hil';

vi.mock('@/lib/units', () => ({
  useUnitPrefs: () => ({ weightUnit: 'kg', heightUnit: 'cm' }),
  weightUnitLabel: () => 'kg',
  heightUnitLabel: () => 'cm',
  weightToStorage: (v: string) => v,
  heightToStorage: (v: string) => v,
  weightFromStorage: (v: string) => v,
  heightFromStorage: (v: string) => v,
}));

function encodeProps(overrides: Record<string, unknown> = {}) {
  return {
    fowls: [],
    newName: 'Storm Rider',
    setNewName: vi.fn(),
    newBreed: 'Sweater',
    setNewBreed: vi.fn(),
    newGender: 'Rooster',
    setNewGender: vi.fn(),
    newColor: 'Wheaten',
    setNewColor: vi.fn(),
    newBehaviorTrait: 'Aggressive',
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
    ...overrides,
  } as any;
}

const editingFowl: FowlRecord = {
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

function editProps(overrides: Record<string, unknown> = {}) {
  return {
    editingFowl,
    setEditingFowl: vi.fn(),
    handleUpdateFowl: vi.fn(),
    loading: false,
    fowls: [editingFowl],
    availableStrains: ['Hatch', 'Sweater'],
    customStrainNames: new Set<string>(),
    deleteCustomStrain: vi.fn(),
    editName: 'Iron Clad',
    setEditName: vi.fn(),
    editBreed: 'Hatch',
    setEditBreed: vi.fn(),
    editGender: 'Rooster',
    setEditGender: vi.fn(),
    editColorCategory: 'Red',
    setEditColorCategory: vi.fn(),
    editColor: 'Dark Red',
    setEditColor: vi.fn(),
    editBehaviorTrait: 'High Velocity Cutter',
    setEditBehaviorTrait: vi.fn(),
    editEyeVariant: 'Pearl',
    setEditEyeVariant: vi.fn(),
    editAge: '12',
    setEditAge: vi.fn(),
    editBirthdate: '2024-01-01',
    setEditBirthdate: vi.fn(),
    editGrowthStage: 'Cock',
    setEditGrowthStage: vi.fn(),
    editWeight: '2.1',
    setEditWeight: vi.fn(),
    editHeight: '44',
    setEditHeight: vi.fn(),
    editLegColor: 'Green / Slate',
    setEditLegColor: vi.fn(),
    availableLegColors: ['Green / Slate', 'Yellow'],
    deleteCustomLegColor: vi.fn(),
    editSire: 'Foundation Stock',
    setEditSire: vi.fn(),
    editDam: 'Foundation Stock',
    setEditDam: vi.fn(),
    setEditSirePct: vi.fn(),
    setEditDamPct: vi.fn(),
    editBirdCode: '2',
    setEditBirdCode: vi.fn(),
    editWingBand: 'WB-002',
    setEditWingBand: vi.fn(),
    handleEditBirthdateChange: vi.fn(),
    handleEditAgeChange: vi.fn(),
    autoComputeGrowthStage: vi.fn(),
    getAgeParts: vi.fn(),
    getAgeLabel: vi.fn(),
    getAgeMetrics: vi.fn(),
    generationOf: vi.fn(),
    generationPurity: vi.fn(),
    ...overrides,
  } as any;
}

function expectGenderClassOptions(select: HTMLElement) {
  const options = within(select).getAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual([
    'Select Gender Class',
    'Cock',
    'Hen',
  ]);
  // Stored values must remain exactly Rooster / Hen.
  expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual([
    '',
    'Rooster',
    'Hen',
  ]);
  expect(within(select).queryByRole('option', { name: 'Sire' })).not.toBeInTheDocument();
  expect(within(select).queryByRole('option', { name: 'Dam' })).not.toBeInTheDocument();
}

describe('Gender Class display labels', () => {
  it('renders Cock/Hen but keeps Rooster/Hen stored values in EncodeForm', () => {
    const setNewGender = vi.fn();
    render(<EncodeForm {...encodeProps({ setNewGender })} />);

    const select = screen.getByLabelText('Gender Class');
    expectGenderClassOptions(select);

    fireEvent.change(select, { target: { value: 'Hen' } });
    expect(setNewGender).toHaveBeenCalledWith('Hen');

    fireEvent.change(select, { target: { value: 'Rooster' } });
    expect(setNewGender).toHaveBeenCalledWith('Rooster');
  });

  it('renders Cock/Hen but keeps Rooster/Hen stored values in EditFowlModal', () => {
    const setEditGender = vi.fn();
    render(<EditFowlModal {...editProps({ setEditGender })} />);

    const select = screen.getByLabelText('Gender Class');
    const options = within(select).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Cock', 'Hen']);
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual([
      'Rooster',
      'Hen',
    ]);
    expect(within(select).queryByRole('option', { name: 'Sire' })).not.toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'Dam' })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'Hen' } });
    expect(setEditGender).toHaveBeenCalledWith('Hen');

    fireEvent.change(select, { target: { value: 'Rooster' } });
    expect(setEditGender).toHaveBeenCalledWith('Rooster');
  });

  it('defines the label/value mapping in one place', () => {
    expect(GENDER_CLASS_OPTIONS).toEqual([
      { value: 'Rooster', labelKey: 'registry.cockOption' },
      { value: 'Hen', labelKey: 'registry.henOption' },
    ]);
    const t = (key: string) =>
      String(key).endsWith('cockOption') ? en.registry.cockOption : en.registry.henOption;
    expect(genderClassLabel('Rooster', t)).toBe('Cock');
    expect(genderClassLabel('Hen', t)).toBe('Hen');
    // Legacy/custom stored values are derived with sexLabel.
    expect(genderClassLabel('Female', () => 'unused')).toBe('Hen');
    expect(genderClassLabel('Male', () => 'unused')).toBe('Cock');
  });

  it('keeps Cock/Hen as the translated option labels in every locale', () => {
    for (const dictionary of [en, tl, hil]) {
      expect(dictionary.registry.cockOption).toBe('Cock');
      expect(dictionary.registry.henOption).toBe('Hen');
      expect('sireOption' in dictionary.registry).toBe(false);
      expect('damOption' in dictionary.registry).toBe(false);
    }
  });
});
