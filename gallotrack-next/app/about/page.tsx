import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/Navbar';
import LandingSkipLink from '@/components/landing/LandingSkipLink';
import LandingThemeScope from '@/components/landing/LandingThemeScope';
import Footer from '@/components/landing/Footer';
import AboutHero from '@/components/about/AboutHero';
import AboutFeatures from '@/components/about/AboutFeatures';
import CtaBanner from '@/components/about/CtaBanner';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how GalloTrack organizes gamefowl lineage, pedigree records, farm privacy, and match analytics for breeders.',
  alternates: {
    canonical: 'https://gallotrack.vercel.app/about',
  },
  openGraph: {
    title: 'About GalloTrack',
    description:
      'Learn how GalloTrack organizes gamefowl lineage, pedigree records, farm privacy, and match analytics for breeders.',
    url: 'https://gallotrack.vercel.app/about',
    siteName: 'GalloTrack',
    locale: 'en_US',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <LandingThemeScope>
      <LandingSkipLink />
      <LandingNavbar linkPrefix="/" activePage="about" />
      <main id="main-content" className="flex-1">
        <AboutHero />
        <AboutFeatures />
        <CtaBanner />
      </main>
      <Footer linkPrefix="/" />
    </LandingThemeScope>
  );
}
