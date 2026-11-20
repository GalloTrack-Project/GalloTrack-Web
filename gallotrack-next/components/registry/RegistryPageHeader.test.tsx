import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RegistryPageHeader from './RegistryPageHeader';

describe('RegistryPageHeader', () => {
  it('renders the title, subtitle, and both actions', () => {
    const onOpenBreeds = vi.fn();
    const onRegister = vi.fn();
    render(
      <RegistryPageHeader
        onOpenBreeds={onOpenBreeds}
        onRegister={onRegister}
        registerActive={false}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Chicken Registry/i })).toBeInTheDocument();
    expect(screen.getByText(/Register and manage your chicken lineage/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Breeds/i }));
    expect(onOpenBreeds).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Register Chicken/i }));
    expect(onRegister).toHaveBeenCalledTimes(1);
  });

  it('shows the back affordance and keeps Register Chicken active on the form', () => {
    const { container } = render(
      <RegistryPageHeader onOpenBreeds={vi.fn()} onRegister={vi.fn()} registerActive />,
    );

    expect(screen.getByRole('button', { name: /Breeds/i })).toBeInTheDocument();
    expect(container.querySelector('.lucide-arrow-left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Chicken/i }).className).toContain(
      'ring-brand-gold/60',
    );
  });
});
