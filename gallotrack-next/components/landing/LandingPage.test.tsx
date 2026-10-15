import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';
import LandingNavbar from './Navbar';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';
import AboutSection from './AboutSection';
import CtaSection from './CtaSection';
import Footer from './Footer';
import ProductPreviewMockup from './ProductPreviewMockup';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: vi.fn() }),
}));

describe('GalloTrack Public Landing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      currentUserId: null,
      username: '',
    });
  });

  describe('Page Rendering & Semantic Layout', () => {
    it('renders the complete landing page with all core sections for visitors', () => {
      render(<LandingPage />);

      // Single H1 in Hero
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(/Advanced Gamefowl/i);

      // Section headings
      expect(screen.getByText(/Core Capabilities/i)).toBeInTheDocument();
      expect(screen.getByText(/How GalloTrack Works/i)).toBeInTheDocument();
      expect(screen.getByText(/About GalloTrack/i)).toBeInTheDocument();
      expect(screen.getByText(/Start Managing Your Breeding Records with GalloTrack/i)).toBeInTheDocument();

      // Brand Logo in navbar and footer
      const brandLogos = screen.getAllByText(/GALLO/i);
      expect(brandLogos.length).toBeGreaterThanOrEqual(2);

      // Capstone Credit
      const capstoneCredits = screen.getAllByText(/ISUFST CICT Capstone Project/i);
      expect(capstoneCredits.length).toBeGreaterThan(0);
    });

    it('contains all 4 core features matching the current app capabilities', () => {
      render(<FeaturesSection />);

      expect(screen.getByRole('heading', { name: /Lineage Tracking/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Match Analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Flock Dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Farm Registry/i })).toBeInTheDocument();

      // Concrete descriptions mention real concepts (sire/dam, 1A1, outcomes)
      expect(screen.getByText(/sire and dam/i)).toBeInTheDocument();
      expect(screen.getByText(/1A1, 2B1/i)).toBeInTheDocument();
      expect(screen.getByText(/win, loss, draw/i)).toBeInTheDocument();
    });

    it('contains all 4 concrete workflow steps', () => {
      render(<HowItWorksSection />);

      expect(screen.getByRole('heading', { name: /Register Your Breeders/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Track Offspring & Lineage/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Record Match Logs/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Review Performance & Insights/i })).toBeInTheDocument();
    });
  });

  describe('Hero Preview Card Generic Sample Data', () => {
    it('uses neutral generic sample data and displays a Sample Data badge', () => {
      render(<ProductPreviewMockup />);

      // Badge
      expect(screen.getByText(/Sample Data/i)).toBeInTheDocument();

      // Neutral placeholders
      expect(screen.getByText(/Sample Rooster/i)).toBeInTheDocument();
      expect(screen.getByText(/Sample Sire/i)).toBeInTheDocument();
      expect(screen.getByText(/Sample Dam/i)).toBeInTheDocument();
      expect(screen.getByText(/Won vs Opponent A/i)).toBeInTheDocument();
      expect(screen.getByText(/Sample Arena/i)).toBeInTheDocument();

      // No real names or venues
      expect(screen.queryByText(/Iron Storm/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Iron Lemon/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Kelso Express/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/San Juan Coliseum/i)).not.toBeInTheDocument();
    });
  });

  describe('Logged-Out (Visitor) CTA Behavior', () => {
    it('shows Log in and Sign up buttons pointing to correct auth routes in Navbar', () => {
      render(<LandingNavbar />);

      const loginLinks = screen.getAllByRole('link', { name: /^Log in$/i });
      expect(loginLinks.some((l) => l.getAttribute('href') === '/login')).toBe(true);

      const signupLinks = screen.getAllByRole('link', { name: /^Sign up$/i });
      expect(signupLinks.some((l) => l.getAttribute('href') === '/register')).toBe(true);
    });

    it('shows Get Started and Log in in HeroSection for visitors', () => {
      render(<HeroSection />);

      const getStarted = screen.getByRole('link', { name: /Get Started/i });
      expect(getStarted).toHaveAttribute('href', '/register');

      const loginLink = screen.getByRole('link', { name: /^Log in$/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('shows Create an Account and Log in in CtaSection for visitors', () => {
      render(<CtaSection />);

      const signupLink = screen.getByRole('link', { name: /Create an Account/i });
      expect(signupLink).toHaveAttribute('href', '/register');

      const loginLink = screen.getByRole('link', { name: /^Log in$/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('renders clean footer links without broken privacy or terms pages', () => {
      render(<Footer />);

      expect(screen.queryByRole('link', { name: /Privacy/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Terms/i })).not.toBeInTheDocument();

      const loginLink = screen.getByRole('link', { name: /^Log in$/i });
      expect(loginLink).toHaveAttribute('href', '/login');

      const signupLink = screen.getByRole('link', { name: /^Sign up$/i });
      expect(signupLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Logged-In CTA Adaptation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        currentUserId: 'user-uuid-1234',
        username: 'breeder@example.com',
      });
    });

    it('adapts Navbar CTA to Open Dashboard for authenticated users', () => {
      render(<LandingNavbar />);

      const dashboardLinks = screen.getAllByRole('link', { name: /Open Dashboard/i });
      expect(dashboardLinks.length).toBeGreaterThan(0);
      expect(dashboardLinks[0]).toHaveAttribute('href', '/dashboard');
      expect(screen.queryByRole('link', { name: /^Sign up$/i })).not.toBeInTheDocument();
    });

    it('adapts HeroSection CTA to Open Dashboard for authenticated users', () => {
      render(<HeroSection />);

      const dashboardLink = screen.getByRole('link', { name: /Open Dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(screen.queryByRole('link', { name: /Get Started/i })).not.toBeInTheDocument();
    });

    it('adapts CtaSection CTA to Open Dashboard for authenticated users', () => {
      render(<CtaSection />);

      const dashboardLink = screen.getByRole('link', { name: /Open Dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(screen.queryByRole('link', { name: /Create an Account/i })).not.toBeInTheDocument();
    });
  });

  describe('Content Rules & Verification Safeguards', () => {
    it('does not display unverified claims or hardcoded stats from the old login panel', () => {
      const { container } = render(<LandingPage />);

      // Must NOT contain hardcoded "32+ chickens", "4+ active farms", or "100% open source"
      expect(container.textContent).not.toMatch(/32\+\s*chickens/i);
      expect(container.textContent).not.toMatch(/4\+\s*active farms/i);
      expect(container.textContent).not.toMatch(/100%\s*open source/i);

      // Must NOT contain exaggerated unsupported claims
      expect(container.textContent).not.toMatch(/unalterable generational records/i);
      expect(container.textContent).not.toMatch(/indisputable, digitized pedigree database/i);
      expect(container.textContent).not.toMatch(/seamless multi-farm support/i);
    });
  });
});
