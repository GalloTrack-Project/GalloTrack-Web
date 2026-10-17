import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { GalloTrackProvider } from "@/lib/context";
import { ToastProvider } from "@/components/ui";
import RootErrorBoundary from "@/components/RootErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://gallotrack.vercel.app'),
  title: {
    template: "%s | GalloTrack",
    default: "GalloTrack | Gamefowl Breeding & Match Analytics",
  },
  description: "Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "GalloTrack | Gamefowl Breeding & Match Analytics",
    description: "Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.",
    url: "https://gallotrack.vercel.app",
    siteName: "GalloTrack",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GalloTrack | Gamefowl Breeding & Match Analytics",
    description: "Optimize your gamefowl breeding program with lineage tracking, fight performance logs, and real-time flock management.",
  },
};

export const viewport: Viewport = {
  themeColor: "#022c22",
};

import StagingBanner from "@/components/StagingBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="theme">
          <ToastProvider>
            <GalloTrackProvider>
              <RootErrorBoundary>
                <div className="min-h-full w-full flex flex-col">
                  <StagingBanner />
                  {children}
                </div>
              </RootErrorBoundary>
            </GalloTrackProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
