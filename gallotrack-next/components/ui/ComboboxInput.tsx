'use client';

import type { ComponentPropsWithRef } from 'react';
import { cn } from './utils';

type ComboboxInputProps = Omit<
  ComponentPropsWithRef<'input'>,
  | 'autoComplete'
  | 'autoCorrect'
  | 'autoCapitalize'
  | 'spellCheck'
  | 'list'
  | 'name'
  | 'id'
  | 'role'
  | 'aria-autocomplete'
> & {
  id: string;
  name?: string;
  expanded?: boolean;
  controls?: string;
  activeOptionId?: string;
  inputClassName?: string;
};

export default function ComboboxInput({
  id,
  name = id,
  expanded = false,
  controls,
  activeOptionId,
  type = 'text',
  className,
  inputClassName,
  ...props
}: ComboboxInputProps) {
  return (
    <input
      {...props}
      id={id}
      name={name}
      type={type}
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-activedescendant={activeOptionId}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-lpignore="true"
      data-1p-ignore="true"
      data-form-type="other"
      className={cn(className, inputClassName)}
    />
  );
}

export type { ComboboxInputProps };
