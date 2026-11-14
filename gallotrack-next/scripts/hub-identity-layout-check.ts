import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { en } from '../lib/i18n/en';
import { tl } from '../lib/i18n/tl';
import { hil } from '../lib/i18n/hil';

const WIDTHS = [320, 375, 640, 768, 1024, 1280, 1920];
const DEVICE_SCALE_FACTORS = [1, 1.5, 2];
const LANGUAGES = [
  { code: 'en', labels: en.hub },
  { code: 'tl', labels: tl.hub },
  { code: 'hil', labels: hil.hub },
] as const;

type HubLabels = (typeof LANGUAGES)[number]['labels'];

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

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

function legend(labels: HubLabels): string {
  const items = [
    {
      type: 'SIRE',
      code: '1',
      desc: labels.legendSireDesc,
      bg: 'bg-sky-100 dark:bg-sky-950/50',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-800',
    },
    {
      type: 'DAM',
      code: 'A',
      desc: labels.legendDamDesc,
      bg: 'bg-pink-100 dark:bg-pink-950/50',
      text: 'text-pink-700 dark:text-pink-400',
      border: 'border-pink-200 dark:border-pink-800',
    },
    {
      type: 'OFFSPRING',
      code: '1A₁',
      desc: labels.legendOffspringDesc,
      bg: 'bg-emerald-100 dark:bg-emerald-950/50',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    {
      type: 'CUSTOM',
      code: '···',
      desc: labels.legendCustomDesc,
      bg: 'bg-violet-100 dark:bg-violet-950/50',
      text: 'text-violet-700 dark:text-violet-400',
      border: 'border-violet-200 dark:border-violet-800',
    },
  ];

  return `
    <div data-identity-legend class="hub-identity-legend bg-card border-border rounded-2xl border p-4 shadow-sm">
      ${items
        .map(
          (item) => `
        <div data-identity-legend-item class="hub-identity-legend-item">
          <div class="hub-identity-legend-code rounded-lg border ${item.bg} ${item.border}">
            <span class="text-xs font-black ${item.text} font-mono">${item.code}</span>
          </div>
          <div class="min-w-0">
            <p data-fit class="hub-identity-fit text-xs font-black ${item.text} tracking-widest uppercase">${escapeHtml(item.type)}</p>
            <p data-fit class="hub-identity-fit text-muted-foreground text-xs font-semibold">${escapeHtml(item.desc)}</p>
          </div>
        </div>`,
        )
        .join('')}
    </div>
  `;
}

function identityCard(labels: HubLabels): string {
  const caption = fill(labels.roleCaptionOffspring, { sire: '1', dam: 'A' });
  const aria = fill(labels.tileOffspringAria, { code: '1A₁', sire: '1', dam: 'A' });

  return `
    <button data-identity-card data-fowl-name="Offspring With A Long Name" class="hub-identity-card group bg-card border-border w-full cursor-pointer rounded-2xl border p-4 text-left shadow-sm">
      <span class="flex items-start gap-3">
        <span role="img" aria-label="${escapeHtml(aria)}" title="${escapeHtml(aria)}" data-identity-tile class="hub-identity-tile rounded-xl border bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
          <span data-identity-label class="hub-identity-tile-label font-black tracking-widest uppercase">OFFSPRING</span>
          <span data-identity-code class="hub-identity-tile-code font-black">1A₁</span>
        </span>
        <span class="min-w-0 flex-1">
          <span data-fit class="hub-identity-fit block text-card-foreground text-xs font-black">Offspring With A Very Long Name That Should Wrap</span>
          <span data-fit class="hub-identity-fit block text-muted-foreground text-xs font-semibold">Lemon / Cock</span>
          <span data-identity-caption data-fit class="hub-identity-role-caption text-muted-foreground mt-0.5 block font-semibold">${escapeHtml(caption)}</span>
          <span data-fit class="hub-identity-fit mt-0.5 block text-xs font-bold text-violet-600 dark:text-violet-400">Wing Band: BAND-123</span>
        </span>
        <span class="shrink-0 text-right">
          <span data-fit class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">80% · 4W-1L</span>
          <span data-fit class="mt-1 block text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span>
        </span>
      </span>
    </button>
  `;
}

function variant(labels: HubLabels, lang: string, dark: boolean): string {
  return `
    <section data-variant="${lang}-${dark ? 'dark' : 'light'}" class="${dark ? 'dark' : ''} bg-background text-foreground p-4">
      ${legend(labels)}
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        ${identityCard(labels)}
        ${identityCard(labels)}
      </div>
    </section>
  `;
}

async function main(): Promise<void> {
  const cssFiles = findCssFiles(join(process.cwd(), '.next', 'static'));
  if (cssFiles.length === 0) {
    throw new Error('No compiled CSS found. Run `npm run build` before this layout check.');
  }
  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  const variants = LANGUAGES.flatMap(({ code, labels }) => [
    variant(labels, code, false),
    variant(labels, code, true),
  ]);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body class="bg-background text-foreground">${variants.join('')}</body></html>`;

  let browser: Browser | null = null;
  const failures: string[] = [];

  try {
    browser = await chromium.launch({ headless: true });

    for (const deviceScaleFactor of DEVICE_SCALE_FACTORS) {
      const context = await browser.newContext({
        viewport: { width: WIDTHS[0], height: 900 },
        deviceScaleFactor,
        colorScheme: 'light',
      });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(75);
        const result = await page.evaluate(() => {
          const problems: string[] = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) {
            problems.push(
              `page horizontal overflow: ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`,
            );
          }

          for (const card of Array.from(
            document.querySelectorAll<HTMLElement>('[data-identity-card]'),
          )) {
            const cardRect = card.getBoundingClientRect();
            const variant = card.closest<HTMLElement>('[data-variant]')?.dataset.variant || 'unknown';
            const style = getComputedStyle(card);
            const containerWidth =
              card.clientWidth -
              parseFloat(style.paddingLeft || '0') -
              parseFloat(style.paddingRight || '0');
            const narrow = containerWidth <= 384;
            const tile = card.querySelector<HTMLElement>('[data-identity-tile]');
            const label = card.querySelector<HTMLElement>('[data-identity-label]');
            const caption = card.querySelector<HTMLElement>('[data-identity-caption]');

            if (!tile || !label || !caption) {
              problems.push(`${variant}: identity tile, label, or caption is missing`);
              continue;
            }

            if (tile.scrollWidth > tile.clientWidth + 1) {
              problems.push(
                `${variant}: code tile overflows (${tile.scrollWidth}px > ${tile.clientWidth}px)`,
              );
            }
            if (tile.scrollHeight > tile.clientHeight + 1) {
              problems.push(
                `${variant}: code tile clips vertically (${tile.scrollHeight}px > ${tile.clientHeight}px)`,
              );
            }

            const tileRect = tile.getBoundingClientRect();
            if (
              tileRect.left < cardRect.left - 1 ||
              tileRect.right > cardRect.right + 1 ||
              tileRect.top < cardRect.top - 1 ||
              tileRect.bottom > cardRect.bottom + 1
            ) {
              problems.push(`${variant}: code tile escapes the card`);
            }

            const labelDisplay = getComputedStyle(label).display;
            const captionDisplay = getComputedStyle(caption).display;
            if (narrow && (labelDisplay !== 'none' || captionDisplay === 'none')) {
              problems.push(
                `${variant}: narrow card must hide the tile label and show the caption (container ${containerWidth}px)`,
              );
            }
            if (!narrow && (labelDisplay === 'none' || captionDisplay !== 'none')) {
              problems.push(
                `${variant}: wide card must show the tile label and hide the caption (container ${containerWidth}px)`,
              );
            }

            if (!narrow && label.scrollWidth > label.clientWidth + 1) {
              problems.push(`${variant}: tile label overflows its box`);
            }
            if (captionDisplay !== 'none' && caption.scrollWidth > caption.clientWidth + 1) {
              problems.push(`${variant}: caption overflows its box`);
            }

            for (const textEl of Array.from(card.querySelectorAll<HTMLElement>('[data-fit]'))) {
              if (getComputedStyle(textEl).display === 'none') continue;
              const rect = textEl.getBoundingClientRect();
              if (
                rect.left < cardRect.left - 1 ||
                rect.right > cardRect.right + 1 ||
                rect.top < cardRect.top - 1 ||
                rect.bottom > cardRect.bottom + 1
              ) {
                problems.push(
                  `${variant}: text box escapes the card (${textEl.textContent?.trim().slice(0, 60)})`,
                );
              }
              if (textEl.scrollWidth > textEl.clientWidth + 1) {
                problems.push(
                  `${variant}: text overflows horizontally (${textEl.textContent?.trim().slice(0, 60)})`,
                );
              }
            }
          }

          for (const legendEl of Array.from(
            document.querySelectorAll<HTMLElement>('[data-identity-legend]'),
          )) {
            const variant = legendEl.closest<HTMLElement>('[data-variant]')?.dataset.variant || 'unknown';
            if (legendEl.scrollWidth > legendEl.clientWidth + 1) {
              problems.push(`${variant}: legend overflows horizontally`);
            }
            const items = Array.from(
              legendEl.querySelectorAll<HTMLElement>('[data-identity-legend-item]'),
            );
            for (const item of items) {
              const rect = item.getBoundingClientRect();
              const legendRect = legendEl.getBoundingClientRect();
              if (rect.left < legendRect.left - 1 || rect.right > legendRect.right + 1) {
                problems.push(`${variant}: legend item escapes the legend`);
              }
            }
            if (window.innerWidth <= 375) {
              const tops = new Set(items.map((item) => Math.round(item.getBoundingClientRect().top)));
              if (tops.size < 2) {
                problems.push(`${variant}: legend did not wrap on a narrow viewport`);
              }
            }
          }

          return problems;
        });

        for (const problem of result) {
          failures.push(`[dsf=${deviceScaleFactor} width=${width}] ${problem}`);
        }
      }

      await context.close();
    }
  } finally {
    await browser?.close();
  }

  if (failures.length > 0) {
    console.error(`Hub identity layout check failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Hub identity layout check passed: ${LANGUAGES.length} languages, 2 themes, ` +
      `${WIDTHS.length} widths, ${DEVICE_SCALE_FACTORS.length} device scale factors.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
