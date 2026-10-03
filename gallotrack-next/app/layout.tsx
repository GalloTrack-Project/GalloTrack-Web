import type { Metadata } from "next";
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
  title: "GalloTrack",
  description: "Optimizing Chicken Management through In-Depth Analytics",
};

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
