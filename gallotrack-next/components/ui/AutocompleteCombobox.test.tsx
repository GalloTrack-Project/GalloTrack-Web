import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AutocompleteCombobox from './AutocompleteCombobox';

const SAVED_VALUES = ['Honey Lemon', 'Thunder Hatch', 'N/A', 'Lemon', 'Hatch'];

function ControlledCombobox({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <AutocompleteCombobox
      id="gt-test-color"
      value={value}
      onChange={setValue}
      options={SAVED_VALUES}
      placeholder="Select color"
      listboxLabel="Colors"
    />
  );
}

describe('AutocompleteCombobox', () => {
  it('suppresses native autocomplete and exposes combobox ARIA attributes', () => {
    const { container } = render(<ControlledCombobox />);
    const input = screen.getByRole('combobox');

    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
    expect(input).toHaveAttribute('name', 'gt-test-color');
    expect(input).toHaveAttribute('id', 'gt-test-color');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('data-lpignore', 'true');
    expect(input).toHaveAttribute('data-1p-ignore', 'true');
    expect(input).toHaveAttribute('data-form-type', 'other');
    expect(input).not.toHaveAttribute('list');
    expect(container.querySelector('datalist')).not.toBeInTheDocument();
  });

  it('filters the custom listbox and selects with the keyboard', () => {
    render(<ControlledCombobox />);
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Lem' } });
    expect(screen.getByRole('listbox', { name: 'Colors' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Honey Lemon' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Lemon' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Hatch' })).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', 'gt-test-color-listbox');
    expect(input).toHaveAttribute('aria-activedescendant', 'gt-test-color-option-0');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Honey Lemon');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects with the mouse and closes on Escape and Tab', () => {
    render(<ControlledCombobox />);
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Thunder' } });
    fireEvent.click(screen.getByRole('option', { name: 'Thunder Hatch' }));
    expect(input).toHaveValue('Thunder Hatch');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole('listbox', { name: 'Colors' })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('allows a custom value that is not in the option list', () => {
    render(<ControlledCombobox />);
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Unique Turquoise Spark' } });
    expect(input).toHaveValue('Unique Turquoise Spark');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
