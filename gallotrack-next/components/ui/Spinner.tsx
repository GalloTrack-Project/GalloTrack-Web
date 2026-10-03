import { cn } from './utils';

type Props = {
  className?: string;
  label?: string;
};

function Spinner({ className, label }: Props) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

export { Spinner };
