import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import HowItWorksSection from './HowItWorksSection';

describe('How It Works section', () => {
  it('renders the badge, highlighted title, subtitle, and four step cards', () => {
    render(<HowItWorksSection />);

    const section = document.getElementById('how-it-works');
    expect(section).not.toBeNull();
    expect(screen.getByText('SIMPLE • SMART • POWERFUL')).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 2, name: /How GalloTrack Works/i });
    expect(within(heading).getByText('GalloTrack')).toHaveClass('text-brand-red');
    expect(
      screen.getByText(
        /A structured protocol from breeder registration through match logs and win rate tracking/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('04')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Register Your Breeders' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Track Offspring & Lineage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Record Match Logs' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Review Performance & Insights' }),
    ).toBeInTheDocument();
  });

  it('uses the requested step copy and renders the footer wave', () => {
    render(<HowItWorksSection />);

    expect(screen.getByText(/Breeding Roosters/i)).toBeInTheDocument();
    expect(screen.getByText(/structured offspring codes/i)).toBeInTheDocument();
    expect(screen.getByText(/arena location, fight outcome/i)).toBeInTheDocument();
    expect(screen.getByText(/track health records/i)).toBeInTheDocument();
    expect(screen.getByTestId('how-it-works-footer-wave')).toBeInTheDocument();
  });
});
