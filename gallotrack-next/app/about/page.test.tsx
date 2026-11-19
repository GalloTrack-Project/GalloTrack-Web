import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AboutPage from './page';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ currentUserId: null }),
}));

describe('About page', () => {
  it('renders the hero, info card, feature cards, CTA, and shared chrome', () => {
    render(<AboutPage />);

    const currentAbout = screen
      .getAllByRole('link', { name: 'About' })
      .find((link) => link.getAttribute('aria-current') === 'page');
    expect(currentAbout).toHaveAttribute('href', '/about');

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/About GalloTrack/i);
    expect(screen.getByText('Academic Capstone Project')).toBeInTheDocument();
    expect(screen.getAllByText(/ISUFST CICI Capstone Project/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/leading to lost parentage records/i)).toBeInTheDocument();
    expect(screen.getByText(/GalloTrack addresses these challenges/i)).toBeInTheDocument();

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Lineage Consistency' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Farm Privacy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Match Analytics' })).toBeInTheDocument();
    expect(screen.getByText(/Structured parentage mapping and offspring birth codes/i)).toBeInTheDocument();
    expect(screen.getByText(/Isolated records per farm account/i)).toBeInTheDocument();
    expect(screen.getByText(/Match records, outcome tracking, and condition logs/i)).toBeInTheDocument();

    const cta = screen
      .getByRole('heading', { level: 2, name: /Start Managing Your Breeding Records with GalloTrack/i })
      .closest('section');
    expect(cta).not.toBeNull();
    expect(within(cta as HTMLElement).getByRole('link', { name: /Create an Account/i })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(within(cta as HTMLElement).getByRole('link', { name: /^Log in$/i })).toHaveAttribute(
      'href',
      '/login',
    );

    expect(screen.getByRole('img', { name: /Colorful gamefowl rooster/i })).toBeInTheDocument();
  });
});
