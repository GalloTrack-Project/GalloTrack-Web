import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeclaredCompositionEditor from './DeclaredCompositionEditor';

describe('DeclaredCompositionEditor Component UI', () => {
  it('renders foundation stock view with empty inputs when no parents and no declaration', () => {
    const onChange = vi.fn();
    render(
      <DeclaredCompositionEditor
        registeredBreed="Hatch"
        availableBreeds={['Hatch', 'Sweater', 'Kelso']}
        value={null}
        onChange={onChange}
        hasParents={false}
      />
    );

    expect(screen.getByText('Purity (breed composition)')).toBeDefined();
    expect(screen.getByText('Foundation Stock')).toBeDefined();
    expect(
      screen.getByText(/Enter it manually if you know it\. Leave blank if unknown/i)
    ).toBeDefined();
    expect(screen.getByText('Assumed from registered breed (not verified)')).toBeDefined();
    expect(screen.getByText('100% (Assumed)')).toBeDefined();
    expect(screen.getByText('100% Hatch')).toBeDefined();
    expect(screen.getByText('+ Add another breed')).toBeDefined();
  });

  it('renders "No breeds yet. Add your breeds first" with a link when availableBreeds is empty and no parents', () => {
    const onChange = vi.fn();
    render(
      <DeclaredCompositionEditor
        registeredBreed=""
        availableBreeds={[]}
        value={null}
        onChange={onChange}
        hasParents={false}
      />
    );

    expect(
      screen.getByText('No breeds yet. Add your breeds first to declare custom composition.')
    ).toBeDefined();
    const link = screen.getByRole('link', { name: /Add Breeds/i });
    expect(link.getAttribute('href')).toBe('/breeds');
  });

  it('one-tap 100% shortcut triggers onChange with 100% registered breed', () => {
    const onChange = vi.fn();
    render(
      <DeclaredCompositionEditor
        registeredBreed="Sweater"
        availableBreeds={['Sweater', 'Hatch']}
        value={null}
        onChange={onChange}
        hasParents={false}
      />
    );

    const shortcutBtn = screen.getByRole('button', { name: /100% Sweater/i });
    fireEvent.click(shortcutBtn);
    expect(onChange).toHaveBeenCalledWith([{ breed: 'Sweater', percent: 100 }]);
  });

  it('renders recorded lineage view with Calculated from parents and Adjust manually toggle when parents exist', () => {
    const onChange = vi.fn();
    const pedComp = { Hatch: 50, Sweater: 50 };

    render(
      <DeclaredCompositionEditor
        registeredBreed="Crossbred"
        availableBreeds={['Hatch', 'Sweater', 'Kelso']}
        value={null}
        onChange={onChange}
        hasParents={true}
        pedigreeComposition={pedComp}
      />
    );

    expect(screen.getByText('Recorded Lineage')).toBeDefined();
    expect(screen.getByText('Derived from parents')).toBeDefined();
    expect(screen.getByText('50% Hatch / 50% Sweater')).toBeDefined();
    expect(screen.getByRole('button', { name: /Adjust manually/i })).toBeDefined();

    // Clicking toggle turns on manual adjustment and prefills calculated values
    fireEvent.click(screen.getByRole('button', { name: /Adjust manually/i }));
    expect(onChange).toHaveBeenCalledWith([
      { breed: 'Hatch', percent: 50 },
      { breed: 'Sweater', percent: 50 },
    ]);
  });

  it('renders manual adjustment inputs, pedigree indicators, and warnings when parents exist and adjusted', () => {
    const onChange = vi.fn();
    const pedComp = { Hatch: 50, Sweater: 50 };
    const adjustedValue = [
      { breed: 'Hatch', percent: 75 },
      { breed: 'Sweater', percent: 25 },
    ];

    render(
      <DeclaredCompositionEditor
        registeredBreed="Crossbred"
        availableBreeds={['Hatch', 'Sweater', 'Kelso']}
        value={adjustedValue}
        onChange={onChange}
        hasParents={true}
        pedigreeComposition={pedComp}
      />
    );

    expect(screen.getByText('Adjusted by owner')).toBeDefined();
    expect(screen.getAllByText('(Ped: 50%)')).toHaveLength(2);
    expect(screen.getByText('Reset to calculated')).toBeDefined();
    // Warning because 75% differs from 50% by 25pp (>20pp)
    expect(screen.getAllByText(/differs by 25 percentage points/i)).toHaveLength(2);

    // Clicking reset to calculated calls onChange(null)
    fireEvent.click(screen.getByText('Reset to calculated'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
