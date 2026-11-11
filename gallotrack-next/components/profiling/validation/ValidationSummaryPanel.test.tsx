import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ValidationSummaryPanel, type ValidationSummaryPanelProps } from './ValidationSummaryPanel';
import type { ValidationFieldItem } from './types';

const fieldLabels = [
  ['Identifier Name', 'identifier-name'],
  ['Genetic Strain', 'genetic-strain'],
  ['Gender Class', 'gender-class'],
  ['Birth Date', 'birth-date'],
] as const;

function fields(complete: boolean[]): ValidationFieldItem[] {
  return fieldLabels.map(([label, targetId], index) => ({
    key: (['name', 'strain', 'gender', 'birthdate'] as const)[index],
    label,
    targetId,
    complete: complete[index] ?? false,
  }));
}

function baseProps(overrides: Partial<ValidationSummaryPanelProps> = {}): ValidationSummaryPanelProps {
  return {
    nextIdLabel: 'Sire 4',
    requiredFields: fields([false, false, false, false]),
    dataCompleteness: 0,
    validationTone: 'warning',
    validationLabel: 'Incomplete',
    validationHelper: 'Complete 4 required fields to register.',
    lineageTone: 'neutral',
    lineageLabel: 'Not required',
    lineageHelper: 'No parents selected — lineage starts with this chicken.',
    registerDisabled: true,
    registerBusy: false,
    registerLabel: 'REGISTER',
    registerHelper: 'Complete 4 required fields to register.',
    ...overrides,
  };
}

describe('ValidationSummaryPanel', () => {
  it('shows the empty state with a 0 of 4 checklist and disabled register', () => {
    render(<ValidationSummaryPanel {...baseProps()} />);

    expect(screen.getByText('Required fields')).toBeInTheDocument();
    expect(screen.getByText('0 of 4 required fields completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getAllByText('Missing').length).toBe(4);

    const register = screen.getByRole('button', { name: /REGISTER/i });
    expect(register).toBeDisabled();
    expect(register.className).toContain('cursor-not-allowed');
    expect(screen.getAllByText('Complete 4 required fields to register.').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Missing:/i)).not.toBeInTheDocument();
  });

  it('shows partial progress and completed/missing checklist items', () => {
    render(
      <ValidationSummaryPanel
        {...baseProps({
          requiredFields: fields([true, true, false, false]),
          validationHelper: 'Complete 2 required fields to register.',
          registerHelper: 'Complete 2 required fields to register.',
        })}
      />,
    );

    expect(screen.getByText('2 of 4 required fields completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getAllByText('Complete').length).toBe(2);
    expect(screen.getAllByText('Missing').length).toBe(2);
  });

  it('shows the success state and enables register when everything is complete', () => {
    render(
      <ValidationSummaryPanel
        {...baseProps({
          requiredFields: fields([true, true, true, true]),
          validationTone: 'success',
          validationLabel: 'Ready',
          validationHelper: 'All required fields are complete and valid.',
          registerDisabled: false,
          registerHelper: '🔒 Verify lineage accuracy before registering to the farm registry.',
        })}
      />,
    );

    expect(screen.getByText('4 of 4 required fields completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getAllByText('Complete').length).toBeGreaterThanOrEqual(5);
    expect(
      screen.getByText('All required fields are complete. Ready to register.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();

    const register = screen.getByRole('button', { name: /REGISTER/i });
    expect(register).toBeEnabled();
    expect(register.className).not.toContain('cursor-not-allowed');
  });

  it('shows the submitting state with aria-busy and a disabled register button', () => {
    render(
      <ValidationSummaryPanel
        {...baseProps({
          requiredFields: fields([true, true, true, true]),
          registerBusy: true,
          registerLabel: 'Registering...',
          registerHelper: 'Registering...',
        })}
      />,
    );

    const register = screen.getByRole('button', { name: /Registering/i });
    expect(register).toBeDisabled();
    expect(register).toHaveAttribute('aria-busy', 'true');
    expect(register.className).toContain('cursor-not-allowed');
  });

  it('shows the error state with a readable reason', () => {
    render(
      <ValidationSummaryPanel
        {...baseProps({
          requiredFields: fields([true, true, true, true]),
          validationTone: 'error',
          validationLabel: 'Needs attention',
          validationHelper: 'Birth date cannot be in the future.',
          registerHelper: 'Birth date cannot be in the future.',
        })}
      />,
    );

    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.getAllByText('Birth date cannot be in the future.').length).toBeGreaterThanOrEqual(1);
  });

  it('focuses the matching form field from each checklist item', () => {
    render(
      <div>
        <input id="identifier-name" aria-label="Identifier input" />
        <input id="genetic-strain" aria-label="Strain input" />
        <select id="gender-class" aria-label="Gender input">
          <option>Rooster</option>
        </select>
        <input id="birth-date" type="date" aria-label="Birth date input" />
        <ValidationSummaryPanel {...baseProps()} />
      </div>,
    );

    const cases = [
      ['Identifier Name', 'identifier-name'],
      ['Genetic Strain', 'genetic-strain'],
      ['Gender Class', 'gender-class'],
      ['Birth Date', 'birth-date'],
    ] as const;

    for (const [label, id] of cases) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Go to ${label}`, 'i') }));
      expect(document.getElementById(id)).toHaveFocus();
    }
  });
});

