export interface HeroImageConfig {
  id: string;
  src: string;
  alt: string;
  credit: string;
  isPrimary?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: string;
}

/**
 * Centralized hero image configuration.
 * Configured with user-provided farm photographs.
 */
export const HERO_IMAGES: HeroImageConfig[] = [
  {
    id: 'hero-farm',
    src: '/images/hero-farm.jpg',
    alt: 'Gamefowl A-frame coops and shed on the farm',
    credit: '',
    isPrimary: true,
    width: 2040,
    height: 1530,
    aspectRatio: '4/3',
  },
  {
    id: 'farm-2',
    src: '/images/farm-2.jpg',
    alt: 'Gamefowl farm banana trees and coops',
    credit: '',
    isPrimary: false,
    width: 2040,
    height: 1530,
    aspectRatio: '4/3',
  },
];

/** Returns the designated primary hero image */
export function getPrimaryHeroImage(): HeroImageConfig {
  return HERO_IMAGES.find((img) => img.isPrimary) || HERO_IMAGES[0];
}

/** Returns all hero images for gallery/carousel display */
export function getHeroImages(): HeroImageConfig[] {
  return HERO_IMAGES;
}
