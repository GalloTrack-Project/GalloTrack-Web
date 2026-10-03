'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './utils';

type TabItem = {
  value: string;
  label: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  vertical?: boolean;
  className?: string;
  'aria-label': string;
};

function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  vertical = false,
  className,
  'aria-label': ariaLabel,
}: TabsProps) {
  const baseId = useId();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? items[0]?.value ?? '');
  const active = isControlled ? value : internalValue;
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  function select(next: string) {
    if (!isControlled) setInternalValue(next);
    onValueChange?.(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;

    const currentIndex = enabled.findIndex((item) => item.value === active);
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft';

    let nextIndex = -1;
    if (event.key === nextKey) nextIndex = (currentIndex + 1) % enabled.length;
    else if (event.key === previousKey) nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = enabled.length - 1;

    if (nextIndex === -1) return;

    event.preventDefault();
    const nextItem = enabled[nextIndex];
    select(nextItem.value);
    tabRefs.current.get(nextItem.value)?.focus();
  }

  const activeItem = items.find((item) => item.value === active);

  return (
    <div className={cn('flex flex-col gap-4', vertical && 'sm:flex-row', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex gap-1 border-b border-border p-1',
          vertical && 'sm:flex-col sm:border-b-0 sm:border-r',
        )}
      >
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(node) => {
                if (node) tabRefs.current.set(item.value, node);
                else tabRefs.current.delete(item.value);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.value)}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'disabled:pointer-events-none disabled:opacity-50',
                selected && 'bg-muted text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem?.content !== undefined ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.value}`}
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
          tabIndex={0}
          className="flex-1"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}

export { Tabs };
export type { TabItem, TabsProps };
