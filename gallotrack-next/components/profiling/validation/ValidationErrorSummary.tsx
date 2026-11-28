'use client';

import React from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { focusValidationField } from './focus-validation-field';
import type { ValidationFieldItem } from './types';

export function ValidationErrorSummary({
  title,
  items,
}: {
  title: string;
  items: ValidationFieldItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div
      data-testid="registration-error-summary"
      role="alert"
      className="border-loss/30 bg-loss-bg text-loss rounded-lg border p-3.5 shadow-sm"
    >
      <p className="flex items-start gap-2 text-xs font-black">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{title}</span>
      </p>
      <ul className="mt-2 space-y-1 pl-6">
        {items.map((item) => (
          <li key={item.key} className="min-w-0 break-words">
            <button
              type="button"
              onClick={() => focusValidationField(item.targetId)}
              className={cn(
                'text-left text-xs font-bold underline underline-offset-2 hover:no-underline',
                'focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              )}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
