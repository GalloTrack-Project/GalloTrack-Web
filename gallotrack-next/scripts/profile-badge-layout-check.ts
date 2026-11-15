import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, type Browser } from 'playwright';
import { en } from '../lib/i18n/en';
import { tl } from '../lib/i18n/tl';
import { hil } from '../lib/i18n/hil';
import BreedingTypeBadge from '../components/BreedingTypeBadge';
import RelatednessBadge from '../components/RelatednessBadge';
import type { BreedingClassification } from '../lib/breeding-classification';
import type { RelatednessClassification } from '../lib/relatedness-classification';

const WIDTHS = [320, 375, 640, 768, 1024, 1280, 1920];
const ZOOMS = [1, 1.25, 1.5, 1.75, 2];
const LANGUAGES = [
  { code: 'en', labels: en.reports },
  { code: 'tl', labels: tl.reports },
  { code: 'hil', labels: hil.reports },
] as const;

const crossbred: BreedingClassification = {
  type: 'Crossbred',
  purityPct: 50,
  dominantBreed: 'Hatch',
  derivedBreed: 'Hatch × Lemon',
  badgeLabel: 'Crossbred · 50% Hatch / 50% Lemon',
  summary: '50% Hatch / 50% Lemon',
  topBreeds: [
    { strain: 'Hatch', pct: 50 },
    { strain: 'Lemon', pct: 50 },
  ],
  allBreeds: [
    { strain: 'Hatch', pct: 50 },
    { strain: 'Lemon', pct: 50 },
  ],
  extraBreedsCount: 0,
  tooltipText: 'Crossbred from recorded parents.',
  compositionSource: 'assumed',
  basedOnAssumed: true,
  sourceLabel: 'Assumed from registered breed (not verified)',
};

const outcross: RelatednessClassification = {
  type: 'outcross',
  label: 'Outcross (no known shared ancestor)',
  secondaryLabel: 'hindi magka-anak',
  fullLabel: 'Outcross (no known shared ancestor)',
  relationship: 'No shared ancestor within search depth',
  sharedAncestors: [],
  inbreedingCoefficient: 0,
  tooltip: 'Based on recorded lineage only.',
  isCloseBreeding: false,
  requiresConfirmation: false,
};

function findCssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findCssFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function variant(code: string, labels: (typeof LANGUAGES)[number]['labels']): string {
  const breedingBadge = renderToStaticMarkup(
    React.createElement(BreedingTypeBadge, { classification: crossbred }),
  );
  const relatednessBadge = renderToStaticMarkup(
    React.createElement(RelatednessBadge, { classification: outcross, compact: true }),
  );

  return `<div data-variant data-lang="${code}" class="mx-auto w-full max-w-2xl space-y-4 p-4">
    <div data-card="profile" class="dark:bg-card dark:border-border w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div class="mb-2 flex min-w-0 max-w-full flex-wrap items-center gap-2">
        <h3 data-fit class="min-w-0 break-words text-sm font-black">${escapeHtml(labels.performanceMetrics)}</h3>
        <span data-fit class="min-w-0 break-words text-xs font-bold text-muted-foreground">${escapeHtml(labels.overallWinRate)}</span>
      </div>
      <div data-badge-row class="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        ${breedingBadge}
        ${relatednessBadge}
        <span data-fit class="min-w-0 max-w-full break-words rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-black">${escapeHtml(labels.matchHistory)}</span>
        <span data-fit class="min-w-0 max-w-full break-words rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black">${escapeHtml(labels.pairingHistory)}</span>
      </div>
    </div>
    <div data-card="inventory" class="bg-white dark:bg-card border-border w-full max-w-full overflow-hidden rounded-lg border p-4">
      <div class="flex min-w-0 max-w-full flex-col gap-3 sm:flex-row">
        <div class="h-20 w-20 shrink-0 rounded-lg bg-muted"></div>
        <div class="min-w-0 max-w-full flex-1 space-y-2">
          <div data-badge-row class="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            ${breedingBadge}
            ${relatednessBadge}
            <span data-fit class="max-w-full whitespace-normal break-words rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-black [overflow-wrap:anywhere]">${escapeHtml(labels.offspring)} · Crossbred · 50% Hatch / 50% Lemon (assumed)</span>
          </div>
          <p data-fit class="min-w-0 max-w-full whitespace-normal break-words text-xs font-semibold [overflow-wrap:anywhere]">${escapeHtml(labels.pairingHistory)}: Sire One × Dam A</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function main(): Promise<void> {
  const cssFiles = findCssFiles(join(process.cwd(), '.next', 'static'));
  if (cssFiles.length === 0) {
    throw new Error('No compiled CSS found. Run `npm run build` before this layout check.');
  }
  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body class="bg-background text-foreground">${LANGUAGES.map(({ code, labels }) => variant(code, labels)).join('')}</body></html>`;

  let browser: Browser | null = null;
  const failures: string[] = [];

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: WIDTHS[0], height: 900 },
      colorScheme: 'light',
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const zoom of ZOOMS) {
        await page.evaluate((value) => {
          (document.documentElement as HTMLElement).style.zoom = String(value);
        }, zoom);
        await page.waitForTimeout(60);
        const result = await page.evaluate(() => {
          const problems: string[] = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) {
            problems.push(
              `page horizontal overflow: ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`,
            );
          }

          for (const card of Array.from(
            document.querySelectorAll<HTMLElement>('[data-card]'),
          )) {
            const cardName = card.dataset.card || 'card';
            const cardRect = card.getBoundingClientRect();
            for (const row of Array.from(
              card.querySelectorAll<HTMLElement>('[data-badge-row]'),
            )) {
              const rowRect = row.getBoundingClientRect();
              if (row.scrollWidth > row.clientWidth + 1) {
                problems.push(`${cardName}: badge row overflows horizontally`);
              }
              for (const badge of Array.from(
                row.querySelectorAll<HTMLElement>(
                  '[data-breeding-badge], [data-relatedness-badge], [data-fit]',
                ),
              )) {
                const rect = badge.getBoundingClientRect();
                if (
                  rect.left < rowRect.left - 1 ||
                  rect.right > rowRect.right + 1 ||
                  rect.left < cardRect.left - 1 ||
                  rect.right > cardRect.right + 1
                ) {
                  problems.push(
                    `${cardName}: badge escapes its row (${badge.textContent?.trim().slice(0, 60)})`,
                  );
                }
                if (badge.scrollWidth > badge.clientWidth + 1) {
                  problems.push(
                    `${cardName}: badge text overflows (${badge.textContent?.trim().slice(0, 60)})`,
                  );
                }
                const style = getComputedStyle(badge);
                if (style.whiteSpace === 'nowrap') {
                  problems.push(
                    `${cardName}: badge still uses nowrap (${badge.textContent?.trim().slice(0, 60)})`,
                  );
                }
              }
            }
          }

          for (const badge of Array.from(
            document.querySelectorAll<HTMLElement>('[data-relatedness-badge]'),
          )) {
            if (!badge.getAttribute('title') || !badge.getAttribute('aria-label')) {
              problems.push('relatedness badge is missing its tooltip or aria-label');
            }
          }
          return problems;
        });

        for (const problem of result) {
          failures.push(`[width=${width} zoom=${Math.round(zoom * 100)}%] ${problem}`);
        }
      }
    }

    await context.close();
  } finally {
    await browser?.close();
  }

  if (failures.length > 0) {
    console.error(`Profile badge layout check failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Profile badge layout check passed: ${LANGUAGES.length} languages, ${WIDTHS.length} widths, ` +
      `${ZOOMS.length} zoom levels.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
