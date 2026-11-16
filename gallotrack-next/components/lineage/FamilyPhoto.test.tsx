import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import FamilyPhoto from './FamilyPhoto';
import type { FowlRecord } from '@/lib/types';

const resolvePhoto = vi.hoisted(() => vi.fn());

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return {
    ...actual,
    resolveChickenPhotoUrl: resolvePhoto,
  };
});

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

class ObserverMock {
  static instances: ObserverMock[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(private callback: ObserverCallback) {
    ObserverMock.instances.push(this);
  }
  trigger(isIntersecting = true) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

const bird = (overrides: Partial<FowlRecord> = {}): FowlRecord =>
  ({
    id: 1,
    name: 'Hatch Silver',
    breed: 'Hatch',
    gender: 'Rooster',
    color: 'Red',
    color_category: 'Red',
    growth_stage: 'Stag',
    behavior_trait: '',
    eye_variant: '',
    birthdate: '2025-01-01',
    age: '1y',
    weight: '2.1',
    height: '50',
    leg_color: 'Yellow',
    sire: '',
    dam: '',
    status: 'Active',
    bird_code: '1A2',
    ...overrides,
  }) as FowlRecord;

describe('FamilyPhoto', () => {
  beforeEach(() => {
    ObserverMock.instances = [];
    vi.stubGlobal('IntersectionObserver', ObserverMock);
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: ObserverMock,
    });
    resolvePhoto.mockReset();
    resolvePhoto.mockImplementation(async (path: string) => `https://cdn.test/${path}`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (window as Window & { IntersectionObserver?: typeof IntersectionObserver })
      .IntersectionObserver;
    vi.restoreAllMocks();
  });

  it('does not request a thumbnail until the avatar enters the viewport', async () => {
    render(
      <FamilyPhoto
        size={44}
        fowl={bird({
          photo_path: 'user-1/42/full.webp',
          photo_thumb_path: 'user-1/42/thumb.webp',
        })}
      />,
    );

    expect(resolvePhoto).not.toHaveBeenCalled();
    expect(screen.getByText('HS')).toBeInTheDocument();

    act(() => ObserverMock.instances[0].trigger(true));

    const avatar = await screen.findByRole('button', {
      name: 'View photo of Hatch Silver',
    });
    expect(within(avatar).getByRole('img')).toHaveAttribute('alt', 'Photo of Hatch Silver');
    expect(resolvePhoto).toHaveBeenCalledWith('user-1/42/thumb.webp');
  });

  it('opens the full-photo lightbox and supports View profile plus Escape focus return', async () => {
    const onViewProfile = vi.fn();
    render(
      <FamilyPhoto
        size={44}
        fowl={bird({
          photo_path: 'user-1/42/full.webp',
          photo_thumb_path: 'user-1/42/thumb.webp',
        })}
        onViewProfile={onViewProfile}
      />,
    );
    act(() => ObserverMock.instances[0].trigger(true));

    const avatar = await screen.findByRole('button', {
      name: 'View photo of Hatch Silver',
    });
    avatar.focus();
    fireEvent.click(avatar);

    await waitFor(() =>
      expect(resolvePhoto).toHaveBeenCalledWith('user-1/42/full.webp'),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Hatch Silver (1A2)' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'View profile' }));
    expect(onViewProfile).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(avatar).toHaveFocus();

    fireEvent.click(avatar);
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(avatar).toHaveFocus();
  });

  it('shows initials for a bird with no photo and makes no signing request', async () => {
    render(<FamilyPhoto size={32} fowl={bird({ name: 'No Photo' })} />);
    act(() => ObserverMock.instances[0].trigger(true));

    expect(await screen.findByText('NP')).toBeInTheDocument();
    expect(await screen.findByTitle('No photo')).toBeInTheDocument();
    expect(resolvePhoto).not.toHaveBeenCalled();
  });

  it('shows Photo unavailable with a tooltip and logs the failing path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resolvePhoto.mockResolvedValue(null);

    render(
      <FamilyPhoto
        size={44}
        fowl={bird({
          name: 'Unavailable Cock',
          photo_path: 'user-1/42/full.webp',
          photo_thumb_path: 'user-1/42/thumb.webp',
        })}
      />,
    );
    act(() => ObserverMock.instances[0].trigger(true));

    const unavailable = await screen.findByRole('button', {
      name: /Photo unavailable/i,
    });
    expect(unavailable).toHaveAttribute('title', expect.stringContaining('Photo unavailable'));
    expect(warn).toHaveBeenCalledWith(
      '[chicken-photo] photo unavailable',
      expect.objectContaining({ path: 'user-1/42/thumb.webp' }),
    );
  });
});
