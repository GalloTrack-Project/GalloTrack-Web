import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EditFowlModal from './EditFowlModal';
import { getAgeParts } from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';

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

const baseProps = {
  editingFowl: fowl,
  setEditingFowl: vi.fn(),
  handleUpdateFowl: vi.fn(),
  loading: false,
  fowls: [fowl],
  availableStrains: ['Hatch', 'Sweater'],
  customStrainNames: new Set<string>(),
  deleteCustomStrain: vi.fn().mockResolvedValue(undefined),
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
  editBehaviorTrait: 'Calm',
  setEditBehaviorTrait: vi.fn(),
  editEyeVariant: 'Red',
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
  deleteCustomLegColor: vi.fn().mockResolvedValue(undefined),
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
  autoComputeGrowthStage: vi.fn().mockReturnValue('Cock'),
  getAgeParts,
  getAgeLabel: () => '1y',
  getAgeMetrics: () => '12m',
  generationOf: () => 1,
  generationPurity: () => 100,
};

function Harness({
  birthdate = '2024-01-01',
  age = '12',
}: {
  birthdate?: string;
  age?: string;
}) {
  const [height, setHeight] = React.useState('44');
  const [weight, setWeight] = React.useState('2.1');
  return (
    <EditFowlModal
      {...baseProps}
      editBirthdate={birthdate}
      editAge={age}
      editHeight={height}
      setEditHeight={setHeight}
      editWeight={weight}
      setEditWeight={setWeight}
    />
  );
}

describe('EditFowlModal age, height and weight fields', () => {
  it('renders age as a read-only calculated value with "-" when no birth date', () => {
    render(<Harness birthdate="" age="" />);

    const ageInput = screen.getByLabelText(/Age \(Mos\)/i);
    expect(ageInput).toHaveAttribute('type', 'text');
    expect(ageInput).toHaveAttribute('inputmode', 'numeric');
    expect(ageInput).toHaveAttribute('readonly');
    expect(ageInput).toHaveAttribute('aria-readonly', 'true');
    expect(ageInput).toHaveValue('-');
    expect(ageInput.className).not.toContain('no-spinner');
    expect(screen.getByText('Calculated from the birth date')).toBeInTheDocument();
  });

  it('shows the value derived from the birth date', () => {
    render(<Harness />);

    const expected = String(getAgeParts('2024-01-01')?.totalMonths ?? '');
    expect(screen.getByLabelText(/Age \(Mos\)/i)).toHaveValue(expected);
  });

  it('removes number spinners, accepts decimals and blurs on wheel', () => {
    render(<Harness />);

    const height = screen.getByLabelText(/Height/i) as HTMLInputElement;
    const weight = screen.getByLabelText(/Weight/i) as HTMLInputElement;

    expect(height).toHaveAttribute('type', 'number');
    expect(height).toHaveAttribute('inputmode', 'decimal');
    expect(height.className).toContain('no-spinner');
    expect(weight).toHaveAttribute('type', 'number');
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(weight.className).toContain('no-spinner');

    fireEvent.change(height, { target: { value: '45.5' } });
    fireEvent.change(weight, { target: { value: '2.2' } });
    expect(height).toHaveValue(45.5);
    expect(weight).toHaveValue(2.2);

    weight.focus();
    fireEvent.wheel(weight);
    expect(weight).not.toHaveFocus();
    expect(weight).toHaveValue(2.2);
  });
});
