import type { SVGProps } from 'react';
import { CockIcon } from './icons/FowlSexIcons';

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

export default function ChickenIcon({ size = 24, className, ...props }: Props) {
  return <CockIcon size={size} className={className} {...props} />;
}
