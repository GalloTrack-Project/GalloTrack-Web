import React, { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EncodeForm from './EncodeForm';
import { buildCodeSet } from '@/lib/bird-code';
import type { FowlRecord } from '@/lib/types';
import { previewRegistrationIdentifier, type RegistrationType } from '@/lib/registration-type';

vi.mock('@/lib/units', () => ({
  useUnitPrefs: () => ({ weightUnit: 'kg', heightUnit: 'cm' }),
  weightUnitLabel: () => 'kg',
  heightUnitLabel: () => 'cm',
  weightToStorage: (v: string) => v,
  heightToStorage: (v: string) => v,
  weightFromStorage: (v: string) => v,
  heightFromStorage: (v: string) => v,
}));

vi.mock('@/lib/hooks/use-registry-options', () => ({
  useRegistryOptions: () => ({ rows: [] }),
}));

const fowl = (
  id: number,
  name: string,
  gender: string,
  code: string,
  role: FowlRecord['registry_role'] = 'Non-Breeding',
): FowlRecord =>
  ({
    id,
    name,
    gender,
    breed: 'Hatch',
    status: 'Active',
    bird_code: code,
    registry_role: role,
    sire: id >= 3 ? 'Sire 1' : 'Foundation Stock',
    dam: id >= 3 ? 'Dam A' : 'Foundation Stock',
    color: '',
    color_category: '',
    growth_stage: 'Cock',
    behavior_trait: '',
    eye_variant: '',
    birthdate: '2025-01-01',
    age: '',
    weight: '',
    height: '',
    leg_color: '',
    sire_pct: 0,
    dam_pct: 0,
    bloodline_pct: 0,
  }) as FowlRecord;

const farm: FowlRecord[] = [
  fowl(1, 'Sire 1', 'Rooster', '1', 'Breeding Male'),
  fowl(2, 'Dam A', 'Hen', 'A', 'Breeding Female'),
  fowl(3, 'Offspring 1A1', 'Rooster', '1A1'),
  fowl(4, 'Offspring 1A2', 'Hen', '1A2'),
  fowl(5, 'Offspring 1A3', 'Rooster', '1A3'),
  fowl(6, 'Offspring 1A4', 'Hen', '1A4'),
];
const taken = buildCodeSet(['1', 'A', '1A1', '1A2', '1A3', '1A4']);

function Harness({
  initialType = 'new',
  initialGender = '',
  fowls = farm,
  codeSet = taken,
}: {
  initialType?: RegistrationType;
  initialGender?: string;
  fowls?: FowlRecord[];
  codeSet?: Set<string>;
}) {
  const [registrationType, setRegistrationType] = useState<RegistrationType>(initialType);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState(initialGender);
  const [sireName, setSireName] = useState('');
  const [damName, setDamName] = useState('');
  const [birdCode, setBirdCode] = useState('');
  const [wingBand, setWingBand] = useState('');
  const suggestedBirdCode = useMemo(
    () =>
      previewRegistrationIdentifier({
        registrationType,
        gender: newGender,
        sireName,
        damName,
        fowls,
        taken: codeSet,
      }),
    [registrationType, newGender, sireName, damName, fowls, codeSet],
  );

  return (
    <EncodeForm
      fowls={fowls}
      registrationType={registrationType}
      setRegistrationType={setRegistrationType}
      newName={newName}
      setNewName={setNewName}
      newBreed="Hatch"
      setNewBreed={vi.fn()}
      newGender={newGender}
      setNewGender={setNewGender}
      newBirthdate="2025-01-01"
      handleNewBirthdateChange={vi.fn()}
      age=""
      handleAgeChange={vi.fn()}
      newGrowthStage="Cock"
      setNewGrowthStage={vi.fn()}
      height=""
      setHeight={vi.fn()}
      weight=""
      setWeight={vi.fn()}
      newLegColor=""
      setNewLegColor={vi.fn()}
      availableLegColors={[]}
      customLegColorNames={new Set()}
      deleteCustomLegColor={vi.fn()}
      legColorQuery=""
      setLegColorQuery={vi.fn()}
      legColorOpen={false}
      setLegColorOpen={vi.fn()}
      sireName={sireName}
      setSireName={setSireName}
      damName={damName}
      setDamName={setDamName}
      birdCode={birdCode}
      setBirdCode={setBirdCode}
      wingBand={wingBand}
      setWingBand={setWingBand}
      suggestedBirdCode={suggestedBirdCode}
      previewBloodlineStats={null}
      selectedImage={null}
      setSelectedImage={vi.fn()}
      imagePreview=""
      setImagePreview={vi.fn()}
      strainQuery=""
      setStrainQuery={vi.fn()}
      strainOpen={false}
      setStrainOpen={vi.fn()}
      availableStrains={['Hatch']}
      selectedStrains={['Hatch']}
      addStrain={vi.fn()}
      removeStrain={vi.fn()}
      refreshStrains={vi.fn().mockResolvedValue(undefined)}
      loading={false}
      uploadingImage={false}
      nextNodeId="GT-0001"
      dataCompleteness={0}
      validationPassed
      bloodlineVerified={false}
      computedBloodlinePct={100}
      offspringGenInfo={{ short: 'F0', label: 'New bird' }}
      sireGenInfo={{ short: 'F0', label: 'New bird' }}
      damGenInfo={{ short: 'F0', label: 'New bird' }}
      sireGen={0}
      damGen={0}
      generationPurity={() => 100}
      handleAddFowl={vi.fn()}
      autoCalcAge
      getAutoCalcAge={() => true}
    />
  );
}

function chooseParent(label: string, name: string) {
  fireEvent.focus(screen.getByLabelText(label));
  const option = screen.getByText(name).closest('button');
  expect(option).not.toBeNull();
  fireEvent.mouseDown(option as HTMLButtonElement);
}

describe('registration Step 1 flow', () => {
  it('disables the identifier until a gender is chosen, then shows the next number or letter', () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByTestId('identifier-status')).toHaveTextContent(
      'Select a gender class to assign an identifier.',
    );

    fireEvent.change(screen.getByLabelText('Gender Class'), { target: { value: 'Rooster' } });
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('2');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('Auto · Sire');
    unmount();

    render(<Harness initialGender="Hen" />);
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('B');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('Auto · Dam');
  });

  it('keeps name and wing band when switching to Offspring', () => {
    render(<Harness initialGender="Rooster" />);
    fireEvent.change(screen.getByLabelText('Identifier Name'), {
      target: { value: 'Thunder Hatch' },
    });
    fireEvent.change(screen.getByLabelText(/Wing Banding/i), {
      target: { value: 'WB-007' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Offspring/ }));

    expect(screen.getByLabelText('Identifier Name')).toHaveValue('Thunder Hatch');
    expect(screen.getByLabelText(/Wing Banding/i)).toHaveValue('WB-007');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent(
      'Select a Sire and a Dam to generate the identifier.',
    );
  });

  it('enables the offspring identifier only after both registered parents are chosen', () => {
    render(<Harness initialType="offspring" initialGender="Rooster" />);
    expect(screen.getByTestId('identifier-status')).toHaveTextContent(
      'Select a Sire and a Dam to generate the identifier.',
    );

    chooseParent('Sire', 'Sire 1');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent(
      'Select a Sire and a Dam to generate the identifier.',
    );

    chooseParent('Dam', 'Dam A');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('1A5');
    expect(screen.getByTestId('identifier-status')).toHaveTextContent('Auto · Offspring');
    expect(screen.getByTestId('pair-summary')).toHaveTextContent(
      'Sire 1 × Dam A · 4 offspring so far',
    );
  });

  it('shows a New bird registration path when no registered parents exist', () => {
    render(<Harness initialType="offspring" fowls={[]} codeSet={new Set()} />);
    expect(screen.getByText('Register a New bird first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Switch to New bird registration' }));
    expect(screen.getByRole('radio', { name: /New bird/ })).toBeChecked();
  });

  it('keeps the identifier disabled when Offspring parent names are not registered', () => {
    render(<Harness initialType="offspring" initialGender="Rooster" />);
    fireEvent.change(screen.getByLabelText('Sire'), { target: { value: 'External Sire' } });
    fireEvent.change(screen.getByLabelText('Dam'), { target: { value: 'External Dam' } });
    expect(screen.getByTestId('identifier-status')).toHaveTextContent(
      'Offspring identifiers need a registered Sire and Dam.',
    );
  });

  it('does not let external parent names change a New bird identifier', () => {
    render(<Harness initialGender="Rooster" />);
    const before = screen.getByTestId('identifier-status').textContent;
    fireEvent.click(screen.getByText('+ Add parents (optional)'));
    fireEvent.change(screen.getByLabelText('External Sire (optional)'), {
      target: { value: 'Bought Cock' },
    });
    fireEvent.change(screen.getByLabelText('External Dam (optional)'), {
      target: { value: 'Gifted Hen' },
    });
    expect(screen.getByTestId('identifier-status').textContent).toBe(before);
  });
});
