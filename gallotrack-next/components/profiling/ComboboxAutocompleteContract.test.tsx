import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

function StatefulEncodeForm() {
  const [strainOpen, setStrainOpen] = React.useState(false);
  const [strainQuery, setStrainQuery] = React.useState('');
  return (
    <EncodeForm
      {...encodeFormProps()}
      strainOpen={strainOpen}
      setStrainOpen={setStrainOpen}
      strainQuery={strainQuery}
      setStrainQuery={setStrainQuery}
    />
  );
}

function encodeFormProps() {
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
    availableStrains: ['Hatch', 'Sweater'],
    selectedStrains: [],
    addStrain: vi.fn(),
    removeStrain: vi.fn(),
    refreshStrains: vi.fn().mockResolvedValue(undefined),
    onAddBreeds: vi.fn(),
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
}

function editModalProps() {
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
    customLegColorNames: new Set<string>(),
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
  };
}

function expectSafeComboboxes(container: HTMLElement) {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[role="combobox"]'),
  );

  expect(inputs).toHaveLength(6);
  expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length);
  expect(new Set(inputs.map((input) => input.name)).size).toBe(inputs.length);

  for (const input of inputs) {
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-expanded');
    expect(input).toHaveAttribute('data-lpignore', 'true');
    expect(input).toHaveAttribute('data-1p-ignore', 'true');
    expect(input).toHaveAttribute('data-form-type', 'other');
    expect(input).not.toHaveAttribute('list');
    expect(input.id).not.toBe('');
    expect(input.name).not.toBe('');
  }

  expect(container.querySelectorAll('datalist')).toHaveLength(0);
  expect(container.querySelectorAll('[list]')).toHaveLength(0);
  expect(container.querySelector('form')).toHaveAttribute('autocomplete', 'off');
}

describe('registration and edit combobox autocomplete contract', () => {
  it('applies the shared native-autocomplete suppression to registration comboboxes', () => {
    const { container } = render(<EncodeForm {...encodeFormProps()} />);
    expectSafeComboboxes(container);
  });

  it('applies the shared native-autocomplete suppression to edit comboboxes', () => {
    render(<EditFowlModal {...editModalProps()} />);
    expectSafeComboboxes(document.body);
  });

  it('keeps custom breed and leg-color delete actions inside the custom listboxes', () => {
    const props = editModalProps();
    props.customStrainNames = new Set(['Hatch']);
    props.editLegColor = '';
    props.customLegColorNames = new Set(['Yellow']);
    render(<EditFowlModal {...props} />);

    const strainInput = screen.getByLabelText('Genetic Strain');
    fireEvent.focus(strainInput);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Hatch' }));
    expect(props.deleteCustomStrain).toHaveBeenCalledWith('Hatch');

    const legColorInput = screen.getByLabelText('Leg Color');
    fireEvent.focus(legColorInput);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Yellow' }));
    expect(props.deleteCustomLegColor).toHaveBeenCalledWith('Yellow');
  });

  it('covers the Genetic strain dropdown with Add breed and Manage breeds', async () => {
    render(<StatefulEncodeForm />);

    const strainInput = screen.getByLabelText('Genetic Strain');
    expect(strainInput).toHaveAttribute('id', 'gt-genetic-strain');
    expect(strainInput).toHaveAttribute('name', 'gt-genetic-strain');
    expect(strainInput).toHaveAttribute('autocomplete', 'off');
    expect(strainInput).toHaveAttribute('aria-autocomplete', 'list');

    expect(screen.getByRole('button', { name: /Add breed/i })).toBeInTheDocument();
    fireEvent.focus(strainInput);
    expect(
      await screen.findByRole('listbox', { name: /Registered breeds/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage breeds/i })).toBeInTheDocument();
  });
});
