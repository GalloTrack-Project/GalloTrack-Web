import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';
import { Bell, Search, Settings as SettingsIcon } from 'lucide-react';
import NotificationPanel from '../components/nav/NotificationPanel';
import type { NotificationWithFowl } from '../lib/notifications/types';

const OUT = join(process.cwd(), 'docs', 'screenshots');

function findCssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findCssFiles(full));
    else if (entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

function dateIn(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const base = {
  user_id: 'u1',
  fowl_id: 7,
  title: '',
  body: '',
  read_at: null,
  created_at: new Date().toISOString(),
};

const unreadItems: NotificationWithFowl[] = [
  {
    ...base,
    id: 1,
    type: 'stage_upcoming',
    fowl_id: 7,
    stage: 'Stag',
    title: 'Stag coming up',
    body: 'Pearl Lemon (1A4) is expected to reach Stag.',
    due_date: dateIn(5),
    fowl: { id: 7, name: 'Pearl Lemon', bird_code: '1A4' },
  },
  {
    ...base,
    id: 2,
    type: 'fully_mature',
    fowl_id: 12,
    stage: 'Fully mature',
    title: 'Hatch Silver is fully mature',
    body: 'Hatch Silver reached the 24-month milestone.',
    due_date: dateIn(-2),
    fowl: { id: 12, name: 'Hatch Silver', bird_code: '2B1' },
  },
  {
    ...base,
    id: 3,
    type: 'stage_changed',
    fowl_id: 19,
    stage: 'Bull Stag',
    title: 'Lemon Ground reached Bull Stag',
    body: 'Lemon Ground crossed the 12-month milestone.',
    due_date: dateIn(-14),
    read_at: new Date().toISOString(),
    fowl: { id: 19, name: 'Lemon Ground', bird_code: '3C2' },
  },
];

function panel(notifications: NotificationWithFowl[], unreadCount: number) {
  return renderToStaticMarkup(
    React.createElement(NotificationPanel, {
      notifications,
      unreadCount,
      loading: false,
      error: '',
      onClose: () => {},
      onRetry: () => {},
      onOpenFowl: () => {},
      onMarkAllRead: () => {},
    }),
  );
}

const bellIcon = renderToStaticMarkup(
  React.createElement(Bell, { className: 'h-4 w-4', 'aria-hidden': 'true' } as never),
);
const searchIcon = renderToStaticMarkup(
  React.createElement(Search, { className: 'h-4 w-4', 'aria-hidden': 'true' } as never),
);
const settingsIcon = renderToStaticMarkup(
  React.createElement(SettingsIcon, { className: 'h-4 w-4', 'aria-hidden': 'true' } as never),
);

function headerMarkup() {
  return `
    <div data-shot="bell" class="bg-card border-border flex w-[28rem] items-center justify-end gap-2 rounded-xl border p-3 shadow-sm">
      <button class="border-border bg-muted text-muted-foreground flex h-11 w-11 items-center justify-center rounded-full border shadow-2xs" aria-label="Search">
        ${searchIcon}
      </button>
      <button class="border-border bg-muted text-muted-foreground relative flex h-11 w-11 items-center justify-center rounded-full border shadow-2xs" aria-label="Notifications, 12 unread">
        ${bellIcon}
        <span class="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] leading-none font-black text-white">9+</span>
      </button>
      <button class="border-border bg-muted text-muted-foreground flex h-11 w-11 items-center justify-center rounded-full border shadow-2xs" aria-label="Settings">
        ${settingsIcon}
      </button>
    </div>
  `;
}

function previewMarkup(panelHtml: string) {
  return `
    <div class="bg-background text-foreground p-6">
      <div class="relative mx-auto w-[26rem] pt-14">
        <div class="bg-card border-border absolute inset-x-0 top-0 flex h-12 items-center justify-end gap-2 rounded-xl border px-3 shadow-sm">
          <span class="text-muted-foreground text-xs font-black">Notifications preview</span>
        </div>
        ${panelHtml}
      </div>
    </div>
  `;
}

function toggle(checked: boolean) {
  return `<button type="button" role="switch" aria-checked="${checked}" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent ${checked ? 'bg-emerald-500' : 'bg-slate-200'}"><span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ${checked ? 'translate-x-5' : 'translate-x-0'}"></span></button>`;
}

function field(label: string, description: string, control: string) {
  return `<div class="flex items-center justify-between gap-4 border-b border-slate-100 py-3.5 last:border-0"><div class="min-w-0"><p class="text-sm font-extrabold text-slate-800 dark:text-slate-100">${label}</p><p class="text-muted-foreground mt-0.5 text-xs font-medium">${description}</p></div><div class="shrink-0">${control}</div></div>`;
}

function settingsMarkup() {
  return `
    <div data-shot="settings" class="bg-background text-foreground p-6">
      <div class="bg-card border-border mx-auto w-[34rem] rounded-xl border p-5 shadow-sm">
        <h2 class="text-card-foreground text-sm font-black">Milestone Notifications</h2>
        <p class="text-muted-foreground mt-1 text-xs font-semibold">In-app alerts for chicken development stages. Saved per farm owner.</p>
        <div class="mt-3 border-t border-slate-100 pt-1">
          ${field('Stage changed', 'When a chicken enters a new development stage', toggle(true))}
          ${field('Fully mature', 'When a chicken reaches 24 months and is fully mature', toggle(true))}
          ${field('Upcoming stage', 'Before a chicken reaches its next stage boundary', toggle(true))}
          ${field(
            'Upcoming lead time',
            'How many days before a stage boundary to notify',
            '<select class="border-input-border bg-card min-w-[9rem] rounded-md border px-3 py-2 text-sm font-semibold"><option>3 days</option><option selected>7 days</option><option>14 days</option></select>',
          )}
        </div>
      </div>
    </div>
  `;
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

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });

    await page.setContent(html(headerMarkup()), { waitUntil: 'load' });
    await page.locator('[data-shot="bell"]').screenshot({
      path: join(OUT, 'notifications-bell.png'),
    });

    await page.setContent(html(previewMarkup(panel(unreadItems, 2))), { waitUntil: 'load' });
    await page.locator('#notification-panel').screenshot({
      path: join(OUT, 'notifications-panel-unread.png'),
    });

    await page.setContent(html(previewMarkup(panel([], 0))), { waitUntil: 'load' });
    await page.locator('#notification-panel').screenshot({
      path: join(OUT, 'notifications-panel-empty.png'),
    });

    await page.setContent(html(settingsMarkup()), { waitUntil: 'load' });
    await page.locator('[data-shot="settings"]').screenshot({
      path: join(OUT, 'notifications-settings.png'),
    });

    console.log('Wrote notification screenshots to docs/screenshots');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
