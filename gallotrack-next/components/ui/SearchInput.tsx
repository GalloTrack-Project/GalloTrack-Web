import { Search, X } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';
import { cn } from './utils';

type SearchInputProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & {
  onClear?: () => void;
};

function SearchInput({ className, onClear, value, ...props }: SearchInputProps) {
  const showClear = onClear && value !== undefined && String(value).length > 0;

  return (
    <div className="relative flex w-full items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 flex items-center text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </span>
      <input
        type="search"
        value={value}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-background py-2 pl-9 pr-9 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'transition-colors duration-150 ease-out',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        )}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export { SearchInput };
export type { SearchInputProps };
