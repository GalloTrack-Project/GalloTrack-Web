import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, type Browser } from 'playwright';
import { en } from '../lib/i18n/en';
import { tl } from '../lib/i18n/tl';
import { hil } from '../lib/i18n/hil';
import {
  DASHBOARD_KPI_CARD,
  DASHBOARD_KPI_CAPTION,
  DASHBOARD_KPI_LABEL,
  DASHBOARD_KPI_SEX_ROW,
  DASHBOARD_KPI_STAT_GRID,
  DASHBOARD_KPI_STAT_VALUE,
  DASHBOARD_KPI_VALUE,
  DASHBOARD_SUMMARY_GRID,
} from '../lib/dashboard-kpi';
import {
  BLOODLINE_REPORT_CARD,
  BLOODLINE_REPORT_PARENTAGE,
  BLOODLINE_REPORT_SUMMARY,
} from '../lib/bloodline-report-ui';
import { StatCard } from '../components/ui/StatCard';

const WIDTHS = [320, 375, 640, 768, 1024, 1280, 1920];
const DEVICE_SCALE_FACTORS = [1, 1.5, 2];
const LANGUAGES = [
  { code: 'en', labels: en.dashboard },
  { code: 'tl', labels: tl.dashboard },
  { code: 'hil', labels: hil.dashboard },
] as const;

type Labels = (typeof LANGUAGES)[number]['labels'];

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

function card(content: string, label: string): string {
  return `<div data-kpi-card="${escapeHtml(label)}" class="${DASHBOARD_KPI_CARD} group relative bg-card rounded-lg border border-border shadow-sm p-5 flex flex-col gap-3 overflow-hidden">${content}</div>`;
}

function chickenRegistryCard(labels: Labels): string {
  const active = labels.activeChickens;
  const bySex = labels.bySex;
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-bold text-muted-foreground uppercase tracking-wider" title="${escapeHtml(labels.registryCardLabel)}">${escapeHtml(labels.registryCardLabel)}</span>
        <span class="w-9 h-9 shrink-0 rounded-md bg-emerald-500"></span>
      </div>
      <div class="flex min-w-0 flex-col gap-1 mt-1">
        <div class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span data-fit class="${DASHBOARD_KPI_VALUE} font-black text-card-foreground tracking-tight">29</span>
          <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-bold text-muted-foreground" title="${escapeHtml(active)}">${escapeHtml(active)}</span>
        </div>
        <div data-fit class="${DASHBOARD_KPI_CAPTION} flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-semibold text-muted-foreground">
          <span>31 total</span><span>|</span><span>1 archived</span><span>|</span><span>1 deceased</span>
        </div>
      </div>
      <div class="${DASHBOARD_KPI_STAT_GRID}">
        <div class="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 p-2 text-center">
          <span data-fit class="${DASHBOARD_KPI_STAT_VALUE} font-black text-sky-700 dark:text-sky-300">12</span>
          <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black uppercase tracking-wider text-sky-700 dark:text-sky-300" title="${escapeHtml(labels.cocks)}">${escapeHtml(labels.cocks)}</span>
        </div>
        <div class="flex min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-pink-500/20 bg-pink-500/10 p-2 text-center">
          <span data-fit class="${DASHBOARD_KPI_STAT_VALUE} font-black text-pink-700 dark:text-pink-300">17</span>
          <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black uppercase tracking-wider text-pink-700 dark:text-pink-300" title="${escapeHtml(labels.hens)}">${escapeHtml(labels.hens)}</span>
        </div>
        <div class="flex min-w-0 flex-col items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-center">
          <span data-fit class="${DASHBOARD_KPI_STAT_VALUE} font-black text-amber-700 dark:text-amber-300">4</span>
          <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} mt-1 font-black uppercase tracking-wider text-amber-700 dark:text-amber-300" title="${escapeHtml(labels.totalOffspring)}">${escapeHtml(labels.totalOffspring)}</span>
        </div>
      </div>
      <div data-fit class="${DASHBOARD_KPI_SEX_ROW} rounded-md border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
        <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-extrabold uppercase tracking-wider" title="${escapeHtml(bySex)}">${escapeHtml(bySex)}</span>
        <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span data-fit class="break-words">1 male</span><span>|</span><span data-fit class="break-words">0 female</span>
        </span>
      </div>
    `,
    `chicken-registry-${labels.registryCardLabel}`,
  );
}

function matchesCard(labels: Labels): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-bold text-muted-foreground uppercase tracking-wider" title="${escapeHtml(labels.totalMatchesLogged)}">${escapeHtml(labels.totalMatchesLogged)}</span>
        <span class="w-9 h-9 shrink-0 rounded-md bg-indigo-500"></span>
      </div>
      <span data-fit class="${DASHBOARD_KPI_VALUE} mt-1 font-black text-card-foreground tracking-tight">128</span>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <span data-fit class="${DASHBOARD_KPI_CAPTION} font-bold text-muted-foreground">6 this week</span>
        <span data-fit class="${DASHBOARD_KPI_CAPTION} rounded-full bg-indigo-500/10 px-2 py-0.5 font-bold uppercase tracking-widest text-indigo">Logged</span>
      </div>
    `,
    `total-matches-${labels.totalMatchesLogged}`,
  );
}

