import type { ReactNode } from 'react';
import { Feather } from 'lucide-react';
import WaveDecor from './WaveDecor';

export default function AuthLayout({
  branding,
  children,
}: {
  branding: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-background relative flex min-h-[100dvh] w-full flex-col lg:grid lg:h-[100dvh] lg:min-h-0 lg:grid-cols-[59%_41%] lg:overflow-hidden">
      {branding}
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-background relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:py-4"
      >
        <Feather
          aria-hidden="true"
          className="text-brand-orange/10 pointer-events-none absolute -top-10 -right-12 h-80 w-80 rotate-12"
          strokeWidth={0.7}
        />
        <WaveDecor variant="right" />
        <div className="relative z-10 flex w-full justify-center">{children}</div>
      </main>
    </div>
  );
}
