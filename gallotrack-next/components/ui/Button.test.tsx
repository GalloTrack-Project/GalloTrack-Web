import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from './Button';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('honours an explicit type="submit"', () => {
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
  });

  it('exposes aria-busy and disables itself while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('does not set aria-busy when idle', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-busy');
  });

  it('keeps its accessible name while loading', () => {
    render(<Button loading>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick while disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each([
    ['primary', 'bg-primary'],
    ['secondary', 'border'],
    ['ghost', 'hover:bg-muted'],
    ['danger', 'bg-danger'],
    ['link', 'underline-offset-4'],
  ] as const)('applies the %s variant', (variant, expected) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass(expected);
  });

  it.each([
    ['sm', 'h-9'],
    ['md', 'h-10'],
    ['lg', 'h-12'],
    ['icon', 'w-10'],
  ] as const)('applies the %s size', (size, expected) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole('button', { name: 'x' })).toHaveClass(expected);
  });

  it('never emits text below the 12px floor or font-black', () => {
    render(<Button size="sm">x</Button>);
    const className = screen.getByRole('button', { name: 'x' }).className;
    expect(className).not.toMatch(/text-\[(?:[0-9]|1[01])px\]/);
    expect(className).not.toContain('font-black');
  });

  it('exposes variant classes through the exported cva helper', () => {
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-danger');
  });
});
