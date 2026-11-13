'use client';

import React, { useMemo, useState } from 'react';
import ComboboxInput from './ComboboxInput';
import { cn } from './utils';

export type AutocompleteOption = {
  value: string;
  label?: string;
};

type AutocompleteComboboxProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | AutocompleteOption>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  listboxLabel?: string;
  maxVisibleOptions?: number;
  onDeleteOption?: (value: string) => void;
  canDeleteOption?: (value: string) => boolean;
  deleteOptionLabel?: (value: string) => string;
};

function normalizeOptions(options: Array<string | AutocompleteOption>): AutocompleteOption[] {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
}

export default function AutocompleteCombobox({
  id,
  name = id,
  value,
  onChange,
  options,
  onBlur,
  onFocus,
  placeholder,
  className = '',
  inputClassName = '',
  required,
  ariaInvalid,
  ariaDescribedBy,
  listboxLabel,
  maxVisibleOptions = 50,
  onDeleteOption,
  canDeleteOption,
  deleteOptionLabel,
}: AutocompleteComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const allOptions = useMemo(() => normalizeOptions(options), [options]);
  const filteredOptions = useMemo(() => {
    const query = value.trim().toLowerCase();
    const matches = query
      ? allOptions.filter(
          (option) =>
            option.value.toLowerCase().includes(query) ||
            (option.label ?? '').toLowerCase().includes(query),
        )
      : allOptions;
    return matches.slice(0, maxVisibleOptions);
  }, [allOptions, maxVisibleOptions, value]);

  const listboxId = `${id}-listbox`;
  const showList = open && filteredOptions.length > 0;
  const activeOption = activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;

  const selectOption = (option: AutocompleteOption) => {
    onChange(option.value);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filteredOptions.length > 0 ? 0 : -1);
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((current) => (current + 1) % filteredOptions.length);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(
          filteredOptions.length > 0 ? filteredOptions.length - 1 : -1,
        );
        return;
      }
      if (filteredOptions.length > 0) {
        setActiveIndex((current) =>
          current <= 0 ? filteredOptions.length - 1 : current - 1,
        );
      }
      return;
    }

    if (event.key === 'Enter' && showList && activeOption) {
      event.preventDefault();
      selectOption(activeOption);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <ComboboxInput
        id={id}
        name={name}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={(event) => {
          setOpen(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setOpen(false);
          setActiveIndex(-1);
          onBlur?.(event);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        expanded={showList}
        controls={showList ? listboxId : undefined}
        activeOptionId={showList && activeOption ? `${id}-option-${activeIndex}` : undefined}
        inputClassName={inputClassName}
      />

      {showList && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={listboxLabel ?? placeholder ?? id}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-2xl dark:border-border dark:bg-card"
        >
          {filteredOptions.map((option, index) => {
            const selected = option.value === value;
            const optionId = `${id}-option-${index}`;
            return (
              <div
                key={`${option.value}-${index}`}
                role="presentation"
                className={cn(
                  'flex items-center gap-1',
                  index === activeIndex && 'bg-emerald-500/10',
                )}
              >
                <button
                  type="button"
                  id={optionId}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'flex-1 cursor-pointer px-4 py-2.5 text-left text-sm font-bold transition-colors hover:bg-slate-50 dark:hover:bg-muted/50',
                    selected
                      ? 'text-success dark:text-emerald-300'
                      : 'text-slate-600 dark:text-muted-foreground',
                  )}
                >
                  {option.label || option.value}
                </button>
                {onDeleteOption && (!canDeleteOption || canDeleteOption(option.value)) && (
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={() => onDeleteOption(option.value)}
                    aria-label={
                      deleteOptionLabel?.(option.value) ?? `Delete ${option.value}`
                    }
                    title={
                      deleteOptionLabel?.(option.value) ?? `Delete ${option.value}`
                    }
                    className="text-danger mr-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-xs font-bold transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/50"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { AutocompleteComboboxProps };
