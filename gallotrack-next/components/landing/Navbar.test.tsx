import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageProvider } from '@/lib/i18n';
import LandingNavbar from './Navbar';

const mockUseAuth = vi.fn();
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: mockSetTheme }),
}));

type ObserverCallback = ConstructorParameters<typeof IntersectionObserver>[0];

let observerCallback: ObserverCallback | null = null;
let observed: Element[] = [];

class MockIntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
  observe(element: Element) {
    observed.push(element);
  }
  unobserve() {}
  disconnect() {
    observed = [];
  }
  takeRecords() {
    return [];
  }
}

describe('Landing header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observerCallback = null;
    observed = [];
    mockUseAuth.mockReturnValue({ currentUserId: null });
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the brand, anchor links, language switcher, theme toggle, and auth routes', () => {
    render(<LandingNavbar />);

    expect(screen.getByRole('link', { name: /GalloTrack home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('button', { name: /Change language/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to light mode/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Log in$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^Sign up$/i })).toHaveAttribute('href', '/register');
  });

  it('marks the section in view as active in the scroll spy', () => {
    render(
      <div>
        <div id="features" />
        <div id="how-it-works" />
        <LandingNavbar />
      </div>,
    );

    const features = document.getElementById('features');
    const howItWorks = document.getElementById('how-it-works');
    expect(features).not.toBeNull();
    expect(howItWorks).not.toBeNull();

    act(() => {
      observerCallback?.(
        [
          { isIntersecting: true, target: features } as unknown as IntersectionObserverEntry,
          { isIntersecting: false, target: howItWorks } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    const activeLink = screen.getByRole('link', { name: 'Features' });
    expect(activeLink).toHaveAttribute('aria-current', 'location');
    expect(activeLink).toHaveClass('bg-accent-soft', 'text-brand-red');
    expect(activeLink.querySelector('svg')).not.toBeNull();
  });

  it('opens a mobile drawer, traps Tab focus, and closes with Escape', async () => {
    render(<LandingNavbar />);

    const trigger = screen.getByRole('button', { name: /Open menu/i });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /^Sign up$/i })).toHaveAttribute(
      'href',
      '/register',
    );

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    last?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('toggles the theme and changes the language', () => {
    render(
      <LanguageProvider initialLanguage="en">
        <LandingNavbar />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Switch to light mode/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    fireEvent.click(screen.getByRole('button', { name: /Change language/i }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Tagalog/i }));
    expect(screen.getByRole('link', { name: 'Mga Tampok' })).toHaveAttribute(
      'href',
      '#features',
    );
    expect(screen.getByRole('link', { name: 'Paano ito gumagana' })).toBeInTheDocument();
  });

  it('uses the landing anchor prefix on auth pages', () => {
    render(<LandingNavbar linkPrefix="/" />);

    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute(
      'href',
      '/#features',
    );
    expect(screen.getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '/#how-it-works',
    );
  });
});
