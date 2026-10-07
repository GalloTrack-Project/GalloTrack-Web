import React from 'react';

interface HighlightTextProps {
  text?: string | null;
  query?: string | null;
  className?: string;
}

export function HighlightText({ text, query, className }: HighlightTextProps) {
  if (!text) return null;
  const q = (query || '').trim().replace(/\s+/g, ' ');
  if (!q) return <span className={className}>{text}</span>;

  // Escape special regex characters
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.toLowerCase() === q.toLowerCase()) {
          return (
            <mark
              key={index}
              className="bg-amber-200 dark:bg-amber-500/30 text-amber-950 dark:text-amber-200 rounded-2xs px-0.5 font-bold"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}
