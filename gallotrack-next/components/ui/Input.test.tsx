import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders a textbox and passes through props', () => {
    render(<Input aria-label="Flock name" placeholder="Batch 12" />);
    const input = screen.getByRole('textbox', { name: 'Flock name' });
    expect(input).toHaveAttribute('placeholder', 'Batch 12');
  });

  it('marks itself invalid with a danger border when aria-invalid is set', () => {
    render(<Input aria-label="Flock name" aria-invalid />);
    const input = screen.getByRole('textbox', { name: 'Flock name' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.className).toContain('aria-[invalid=true]:border-danger');
  });

  it('never emits text below the 12px floor', () => {
    render(<Input aria-label="x" />);
    expect(screen.getByRole('textbox').className).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
  });
});
