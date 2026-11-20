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
});
