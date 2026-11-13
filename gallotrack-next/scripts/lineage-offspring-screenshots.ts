import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import ParentCombobox from '../components/lineage/ParentCombobox';
import ParentOffspringTree, {
  type ParentTreePair,
} from '../components/lineage/ParentOffspringTree';
import { computeWinRate } from '../lib/win-rate';
import type { FowlRecord } from '../lib/types';
import type { ParentPickerEntry } from '../lib/lineage-parent-picker';
import type { CrisscrossClassification } from '../lib/lineage';

const OUT = join(process.cwd(), 'docs', 'screenshots');
const NO_CRISSCROSS: CrisscrossClassification = {
  status: 'not-crisscross',
  isCrisscross: false,
  sireLine: null,
  damSireLine: null,
  damDamLine: null,
  reason: '',
};

const bird = (
  id: number,
  name: string,
  gender: string,
  code: string,
  sire = '',
  dam = '',
): FowlRecord =>
  ({
    id,
    name,
    gender,
    breed: 'Hatch',
    bird_code: code,
    sire,
    dam,
    status: 'Active',
    birthdate: '2025-01-15',
  }) as FowlRecord;

function findCssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findCssFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

function pair({
  key,
  root,
  mate,
  children,
  index,
}: {
  key: string;
  root: FowlRecord;
  mate: FowlRecord;
  children: FowlRecord[];
  index: number;
}): ParentTreePair {
  const stats = computeWinRate(0, 0, 0);
  return {
    key,
    otherName: mate.name,
    otherCode: mate.bird_code || '',
    isUnknownOther: false,
    pairCode: `${root.bird_code}${mate.bird_code}`,
    offspring: children,
    totalOffspring: children.length,
    maleCount: children.filter((child) => child.gender === 'Rooster').length,
    femaleCount: children.filter((child) => child.gender === 'Hen').length,
    stats,
    crisscross: NO_CRISSCROSS,
    isOpen: true,
  };
}

function entry(fowl: FowlRecord, children: FowlRecord[]): ParentPickerEntry {
  return {
    name: fowl.name,
    children,
    code: fowl.bird_code || '',
    stats: computeWinRate(0, 0, 0),
    wingBand: '',
  };
}

function selectorMarkup({
  kind,
  entries,
  selected,
  open,
}: {
  kind: 'sire' | 'dam';
  entries: ParentPickerEntry[];
  selected: ParentPickerEntry;
  open: boolean;
}) {
  return renderToStaticMarkup(
    React.createElement(ParentCombobox, {
      kind,
      entries,
      selected,
      sort: 'most',
      onSortChange: () => {},
      onSelect: () => {},
      defaultOpen: open,
    }),
  );
}

function toolbarMarkup({
  kind,
  entries,
  selected,
  open,
  summary,
}: {
  kind: 'sire' | 'dam';
  entries: ParentPickerEntry[];
  selected: ParentPickerEntry;
  open: boolean;
  summary: string;
}) {
  const noun = kind === 'sire' ? 'Sire' : 'Dam';
  const maleCount = selected.children.filter((child) => child.gender === 'Rooster').length;
  const femaleCount = selected.children.length - maleCount;
  return `
    <div class="bg-card border-border space-y-2 rounded-lg border p-2.5 shadow-xs sm:p-3">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
        ${selectorMarkup({ kind, entries, selected, open })}
        <div class="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="${noun} offspring view" class="border-border bg-muted/40 flex items-center gap-0.5 rounded-lg border p-0.5">
            <button type="button" aria-pressed="true" class="bg-card text-foreground shadow-2xs min-h-11 cursor-pointer rounded-md px-3 text-xs font-black capitalize sm:min-h-8 sm:px-2.5">tree</button>
            <button type="button" aria-pressed="false" class="text-muted-foreground hover:text-foreground min-h-11 cursor-pointer rounded-md px-3 text-xs font-black capitalize sm:min-h-8 sm:px-2.5">table</button>
          </div>
          <button type="button" class="bg-muted hover:bg-muted/80 text-foreground border-border min-h-11 cursor-pointer rounded-md border px-3 text-xs font-bold sm:min-h-8">View profile</button>
        </div>
      </div>
      <div class="border-border/60 flex flex-col gap-2 border-t pt-2 xl:flex-row xl:items-center xl:justify-between">
        <p data-testid="parent-summary" class="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">${summary}</p>
        <div class="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter ${noun.toLowerCase()} offspring by sex" class="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-pressed="true" class="bg-emerald-600 text-white shadow-2xs min-h-11 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold sm:min-h-8">All (${selected.children.length})</button>
            <button type="button" aria-pressed="false" class="bg-muted text-muted-foreground hover:bg-muted/80 min-h-11 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold sm:min-h-8">Cocks (${maleCount})</button>
            <button type="button" aria-pressed="false" class="bg-muted text-muted-foreground hover:bg-muted/80 min-h-11 cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold sm:min-h-8">Hens (${femaleCount})</button>
          </div>
          <label class="text-muted-foreground flex items-center gap-1.5 text-xs font-bold">Sort
            <select aria-label="Sort pair offspring" class="border-border bg-card text-foreground min-h-11 cursor-pointer rounded border px-2 text-xs font-bold sm:min-h-8">
              <option>Cocks first, then code</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  `;
}