function winRateCard(labels: Labels): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-bold text-muted-foreground uppercase tracking-wider" title="${escapeHtml(labels.overallWinRate)}">${escapeHtml(labels.overallWinRate)}</span>
        <span data-fit class="${DASHBOARD_KPI_CAPTION} rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-black text-success">12W | 4L</span>
      </div>
      <span data-fit class="${DASHBOARD_KPI_VALUE} mt-1 font-black text-success tracking-tight">75%</span>
      <p data-fit class="${DASHBOARD_KPI_CAPTION} -mt-1.5 font-semibold text-muted-foreground">Wins / (wins + losses) - draws are excluded</p>
    `,
    `overall-win-rate-${labels.overallWinRate}`,
  );
}

function quickActionsCard(): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <span data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-bold text-muted-foreground uppercase tracking-wider" title="Quick Actions">Quick Actions</span>
        <span class="w-9 h-9 shrink-0 rounded-md bg-violet-500"></span>
      </div>
      <div class="space-y-2 mt-1">
        <div class="w-full min-w-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3">
          <p data-fit class="break-words text-sm font-extrabold text-success">+ Register New Chicken</p>
          <p data-fit class="break-words text-sm font-semibold text-success/70">Add to your roster</p>
        </div>
        <div class="w-full min-w-0 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-3">
          <p data-fit class="break-words text-sm font-extrabold text-indigo">+ Log Match Result</p>
          <p data-fit class="break-words text-sm font-semibold text-indigo/70">Record fight outcome</p>
        </div>
      </div>
    `,
    'quick-actions',
  );
}

function milestonesCard(labels: Labels): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="w-9 h-9 shrink-0 rounded-md bg-emerald-500/10"></span>
          <div class="min-w-0">
            <h2 data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black text-card-foreground tracking-tight" title="${escapeHtml(labels.upcomingMilestones)}">${escapeHtml(labels.upcomingMilestones)}</h2>
            <p data-fit class="${DASHBOARD_KPI_CAPTION} mt-0.5 font-semibold text-muted-foreground">4 in the next 30 days</p>
          </div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/50 p-3">
        <span class="w-9 h-9 shrink-0 rounded-sm border border-border bg-muted"></span>
        <div class="min-w-0 flex-1">
          <p data-fit class="break-words text-sm font-black text-card-foreground" title="A very long milestone chicken identifier name">A very long milestone chicken identifier name</p>
          <p data-fit class="break-words text-sm font-semibold text-muted-foreground">Bull Stag | Age 1y 8m</p>
        </div>
        <div class="min-w-0 text-right">
          <p data-fit class="break-words text-sm font-black uppercase tracking-wide text-success">Bull Stag | SOON</p>
          <p data-fit class="break-words font-mono text-sm font-bold text-muted-foreground">in 12d</p>
        </div>
      </div>
    `,
    `upcoming-milestones-${labels.upcomingMilestones}`,
  );
}

function bloodlineCard(labels: Labels): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 mb-4">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="w-9 h-9 shrink-0 rounded-md bg-teal-500/10"></span>
          <div class="min-w-0">
            <h3 data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black text-card-foreground tracking-tight" title="${escapeHtml(labels.bloodlineOverview)}">${escapeHtml(labels.bloodlineOverview)}</h3>
            <p data-fit class="${DASHBOARD_KPI_CAPTION} mt-0.5 font-semibold text-muted-foreground">7 active chickens across all strains</p>
          </div>
        </div>
      </div>
      <div class="min-w-0 rounded-md border border-border bg-muted/50 px-3 py-2.5">
        <div class="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span data-fit class="break-words text-sm font-black text-card-foreground">Whitehackle / Lemon 84 Cross</span>
          <span data-fit class="break-words text-sm font-bold text-teal">5 chickens</span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div class="h-full w-3/4 rounded-full bg-teal-500"></div></div>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span data-fit class="break-words text-xs font-bold text-info">3 male</span>
          <span data-fit class="break-words text-xs font-bold text-pink">2 female</span>
        </div>
      </div>
    `,
    `bloodline-overview-${labels.bloodlineOverview}`,
  );
}

