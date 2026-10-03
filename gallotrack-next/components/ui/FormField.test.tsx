import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';

describe('FormField', () => {
  it('wires the label to the control with htmlFor/id', () => {
    render(
      <FormField label="Flock name" id="flock">
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(screen.getByLabelText('Flock name')).toBe(screen.getByRole('textbox'));
  });

  it('links the description through aria-describedby', () => {
    render(
      <FormField label="Flock name" id="flock" description="Shown on reports">
        {(field) => <input {...field} />}
      </FormField>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAccessibleDescription('Shown on reports');
  });

  it('marks the control invalid and announces the error', () => {
    render(
      <FormField label="Flock name" id="flock" error="Required">
        {(field) => <input {...field} />}
      </FormField>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('combines description and error into one describedby list', () => {
    render(
      <FormField label="Flock name" id="flock" description="Shown on reports" error="Required">
        {(field) => <input {...field} />}
      </FormField>,
    );
    const describedBy = screen.getByRole('textbox').getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toEqual(['flock-description', 'flock-error']);
  });

  it('emits no aria-describedby when there is nothing to describe', () => {
    render(
      <FormField label="Flock name" id="flock">
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('marks required on the control and hides the visual asterisk from AT', () => {
    render(
      <FormField label="Flock name" id="flock" required>
        {(field) => <input {...field} />}
      </FormField>,
    );
    expect(screen.getByRole('textbox')).toBeRequired();
    expect(screen.getByLabelText(/Flock name/)).toBeInTheDocument();
  });
});
