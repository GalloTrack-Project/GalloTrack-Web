import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";

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
  description: "Optimizing Gamefowl Management through In-Depth Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <div className="h-full w-full overflow-hidden flex flex-col">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}