import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChickenPhoto from '@/components/ChickenPhoto';

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return {
    ...actual,
    resolveChickenPhotoUrl: vi.fn().mockResolvedValue('https://cdn.test/signed-photo.webp'),
  };
});

describe('ChickenPhoto', () => {
  it('shows the fallback when there is no photo', () => {
    render(<ChickenPhoto name="No Photo Bird" code="9Z" fallback={<span>Placeholder</span>} />);
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders a lazy thumbnail with correct alt text and opens the full photo lightbox', async () => {
    render(
      <ChickenPhoto
        name="Hatch Silver"
        code="1A1"
        photoPath="user-1/42/full.webp"
        photoThumbPath="user-1/42/thumb.webp"
        size={48}
      />,
    );

    const trigger = await screen.findByRole('button', {
      name: 'View photo of Hatch Silver (1A1)',
    });
    const img = within(trigger).getByRole('img');
    expect(img).toHaveAttribute('alt', 'Hatch Silver (1A1)');
    expect(img).toHaveAttribute('width', '48');
    expect(img).toHaveAttribute('height', '48');
    expect(img).toHaveAttribute('loading', 'lazy');

    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Hatch Silver (1A1)' })).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.test/signed-photo.webp',
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('uses the legacy image URL without crashing when the new paths are absent', () => {
    render(
      <ChickenPhoto
        name="Legacy Bird"
        code="L1"
        imageUrl="https://cdn.test/legacy.jpg"
        interactive={false}
        size={32}
      />,
    );
    const img = screen.getByRole('img', { name: 'Legacy Bird (L1)' });
    expect(img).toHaveAttribute('src', 'https://cdn.test/legacy.jpg');
  });
});
