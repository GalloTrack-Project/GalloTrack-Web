import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChickenPhoto from '@/components/ChickenPhoto';

const resolvePhoto = vi.hoisted(() => vi.fn());

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return {
    ...actual,
    resolveChickenPhotoUrl: resolvePhoto,
  };
});

describe('ChickenPhoto', () => {
  beforeEach(() => {
    resolvePhoto.mockReset();
    resolvePhoto.mockImplementation(async (path: string) => `https://cdn.test/${path}`);
  });

  it('shows the fallback when there is no photo', () => {
    render(<ChickenPhoto name="No Photo Bird" code="9Z" fallback={<span>Placeholder</span>} />);
    expect(screen.getByText('Placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText('Photo unavailable')).not.toBeInTheDocument();
  });

  it('loads only the thumbnail for the list, then the full image when the lightbox opens', async () => {
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
    expect(resolvePhoto).toHaveBeenCalledTimes(1);
    expect(resolvePhoto).toHaveBeenCalledWith('user-1/42/thumb.webp');

    trigger.focus();
    fireEvent.click(trigger);

    await waitFor(() =>
      expect(resolvePhoto).toHaveBeenCalledWith('user-1/42/full.webp'),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Hatch Silver (1A1)' })).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute(
      'src',
      'https://cdn.test/user-1/42/full.webp',
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('shows Photo unavailable with retry when paths exist but signing fails', async () => {
    resolvePhoto.mockResolvedValue(null);

    render(
      <ChickenPhoto
        name="Unavailable Bird"
        code="U1"
        photoPath="user-1/42/full.webp"
        photoThumbPath="user-1/42/thumb.webp"
        size={96}
        fallback={<span>Placeholder</span>}
      />,
    );

    expect(await screen.findByText('Photo unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Placeholder')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    const callsBeforeRetry = resolvePhoto.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(resolvePhoto.mock.calls.length).toBeGreaterThan(callsBeforeRetry),
    );
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
    expect(img).toHaveClass('object-cover');
    expect(img).toHaveStyle({ objectPosition: '50% 30%' });
  });

  it('can render the whole photo for the profile view', () => {
    render(
      <ChickenPhoto
        name="Profile Bird"
        code="P1"
        imageUrl="https://cdn.test/profile.jpg"
        size={96}
        fit="contain"
      />,
    );
    const img = screen.getByRole('img', { name: 'Profile Bird (P1)' });
    expect(img).toHaveClass('object-contain');
  });
});
