import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/Navbar';
import LandingSkipLink from '@/components/landing/LandingSkipLink';
import LandingThemeScope from '@/components/landing/LandingThemeScope';
import HeroSection from '@/components/landing/HeroSection';
import FeatureStrip from '@/components/landing/FeatureStrip';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import AboutSection from '@/components/landing/AboutSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: {
    absolute: 'GalloTrack | Gamefowl Breeding & Match Analytics',
  },
  description:
    'Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.',
  alternates: {
    canonical: 'https://gallotrack.vercel.app',
  },
  openGraph: {
    title: 'GalloTrack | Gamefowl Breeding & Match Analytics',
    description:
      'Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.',
    url: 'https://gallotrack.vercel.app',
    siteName: 'GalloTrack',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GalloTrack | Gamefowl Breeding & Match Analytics',
    description:
      'Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.',
  },
};

export default function LandingPage() {
  return (
    <LandingThemeScope>
      <LandingSkipLink />
      <LandingNavbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <FeatureStrip />
        <FeaturesSection />
        <HowItWorksSection />
        <AboutSection />
        <CtaSection />
      </main>
      <Footer />
    </LandingThemeScope>
  );
}
