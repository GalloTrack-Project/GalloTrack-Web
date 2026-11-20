import type { TranslationKey } from '@/lib/i18n/types';

export type HeroSlide = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  captionKey: TranslationKey;
  objectPosition?: string;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'rooster-1',
    src: '/images/hero/rooster-1.webp',
    alt: 'Hatch rooster standing on green grass with a blurred farm coop behind',
    caption: 'Champion Bloodline - Hatch',
    captionKey: 'landing.heroSlideChampion',
    objectPosition: 'center 35%',
  },
  {
    id: 'rooster-2',
    src: '/images/hero/rooster-2.webp',
    alt: 'Lemon gamefowl standing on green grass',
    caption: 'Foundation Stock - Lemon',
    captionKey: 'landing.heroSlideFoundation',
    objectPosition: 'center 35%',
  },
  {
    id: 'farm-1',
    src: '/images/hero/farm-1.webp',
    alt: 'Gamefowl farm coops and breeding pens',
    caption: 'Farm coops and breeding pens',
    captionKey: 'landing.heroSlideFarm',
    objectPosition: 'center',
  },
];
