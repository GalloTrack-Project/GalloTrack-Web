import type { SVGProps } from 'react';

type FowlSexIconProps = SVGProps<SVGSVGElement> & { size?: number | string };

export function CockIcon({ size = 24, className, ...props }: FowlSexIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-fowl-sex="cock"
      {...props}
    >
      <path d="M14.5 3.4c1.7 0 3 1.3 3.1 3 .1.9-.1 1.7-.5 2.3-.2.9-.4 1.9-.5 2.8.3 1.7.2 3.6-.5 5.2-.8 1.9-2.4 3.2-4.3 3.5-1.9.3-3.6-.5-4.5-1.9-.4-.6-.6-1.3-.6-2-.8-2.7-2.1-5.7-3.5-8.1-.6-1-1.1-1.9-1.2-2.6-.1-.5.4-.8.8-.4 1.6 1.5 3.4 3.5 4.5 5.4 1.2-.7 2.5-1.2 3.8-1.2 1.1 0 2-.9 2.5-2.2.3-1.1.5-2.5.7-3.7Z" />
      <path d="M13.2 5c-.5-1.2-.5-2.5.2-3.4.6.9 1 1.8 1.1 2.7.4-1.2 1.1-2.1 2-2.4.1 1 .1 2-.1 2.9" />
      <path d="M17.5 6.2 21 7.3l-3.6 1.1" />
      <path d="M17.2 8.6c.8.5 1.1 1.4.8 2.3-.6-.5-1-1.3-1.1-1.9" />
      <path d="M9.3 15c2-1.5 4.5-1 5.8.9-1.6 1.6-4.1 2-5.8 1v-1.9Z" />
      <path d="M11.7 20.1 11.9 22.6M10.5 22.6H13.3M9.7 20.4 9.4 22.6M8 22.6h2.8" />
      <circle cx="15.7" cy="6" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HenIcon({ size = 24, className, ...props }: FowlSexIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-fowl-sex="hen"
      {...props}
    >
      <path d="M9.5 4.5c-2.1 0-3.8 1.7-3.8 3.8 0 1 .4 1.9 1.1 2.6.2.8.3 1.6.2 2.4-.1 1.5.3 2.9 1.2 4.1.8 1.1 2.1 1.8 3.5 1.8 1.5 0 2.8-.8 3.5-2 .5-.8.7-1.8.5-2.7 0-2.2.5-4.4 1.3-6.5.2-.5.3-1 .3-1.4 0-.4-.5-.5-.8-.2-1 1-2 2.2-2.8 3.5-.9-.6-1.9-.9-2.9-.9-.8 0-1.5-.6-1.7-1.5-.2-.5-.3-1.1-.4-1.6Z" />
      <path d="M11.2 5.4c0-.9.4-1.7 1-2.2.2.8.2 1.6 0 2.3.5-.5 1.1-.8 1.8-.8-.2.8-.6 1.4-1.2 1.9" />
      <path d="M5.6 7.8H3l2.6 1.4" />
      <circle cx="9" cy="7.4" r=".7" fill="currentColor" stroke="none" />
      <path d="M13.8 15c-1.4-.8-3-.4-3.9.8 1 1 2.7 1.2 3.9.6V15Z" />
      <path d="M11.4 19.4v2.2M9.6 21.6h3.6" />
    </svg>
  );
}
