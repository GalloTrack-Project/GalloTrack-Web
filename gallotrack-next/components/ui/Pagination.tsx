import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
};

function range(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function buildPages(page: number, pageCount: number, siblingCount: number): (number | 'ellipsis')[] {
  const totalSlots = siblingCount * 2 + 5;
  if (pageCount <= totalSlots) return range(1, pageCount);

  const left = Math.max(2, page - siblingCount);
  const right = Math.min(pageCount - 1, page + siblingCount);
  const pages: (number | 'ellipsis')[] = [1];
  if (left > 2) pages.push('ellipsis');
  pages.push(...range(left, right));
  if (right < pageCount - 1) pages.push('ellipsis');
  pages.push(pageCount);
  return pages;
}

function Pagination({ page, pageCount, onPageChange, siblingCount = 1, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = buildPages(page, pageCount, siblingCount);

  const buttonClass =
    'inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-sm border border-border px-2 text-sm font-medium transition-colors duration-150 ease-out hover:bg-muted disabled:pointer-events-none disabled:opacity-50';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={buttonClass}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {pages.map((entry, index) =>
        entry === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(buttonClass, entry === page && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
        className={buttonClass}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
