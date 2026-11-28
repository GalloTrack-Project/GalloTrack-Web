import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const files = [
  'components/LineageDirectory.tsx',
  'components/lineage/LineageFlow.tsx',
  'components/lineage/LineageBirdCard.tsx',
  'components/lineage/LineageTableView.tsx',
  'components/lineage/LineageInsights.tsx',
  'components/layout/PageBanner.tsx',
  'components/layout/FooterBand.tsx',
];

describe('Lineage Directory image sources', () => {
  it('uses owned local images and never hard-codes external image URLs', () => {
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).not.toMatch(/https?:\/\/[^'"\s]+\.(?:png|jpe?g|webp|gif|avif)/i);
    }

    const directory = readFileSync(
      join(process.cwd(), 'components/LineageDirectory.tsx'),
      'utf8',
    );
    expect(directory).toContain('/images/hero-farm.jpg');
    expect(readFileSync(join(process.cwd(), 'components/brand/Logo.tsx'), 'utf8')).toContain(
      '/brand/',
    );
  });
});
