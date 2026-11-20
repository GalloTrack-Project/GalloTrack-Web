import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroCarousel from './HeroCarousel';
import { HERO_SLIDES } from '@/lib/hero-slides';

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
    render(<HeroCarousel slides={[HERO_SLIDES[0]]} />);

    expect(screen.getByAltText(HERO_SLIDES[0].alt)).toBeInTheDocument();
    expect(screen.getByText(HERO_SLIDES[0].caption)).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Next farm photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pause gallery/i })).not.toBeInTheDocument();
  });

  it('renders arrows, dots, and a visible pause button for multiple images', () => {
    render(<HeroCarousel slides={HERO_SLIDES} />);

    expect(screen.getByRole('button', { name: /Previous farm photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next farm photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pause gallery/i })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(HERO_SLIDES.length);

    fireEvent.click(screen.getByRole('button', { name: /Next farm photo/i }));
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pause gallery/i }));
    expect(screen.getByRole('button', { name: /Play gallery/i })).toBeInTheDocument();
  });

  it('exposes carousel and slide semantics, framing, and active dot color', () => {
    const { container } = render(<HeroCarousel slides={HERO_SLIDES} />);

    const carousel = screen.getByRole('region', { name: /Farm photo gallery/i });
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');

    const slideGroups = container.querySelectorAll('[role="group"]');
    expect(slideGroups).toHaveLength(HERO_SLIDES.length);
    expect(slideGroups[0]).toHaveAttribute('aria-label', `1 of ${HERO_SLIDES.length}`);
    expect(slideGroups[2]).toHaveAttribute('aria-label', `3 of ${HERO_SLIDES.length}`);

    const images = container.querySelectorAll('img');
    expect(images[0]).toHaveStyle({ objectPosition: 'center 35%' });
    expect(images[2]).toHaveStyle({ objectPosition: 'center' });

    const dots = screen.getAllByRole('tab');
    expect(dots[0].querySelector('span')).toHaveClass('bg-[#C8102E]');
    expect(dots[1].querySelector('span')).toHaveClass('bg-white');
  });

  it('supports arrow keys and swipe navigation', () => {
    render(<HeroCarousel slides={HERO_SLIDES} />);

    const carousel = screen.getByRole('region', { name: /Farm photo gallery/i });
    const nextButton = screen.getByRole('button', { name: /Next farm photo/i });
    nextButton.focus();
    fireEvent.keyDown(nextButton, { key: 'ArrowRight' });
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();

    fireEvent.keyDown(nextButton, { key: 'ArrowLeft' });
    expect(screen.getByText(HERO_SLIDES[0].caption)).toBeInTheDocument();

    fireEvent.touchStart(carousel, { touches: [{ clientX: 240 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 80 }] });
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();
  });

  it('autoplays after 5 seconds, pauses on hover, and stays paused when the pause button is used', () => {
    vi.useFakeTimers();
    render(<HeroCarousel slides={HERO_SLIDES} />);

    expect(screen.getByText(HERO_SLIDES[0].caption)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText(HERO_SLIDES[0].caption)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();

    const region = screen.getByRole('region', { name: /Farm photo gallery/i });
    fireEvent.mouseEnter(region);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();

    fireEvent.mouseLeave(region);
    fireEvent.click(screen.getByRole('button', { name: /Pause gallery/i }));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_SLIDES[1].caption)).toBeInTheDocument();
  });

  it('does not autoplay when reduced motion is requested', () => {
    stubMatchMedia(true);
    vi.useFakeTimers();
    render(<HeroCarousel slides={HERO_SLIDES} />);

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText(HERO_SLIDES[0].caption)).toBeInTheDocument();
  });

  it('falls back to the gradient and brand mark when the photo fails', () => {
    render(<HeroCarousel slides={[HERO_SLIDES[0]]} />);

    fireEvent.error(screen.getByAltText(HERO_SLIDES[0].alt));
    expect(screen.getByTestId(`hero-fallback-${HERO_SLIDES[0].id}`)).toBeInTheDocument();
    expect(screen.getByText(/Photo preview unavailable/i)).toBeInTheDocument();
  });
});