function shell(content: string) {
  return `
    <div class="bg-background text-foreground min-h-screen p-3 sm:p-4">
      <div data-shot-page class="mx-auto max-w-6xl space-y-3">
        <div class="flex flex-col gap-2 border-b border-border pb-3">
          <p class="text-muted-foreground text-xs font-black tracking-widest uppercase">Family Lineage Directory</p>
          <div class="flex flex-wrap gap-1.5 text-xs font-bold">
            <span class="border-border bg-card rounded-md border px-3 py-2">Family Tree</span>
            <span class="border-border bg-card rounded-md border px-3 py-2">Full Siblings</span>
            <span class="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md border px-3 py-2">Dam Offspring Tree</span>
            <span class="border-border bg-card rounded-md border px-3 py-2">Sire Offspring Tree</span>
          </div>
        </div>
        ${content}
      </div>
    </div>
  `;
}

function familyContent({
  kind,
  entries,
  selected,
  root,
  mate,
  children,
  summary,
  open,
}: {
  kind: 'sire' | 'dam';
  entries: ParentPickerEntry[];
  selected: ParentPickerEntry;
  root: FowlRecord;
  mate: FowlRecord;
  children: FowlRecord[];
  summary: string;
  open: boolean;
}) {
  const tree = renderToStaticMarkup(
    React.createElement(ParentOffspringTree, {
      kind,
      rootName: root.name,
      rootCode: root.bird_code || '',
      rootFowl: root,
      pairs: [pair({ key: `${kind}-pair`, root, mate, children, index: 0 })],
      codes: new Map([...children, root, mate].map((fowl) => [String(fowl.id), fowl.bird_code || ''])),
      fowls: [root, mate, ...children],
      matchHistory: [],
      sexFilter: 'all',
      onTogglePair: () => {},
      onPick: () => {},
    }),
  );
  return `${toolbarMarkup({ kind, entries, selected, open, summary })}${tree}`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const cssFiles = findCssFiles(join(process.cwd(), '.next', 'static'));
  if (cssFiles.length === 0) {
    throw new Error('No compiled CSS found. Run `npm run build` before screenshots.');
  }
  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  const html = (body: string) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body class="bg-background text-foreground">${body}</body></html>`;

  const sire1 = bird(1, 'Sire 1', 'Rooster', '1');
  const damA = bird(2, 'Dam A', 'Hen', 'A');
  const children4 = [
    bird(10, 'Pearl Lemon', 'Rooster', '1A1', 'Sire 1', 'Dam A'),
    bird(11, 'Hatch Silver', 'Hen', '1A2', 'Sire 1', 'Dam A'),
    bird(12, 'Lemon Ground', 'Rooster', '1A3', 'Sire 1', 'Dam A'),
    bird(13, 'Ground Red', 'Hen', '1A4', 'Sire 1', 'Dam A'),
  ];
  const oneDam = entry(damA, children4);

  const manyDams = Array.from({ length: 50 }, (_, index) => {
    const letter = String.fromCharCode(65 + (index % 26));
    const suffix = index >= 26 ? String(Math.floor(index / 26)) : '';
    const label = `${letter}${suffix}`;
    const dam = bird(1000 + index, `Dam ${label}`, 'Hen', label);
    const child = bird(2000 + index, `Child ${label}`, index % 2 ? 'Hen' : 'Rooster', `${index + 1}A1`, 'Sire X', `Dam ${label}`);
    return entry(dam, [child]);
  });

  const damBig = bird(3000, 'Dam Big', 'Hen', 'B');
  const sireBig = bird(3001, 'Sire Big', 'Rooster', '1');
  const children12 = Array.from({ length: 12 }, (_, index) =>
    bird(
      3010 + index,
      `Big Child ${index + 1}`,
      index % 2 ? 'Hen' : 'Rooster',
      `1B${index + 1}`,
      'Sire Big',
      'Dam Big',
    ),
  );
  const twelve = entry(damBig, children12);

  const cases = [
    {
      name: 'lineage-dam-1',
      kind: 'dam' as const,
      markup: familyContent({
        kind: 'dam',
        entries: [oneDam],
        selected: oneDam,
        root: damA,
        mate: sire1,
        children: children4,
        summary: '<strong>4</strong> offspring · 2M 2F · 1 sire · 0 fights',
        open: false,
      }),
    },
    {
      name: 'lineage-dam-50',
      kind: 'dam' as const,
      markup: familyContent({
        kind: 'dam',
        entries: manyDams,
        selected: manyDams[0],
        root: bird(1000, 'Dam A', 'Hen', 'A'),
        mate: sire1,
        children: [bird(2000, 'Child A', 'Rooster', '1A1', 'Sire X', 'Dam A')],
        summary: '<strong>1</strong> offspring · 1M 0F · 1 sire · 0 fights',
        open: true,
      }),
    },
    {
      name: 'lineage-family-12',
      kind: 'dam' as const,
      markup: familyContent({
        kind: 'dam',
        entries: [twelve],
        selected: twelve,
        root: damBig,
        mate: sireBig,
        children: children12,
        summary: '<strong>12</strong> offspring · 6M 6F · 1 sire · 0 fights',
        open: false,
      }),
    },
  ];

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { suffix: 'desktop', width: 1280, height: 768 },
      { suffix: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      });
      for (const testCase of cases) {
        await page.setContent(html(shell(testCase.markup)), { waitUntil: 'load' });
        await page.screenshot({
          path: join(OUT, `${testCase.name}-${viewport.suffix}.png`),
          fullPage: viewport.suffix === 'mobile' ? true : testCase.name !== 'lineage-dam-1',
        });
      }

      if (viewport.suffix === 'desktop') {
        await page.setContent(html(shell(cases[0].markup)), { waitUntil: 'load' });
        const bottom = await page
          .locator('[data-shot-page]')
          .evaluate((el) => el.getBoundingClientRect().bottom);
        if (bottom > 768) {
          throw new Error(`1-dam toolbar/tree does not fit 768px height (bottom=${bottom})`);
        }
      }
      await page.close();
    }
    console.log('Wrote lineage offspring toolbar screenshots to docs/screenshots');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
