import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import AboutSection from '@/components/landing/AboutSection';
import CtaSection from '@/components/landing/CtaSection';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'GalloTrack — Advanced Gamefowl Breeding & Match Analytics Platform',
  description:
    'Optimize your gamefowl breeding program with verified lineage tracking, fight performance insights, and real-time flock management.',
  alternates: {
    canonical: 'https://gallotrack.vercel.app',
  },
  openGraph: {
    title: 'GalloTrack — Advanced Gamefowl Breeding & Match Analytics Platform',
    description:
      'Optimize your gamefowl breeding program with verified lineage tracking, fight performance insights, and real-time flock management.',
    url: 'https://gallotrack.vercel.app',
    siteName: 'GalloTrack',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GalloTrack — Advanced Gamefowl Breeding & Match Analytics Platform',
    description:
      'Optimize your gamefowl breeding program with verified lineage tracking, fight performance insights, and real-time flock management.',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-500">
      <LandingNavbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AboutSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
