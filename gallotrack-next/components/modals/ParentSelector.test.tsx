import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParentSelector from './ParentSelector';
import type { FowlRecord } from '@/lib/types';

const bird = (partial: Partial<FowlRecord> & { id: number; name: string }): FowlRecord =>
  ({
    breed: 'Kelso',
    gender: 'Rooster',
    sire: '',
    dam: '',
    bird_code: '',
    status: 'Active',
    ...partial,
  }) as FowlRecord;

const fowls: FowlRecord[] = [
  bird({ id: 1, name: 'Good Sire', gender: 'Rooster', registry_role: 'Breeding Male', bird_code: '1' }),
  // Legacy bad role: a hen stored as a Breeding Male must never be offered as a sire.
  bird({ id: 2, name: 'Mislabeled Hen', gender: 'Hen', registry_role: 'Breeding Male', bird_code: '2' }),
  bird({ id: 3, name: 'Good Dam', gender: 'Hen', registry_role: 'Breeding Female', bird_code: 'A' }),
  // Legacy bad role: a cock stored as a Breeding Female must never be offered as a dam.
  bird({ id: 4, name: 'Mislabeled Cock', gender: 'Rooster', registry_role: 'Breeding Female', bird_code: 'B' }),
  bird({ id: 5, name: 'Offspring Cock', gender: 'Rooster', registry_role: 'Non-Breeding', bird_code: '1A1' }),
  bird({ id: 6, name: 'Offspring Hen', gender: 'Hen', registry_role: 'Non-Breeding', bird_code: '1A2' }),
];

describe('ParentSelector sex enforcement', () => {
  it('sire picker lists cocks only and excludes hens', () => {
    render(<ParentSelector value="" onChange={vi.fn()} fowls={fowls} preferredGender="Male" />);
    fireEvent.focus(screen.getByRole('textbox'));

    expect(screen.getByText('Good Sire')).toBeInTheDocument();
    expect(screen.getByText('Offspring Cock')).toBeInTheDocument();
    expect(screen.queryByText('Mislabeled Hen')).not.toBeInTheDocument();
    expect(screen.queryByText('Offspring Hen')).not.toBeInTheDocument();
    expect(screen.queryByText('Good Dam')).not.toBeInTheDocument();
  });

  it('dam picker lists hens only and excludes cocks', () => {
    render(
      <ParentSelector value="" onChange={vi.fn()} fowls={fowls} preferredGender="Female" accent="amber" />
    );
    fireEvent.focus(screen.getByRole('textbox'));

    expect(screen.getByText('Good Dam')).toBeInTheDocument();
    expect(screen.getByText('Offspring Hen')).toBeInTheDocument();
    expect(screen.queryByText('Mislabeled Cock')).not.toBeInTheDocument();
    expect(screen.queryByText('Offspring Cock')).not.toBeInTheDocument();
    expect(screen.queryByText('Good Sire')).not.toBeInTheDocument();
  });

  it('shows a clear inline error when a hen name is typed into the sire field', () => {
    render(<ParentSelector value="Mislabeled Hen" onChange={vi.fn()} fowls={fowls} preferredGender="Male" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Sire must be male (cock)');
    expect(alert).toHaveTextContent('"Mislabeled Hen" is recorded as Hen');
  });

  it('shows a clear inline error when a cock name is typed into the dam field', () => {
    render(
      <ParentSelector
        value="Mislabeled Cock"
        onChange={vi.fn()}
        fowls={fowls}
        preferredGender="Female"
        accent="amber"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Dam must be female (hen)');
    expect(alert).toHaveTextContent('"Mislabeled Cock" is recorded as Cock');
  });
});