function winRatiosCard(): string {
  return card(
    `
      <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div class="min-w-0">
          <h3 data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black text-card-foreground tracking-tight" title="Bloodline Win Ratios">Bloodline Win Ratios</h3>
          <p data-fit class="${DASHBOARD_KPI_CAPTION} mt-0.5 font-semibold text-muted-foreground">Win share by primary genetic strain</p>
        </div>
      </div>
      <div class="mx-auto w-full max-w-sm">
        <div class="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 text-[0.625rem] font-black uppercase tracking-wider text-muted-foreground">
          <span>Strain</span><span>Share | Win rate</span>
        </div>
        <div class="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-transparent px-2.5 py-1.5 text-left text-sm font-medium">
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-500"></span>
          <span data-fit class="min-w-0 flex-1 break-words" title="Whitehackle / Lemon 84 Cross">Whitehackle / Lemon 84 Cross</span>
          <span data-fit class="shrink-0 font-black text-foreground">42%</span>
          <span data-fit class="shrink-0 text-[0.6875rem] font-bold text-muted-foreground">68% WR</span>
        </div>
      </div>
    `,
    'bloodline-win-ratios',
  );
}

function breedingTableCard(): string {
  return card(
    `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <div class="min-w-0">
          <h3 data-fit data-clamp class="${DASHBOARD_KPI_LABEL} font-black text-card-foreground tracking-tight" title="Breeding Pair Performance Analytics">Breeding Pair Performance Analytics</h3>
          <p data-fit class="${DASHBOARD_KPI_CAPTION} mt-0.5 font-semibold text-muted-foreground">Empirical win-rate ranking per Sire x Dam cross</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-border bg-muted/50 font-extrabold uppercase text-muted-foreground">
              <th class="whitespace-normal break-words p-4 pl-6 leading-tight">Rank</th>
              <th class="whitespace-normal break-words p-4 leading-tight">Sire x Dam Cross</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Offspring</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Fights</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Wins</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Losses</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Win Rate</th>
              <th class="whitespace-normal break-words p-4 text-center leading-tight">Survivability</th>
              <th class="whitespace-normal break-words p-4 pr-6 text-center leading-tight">Breeding Verdict</th>
            </tr>
          </thead>
        </table>
      </div>
    `,
    'breeding-pair-table',
  );
}

function reportStat(
  label: string,
  value: string,
  options: { hint?: string; valueClassName?: string; className?: string } = {},
): string {
  return renderToStaticMarkup(
    React.createElement(StatCard, {
      density: 'compact',
      label,
      value,
      ...options,
    }),
  );
}

function bloodlineReportCard(): string {
  return `
    <div data-kpi-card="bloodline-report" class="${BLOODLINE_REPORT_CARD} space-y-3 rounded-lg border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-emerald-950/40">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span data-fit class="text-teal min-w-0 text-xs font-black tracking-widest uppercase">Bloodline Report</span>
          <span class="rounded bg-amber-400 px-1.5 py-0.5 text-xs font-black text-amber-900">S</span>
        </div>
        <button class="text-teal inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-sm px-1 text-xs font-bold">Details</button>
      </div>
      <div data-bloodline-summary class="${BLOODLINE_REPORT_SUMMARY}">
        ${reportStat('Type', 'Foundation', { valueClassName: 'text-slate-700 dark:text-slate-200' })}
        ${reportStat('Strain', 'Whitehackle / Lemon 84 Cross')}
        ${reportStat('Generation', 'Base Stock', { valueClassName: 'text-teal' })}
        ${reportStat('Purity', '100%', { valueClassName: 'text-teal' })}
        <div data-bloodline-parentage class="${BLOODLINE_REPORT_PARENTAGE}">
          ${reportStat('Parentage', 'Unknown', {
            hint: 'Foundation stock, no recorded parents',
            className: 'h-full',
          })}
        </div>
      </div>
    </div>
  `;
}

