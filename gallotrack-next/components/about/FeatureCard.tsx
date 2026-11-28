import type { LucideIcon } from 'lucide-react';

export type AboutFeatureTone = 'red' | 'orange';

export default function FeatureCard({
  color,
  icon: Icon,
  title,
  text,
}: {
  color: AboutFeatureTone;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  const isRed = color === 'red';
  const circle = isRed
    ? 'bg-sidebar text-sidebar-foreground'
    : 'bg-sidebar-active text-sidebar-active-foreground';
  const border = isRed ? 'bg-brand-red' : 'bg-brand-orange';

  return (
    <article className="group border-border bg-card hover:shadow-primary/15 relative flex min-h-36 min-w-0 items-center gap-4 overflow-hidden rounded-2xl border p-5 pb-7 shadow-lg shadow-primary/5 transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <span
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-md ${circle}`}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h3 className="text-foreground text-base leading-snug font-black tracking-tight break-words">
          {title}
        </h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed font-medium break-words">
          {text}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={`absolute right-4 bottom-0 left-4 h-1.5 rounded-t-full ${border}`}
      />
    </article>
  );
}
