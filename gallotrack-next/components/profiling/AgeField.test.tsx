import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EncodeForm from './EncodeForm';
import { autoComputeGrowthStage, getAgeParts, getMilestoneInfo } from '@/lib/helpers';
import type { FowlRecord } from '@/lib/types';

const baseProps = {
  fowls: [] as FowlRecord[],
  newName: 'Thunder',
  setNewName: vi.fn(),
  newBreed: 'Sweater',
  setNewBreed: vi.fn(),
  newGender: 'Rooster',
  setNewGender: vi.fn(),
  newBirthdate: '',
  handleNewBirthdateChange: vi.fn(),
  age: '',
  handleAgeChange: vi.fn(),
  newGrowthStage: 'Cock',
  setNewGrowthStage: vi.fn(),
  height: '',
  setHeight: vi.fn(),
  weight: '',
  setWeight: vi.fn(),
  newLegColor: 'Yellow',
  setNewLegColor: vi.fn(),
  availableLegColors: ['Yellow', 'Green'],
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
  wingBand: 'WB-100',
  setWingBand: vi.fn(),
  suggestedBirdCode: '4',
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
  refreshStrains: vi.fn().mockResolvedValue(undefined),
  loading: false,
  uploadingImage: false,
  nextNodeId: '4',
  dataCompleteness: 0,
  validationPassed: false,
  bloodlineVerified: false,
  computedBloodlinePct: 0,
  offspringGenInfo: { short: 'F0', label: 'Foundation Stock' },
  sireGenInfo: { short: 'F0', label: 'Foundation Stock' },
  damGenInfo: { short: 'F0', label: 'Foundation Stock' },
  sireGen: 0,
  damGen: 0,
  generationPurity: vi.fn(),
  handleAddFowl: vi.fn(),
  autoCalcAge: true,
  getAutoCalcAge: () => true,
};

function Harness({ birthdate = '', age = '' }: { birthdate?: string; age?: string }) {
  const [height, setHeight] = React.useState('');
  const [weight, setWeight] = React.useState('');
  return (
    <EncodeForm
      {...baseProps}
      newBirthdate={birthdate}
      age={age}
      height={height}
      setHeight={setHeight}
      weight={weight}
      setWeight={setWeight}
    />
  );
}

describe('EncodeForm age, height and weight fields', () => {
  it('renders age as a read-only calculated value with "-" when no birth date', () => {
    render(<Harness />);

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
    render(<Harness birthdate="2025-01-01" age="10" />);

    const expected = String(getAgeParts('2025-01-01')?.totalMonths ?? '');
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

    height.focus();
    fireEvent.wheel(height);
    expect(height).not.toHaveFocus();
    expect(height).toHaveValue(45.5);
  });

  it('keeps age, growth-stage and milestone calculations unchanged', () => {
    const from = new Date('2026-01-15T00:00:00');
    const parts = getAgeParts('2025-01-15', from);
    expect(parts?.totalMonths).toBe(12);
    expect(autoComputeGrowthStage(12, 'Rooster')).toBe('Bull Stag');

    const milestone = getMilestoneInfo('2025-01-15', 'Rooster', from);
    expect(milestone?.current?.stage).toBe('Bull Stag');
  });
});