function bloodlineAssumedNotice(): string {
  return `
    <div data-assumed-notice class="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-100">
      <div class="flex items-start gap-2">
        <span aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-amber-600"></span>
        <div class="min-w-0 space-y-1">
          <p class="text-sm font-black tracking-wide uppercase">Assumed, not verified</p>
          <p class="text-sm leading-relaxed font-semibold">No parents are recorded, so the system assumes 100% Hatch from the registered breed. Declare the real composition if you know it.</p>
        </div>
      </div>
      <div class="mt-3 flex sm:justify-end">
        <button data-edit-composition class="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-sm border border-amber-600/40 bg-amber-50 px-4 text-sm font-black text-amber-900 sm:w-auto">Edit composition</button>
      </div>
    </div>
  `;
}

function inventorySummaryCard(): string {
  return card(
    `
      <div class="${DASHBOARD_SUMMARY_GRID} mb-3 text-center">
        <div class="min-w-0 rounded-md bg-muted/50 px-1 py-2">
          <p data-fit class="break-words text-xs font-bold uppercase text-muted-foreground">Age</p>
          <p data-fit class="break-words text-sm font-black text-card-foreground">1y 8m</p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/50 px-1 py-2">
          <p data-fit class="break-words text-xs font-bold uppercase text-muted-foreground">Weight</p>
          <p data-fit class="break-words text-sm font-black text-card-foreground">2.4 kg</p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/50 px-1 py-2">
          <p data-fit class="break-words text-xs font-bold uppercase text-muted-foreground">Stage</p>
          <p data-fit class="break-words text-sm font-black text-card-foreground">Bull Stag</p>
        </div>
      </div>
      <div class="${DASHBOARD_SUMMARY_GRID} text-center">
        <div class="min-w-0 rounded-md border border-border bg-card py-2.5"><p data-fit class="break-words text-xl font-black text-card-foreground">12</p><p data-fit class="break-words text-xs font-bold uppercase text-muted-foreground">Total</p></div>
        <div class="min-w-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 py-2.5"><p data-fit class="break-words text-xl font-black text-success">8</p><p data-fit class="break-words text-xs font-bold uppercase text-success">Wins</p></div>
        <div class="min-w-0 rounded-md border border-rose-500/30 bg-rose-500/10 py-2.5"><p data-fit class="break-words text-xl font-black text-danger">4</p><p data-fit class="break-words text-xs font-bold uppercase text-danger">Losses</p></div>
        <div class="min-w-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 py-2.5"><p data-fit class="break-words text-xl font-black text-success">67%</p><p data-fit class="break-words text-xs font-bold uppercase text-success">Win Rate</p></div>
      </div>
    `,
    'inventory-summary',
  );
}

