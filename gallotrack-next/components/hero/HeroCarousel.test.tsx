import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroCarousel from './HeroCarousel';
import { HERO_IMAGES } from '@/lib/hero-config';

function stubMatchMedia(reduceMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('HeroCarousel', () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the config photo and caption with no controls for a single image', () => {
    render(<HeroCarousel images={[HERO_IMAGES[0]]} />);

    expect(screen.getByAltText(HERO_IMAGES[0].alt)).toBeInTheDocument();
    expect(screen.getByText(HERO_IMAGES[0].caption)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next farm photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pause gallery/i })).not.toBeInTheDocument();
  });

  it('renders arrows, dots, and a visible pause button for multiple images', () => {
    render(<HeroCarousel images={HERO_IMAGES} />);

    expect(screen.getByRole('button', { name: /Previous farm photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next farm photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause gallery/i })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(HERO_IMAGES.length);

    fireEvent.click(screen.getByRole('button', { name: /Next farm photo/i }));
    expect(screen.getByText(HERO_IMAGES[1].caption)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pause gallery/i }));
    expect(screen.getByRole('button', { name: /Play gallery/i })).toBeInTheDocument();
  });

  it('autoplays, pauses on hover, and stays paused when the pause button is used', () => {
    vi.useFakeTimers();
    render(<HeroCarousel images={HERO_IMAGES} />);

    expect(screen.getByText(HERO_IMAGES[0].caption)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_IMAGES[1].caption)).toBeInTheDocument();

    const region = screen.getByRole('region', { name: /Farm photo gallery/i });
    fireEvent.mouseEnter(region);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_IMAGES[1].caption)).toBeInTheDocument();

    fireEvent.mouseLeave(region);
    fireEvent.click(screen.getByRole('button', { name: /Pause gallery/i }));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_IMAGES[1].caption)).toBeInTheDocument();
  });

  it('does not autoplay when reduced motion is requested', () => {
    stubMatchMedia(true);
    vi.useFakeTimers();
    render(<HeroCarousel images={HERO_IMAGES} />);

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_IMAGES[0].caption)).toBeInTheDocument();
  });

  it('falls back to the gradient and brand mark when the photo fails', () => {
    render(<HeroCarousel images={[HERO_IMAGES[0]]} />);

    fireEvent.error(screen.getByAltText(HERO_IMAGES[0].alt));
    expect(screen.getByTestId(`hero-fallback-${HERO_IMAGES[0].id}`)).toBeInTheDocument();
    expect(screen.getByText(/Photo preview unavailable/i)).toBeInTheDocument();
  });
});
