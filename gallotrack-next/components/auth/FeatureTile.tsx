import type { LucideIcon } from 'lucide-react';

export default function FeatureTile({
  icon: Icon,
  title,
  subtitle,
  delayMs = 0,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  delayMs?: number;
}) {
  return (
    <div
      className="landing-step-in flex items-start gap-3 rounded-2xl border border-white/25 bg-black/15 p-3.5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/45 hover:bg-black/20 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <Icon className="text-brand-gold mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm leading-tight font-black break-words text-white">{title}</p>
        <p className="mt-1 text-xs leading-snug font-medium break-words text-white/70">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