function variant(labels: Labels, theme: 'light' | 'dark'): string {
  return `
    <section class="${theme === 'dark' ? 'dark' : ''} bg-background text-foreground p-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${chickenRegistryCard(labels)}
        ${matchesCard(labels)}
        ${winRateCard(labels)}
        ${quickActionsCard()}
      </div>
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        ${milestonesCard(labels)}
        ${bloodlineCard(labels)}
      </div>
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        ${winRatiosCard()}
        ${inventorySummaryCard()}
      </div>
      <div class="mt-4 grid grid-cols-1 gap-4">
        ${breedingTableCard()}
      </div>
      <div class="mt-4">
        <div data-bloodline-modal class="border-border bg-card mx-auto w-full max-w-2xl rounded-md border p-6">
          ${bloodlineReportCard()}
          ${bloodlineAssumedNotice()}
        </div>
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
  const variants = LANGUAGES.flatMap(({ labels }) => [
    variant(labels, 'light'),
    variant(labels, 'dark'),
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
          for (const cardEl of Array.from(
            document.querySelectorAll<HTMLElement>('[data-kpi-card]'),
          )) {
            const cardRect = cardEl.getBoundingClientRect();
            const name = cardEl.dataset.kpiCard || 'unnamed-card';
            for (const el of Array.from(cardEl.querySelectorAll<HTMLElement>('[data-fit]'))) {
              const rect = el.getBoundingClientRect();
              if (
                rect.left < cardRect.left - 1 ||
                rect.right > cardRect.right + 1 ||
                rect.top < cardRect.top - 1 ||
                rect.bottom > cardRect.bottom + 1
              ) {
                problems.push(
                  `${name}: text box escapes card (${el.textContent?.trim().slice(0, 60)})`,
                );
              }
              if (!el.hasAttribute('data-clamp') && el.scrollWidth > el.clientWidth + 1) {
                problems.push(
                  `${name}: horizontal text overflow (${el.textContent?.trim().slice(0, 60)})`,
                );
              }
              if (el.hasAttribute('data-clamp') && !el.getAttribute('title')) {
                problems.push(`${name}: clamped text is missing a title tooltip`);
              }
            }
          }

          const modal = document.querySelector<HTMLElement>('[data-bloodline-modal]');
          if (modal && modal.scrollWidth > modal.clientWidth + 1) {
            problems.push(
              `bloodline modal: horizontal scroll (${modal.scrollWidth}px > ${modal.clientWidth}px)`,
            );
          }

          const summary = document.querySelector<HTMLElement>('[data-bloodline-summary]');
          if (!summary) {
            problems.push('bloodline report summary is missing');
          } else {
            const expectedColumns = window.innerWidth <= 375 ? 2 : 3;
            const columns = getComputedStyle(summary)
              .gridTemplateColumns.split(' ')
              .filter(Boolean).length;
            if (columns !== expectedColumns) {
              problems.push(
                `bloodline report summary: expected ${expectedColumns} column(s), got ${columns}`,
              );
            }

            const summaryRect = summary.getBoundingClientRect();
            const parentage = summary.querySelector<HTMLElement>('[data-bloodline-parentage]');
            if (!parentage) {
              problems.push('bloodline report parentage tile is missing');
            } else {
              const rect = parentage.getBoundingClientRect();
              if (
                rect.left < summaryRect.left - 1 ||
                rect.right > summaryRect.right + 1 ||
                rect.width < summaryRect.width - 2
              ) {
                problems.push('bloodline report parentage tile does not span the full row');
              }
            }

            for (const tileEl of Array.from(summary.children) as HTMLElement[]) {
              const tileRect = tileEl.getBoundingClientRect();
              if (tileRect.left < summaryRect.left - 1 || tileRect.right > summaryRect.right + 1) {
                problems.push('bloodline report tile escapes the summary grid');
              }
              if (tileEl.scrollWidth > tileEl.clientWidth + 1) {
                problems.push(
                  `bloodline report tile overflows (${tileEl.textContent?.trim().slice(0, 60)})`,
                );
              }
              for (const textEl of Array.from(tileEl.querySelectorAll<HTMLElement>('p, span'))) {
                if (textEl.scrollWidth > textEl.clientWidth + 1) {
                  problems.push(
                    `bloodline report text overflows (${textEl.textContent?.trim().slice(0, 60)})`,
                  );
                }
              }
            }
          }

          const notice = document.querySelector<HTMLElement>('[data-assumed-notice]');
          if (!notice) {
            problems.push('assumed notice is missing');
          } else {
            if (notice.scrollWidth > notice.clientWidth + 1) {
              problems.push('assumed notice overflows horizontally');
            }
            const edit = notice.querySelector<HTMLElement>('[data-edit-composition]');
            if (!edit) {
              problems.push('assumed notice edit action is missing');
            } else {
              const noticeRect = notice.getBoundingClientRect();
              const editRect = edit.getBoundingClientRect();
              if (editRect.height < 43.5) {
                problems.push(`assumed notice edit action is only ${editRect.height}px tall`);
              }
              if (editRect.right > noticeRect.right + 1 || editRect.left < noticeRect.left - 1) {
                problems.push('assumed notice edit action escapes the notice');
              }
              const paragraphs = notice.querySelectorAll<HTMLElement>('p');
              const lastParagraph = paragraphs[paragraphs.length - 1];
              if (
                lastParagraph &&
                lastParagraph.getBoundingClientRect().bottom > editRect.top + 1
              ) {
                problems.push('assumed notice edit action crowds the message');
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
    console.error(
      `Dashboard KPI and Bloodline Report layout check failed with ${failures.length} issue(s):`,
    );
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Dashboard KPI and Bloodline Report layout check passed: ${LANGUAGES.length} languages, ` +
      `2 themes, ${WIDTHS.length} widths, ${DEVICE_SCALE_FACTORS.length} device scale factors.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
