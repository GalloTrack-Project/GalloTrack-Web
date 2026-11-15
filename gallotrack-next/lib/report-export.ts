/**
 * Client-side report generation: structured, printable documents and CSV
 * exports. Everything here runs in the browser — no server round trip — and is
 * deliberately dependency-free so an export keeps working offline.
 *
 * Shared by the bird profile, the fight history and the dashboard so every
 * "Export" / "Print" button produces the same kind of structured report.
 */

export type ReportField = { label: string; value: string };

export type ReportTable = {
  heading?: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
  /** Shown across the full table when there are no rows. */
  emptyText?: string;
};

export type ReportSection = {
  heading: string;
  fields?: ReportField[];
  table?: ReportTable;
};

export type ReportPhoto = {
  src?: string | null;
  caption: string;
  alt?: string;
  initials: string;
  noPhotoLabel: string;
};

export type ReportGalleryImage = {
  src: string;
  alt: string;
};

export type ReportGallery = {
  heading: string;
  images: ReportGalleryImage[];
};

export type ReportBrand = {
  logoSrc: string;
  logoAlt: string;
  name: string;
};

export type ReportDocument = {
  title: string;
  meta?: string;
  sections: ReportSection[];
  photo?: ReportPhoto;
  gallery?: ReportGallery;
  brand?: ReportBrand;
  /** Footer URL, e.g. https://gallotrack.app. */
  footerUrl?: string;
  /** Show the print footer with URL and page number. */
  showPrintFooter?: boolean;
};

export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const cell = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF line endings, UTF-8 BOM. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((raw) => {
          const value = cell(raw);
          return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
  return `﻿${body}`;
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderReportPhoto(photo: ReportPhoto): string {
  const alt = photo.alt || photo.caption;
  const image = photo.src
    ? `<img class="report-photo-image" src="${escapeHtml(photo.src)}" alt="${escapeHtml(alt)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />`
    : '';
  const placeholderDisplay = photo.src ? 'display:none' : 'display:flex';

  return `<figure class="report-photo">
    <div class="report-photo-frame">
      ${image}
      <div class="photo-placeholder" style="${placeholderDisplay}" aria-label="${escapeHtml(photo.noPhotoLabel)}">
        <span class="photo-initials" aria-hidden="true">${escapeHtml(photo.initials)}</span>
        <span class="photo-empty-label">${escapeHtml(photo.noPhotoLabel)}</span>
      </div>
    </div>
    <figcaption>${escapeHtml(photo.caption)}</figcaption>
  </figure>`;
}

function renderGallery(gallery: ReportGallery | undefined): string {
  if (!gallery || gallery.images.length === 0) return '';
  return `<section class="gallery">
    <h2>${escapeHtml(gallery.heading)}</h2>
    <div class="gallery-grid">
      ${gallery.images
        .map(
          (image) =>
            `<figure class="gallery-item"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" onerror="this.closest('figure')?.remove()" /></figure>`,
        )
        .join('')}
    </div>
  </section>`;
}

export const REPORT_IMAGE_TIMEOUT_MS = 5000;

/**
 * Preload an image before opening the print dialog. Resolves true as soon as
 * the browser has decoded it, or false on error/timeout so printing can still
 * continue with the report placeholder.
 */
export function preloadReportImage(
  src: string,
  timeoutMs = REPORT_IMAGE_TIMEOUT_MS,
): Promise<boolean> {
  if (!src) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };

    const image = new Image();
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    timer = setTimeout(() => finish(false), timeoutMs);

    if (typeof image.decode === 'function') {
      image.decode().then(() => finish(true)).catch(() => {
        // onload/onerror/timeout remains the fallback path.
      });
    }
  });
}

/** Exported for the report contract tests; the iframe path is the only caller in the app. */
export function buildReportHtml(doc: ReportDocument): string {
  const generated = new Date().toLocaleString();

  const sections = doc.sections
    .map((section) => {
      const fields = section.fields?.length
        ? `<dl class="fields">${section.fields
            .map(
              (f) =>
                `<div class="row"><dt>${escapeHtml(f.label)}</dt><dd>${escapeHtml(f.value)}</dd></div>`,
            )
            .join('')}</dl>`
        : '';

      const table = section.table
        ? `<table><thead><tr>${section.table.columns
            .map((c) => `<th>${escapeHtml(c)}</th>`)
            .join('')}</tr></thead><tbody>${
            section.table.rows.length > 0
              ? section.table.rows
                  .map(
                    (r) =>
                      `<tr>${r.map((v) => `<td>${escapeHtml(cell(v))}</td>`).join('')}</tr>`,
                  )
                  .join('')
              : section.table.emptyText
                ? `<tr><td class="empty-cell" colspan="${section.table.columns.length}">${escapeHtml(section.table.emptyText)}</td></tr>`
                : ''
          }</tbody></table>`
        : '';

      return `<section><h2>${escapeHtml(section.heading)}</h2>${fields}${table}</section>`;
    })
    .join('');

  const brand = doc.brand
    ? `<div class="brand"><img src="${escapeHtml(doc.brand.logoSrc)}" alt="${escapeHtml(doc.brand.logoAlt)}" /><span>${escapeHtml(doc.brand.name)}</span></div>`
    : '';
  const photo = doc.photo ? renderReportPhoto(doc.photo) : '';
  const gallery = renderGallery(doc.gallery);
  const footerUrl = doc.footerUrl
    ? `<span class="footer-url">${escapeHtml(doc.footerUrl)}</span>`
    : '';
  const pageNumber = doc.showPrintFooter
    ? `<span class="page-number" aria-label="Page number"></span>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #0f172a;
    margin: 24px auto;
    max-width: 186mm;
    font-size: 12px;
  }
  header { border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }
  .masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm; }
  .title-block { min-width: 0; flex: 1; }
  .brand { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; color: #047857; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .brand img { display: block; width: 8mm; height: 8mm; object-fit: contain; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .meta { color: #475569; font-size: 11px; margin: 0; overflow-wrap: anywhere; }
  section { margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #059669; margin: 0 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 24px; margin: 0; }
  .row { display: flex; gap: 8px; border-bottom: 1px dotted #e2e8f0; padding: 3px 0; break-inside: avoid; page-break-inside: avoid; }
  dt { font-weight: 700; color: #475569; min-width: 120px; margin: 0; overflow-wrap: anywhere; }
  dd { margin: 0; flex: 1; min-width: 0; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
  th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; }
  .empty-cell { color: #64748b; font-style: italic; text-align: center; }
  footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #64748b; font-size: 10px; }
  .report-photo { width: 45mm; flex: 0 0 45mm; margin: 0; }
  .report-photo-frame { width: 45mm; height: 55mm; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 1.5mm; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
  .report-photo-image { width: 100%; height: 100%; object-fit: contain; display: block; }
  .photo-placeholder { width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; color: #64748b; background: #f1f5f9; text-align: center; }
  .photo-initials { font-size: 18pt; line-height: 1; font-weight: 800; color: #94a3b8; }
  .photo-empty-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .report-photo figcaption { margin-top: 4px; text-align: center; color: #475569; font-size: 9px; font-weight: 700; overflow-wrap: anywhere; }
  .gallery-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .gallery-item { width: 32mm; height: 32mm; margin: 0; border: 1px solid #cbd5e1; background: #f8fafc; overflow: hidden; break-inside: avoid; }
  .gallery-item img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .no-print { display: none !important; }
  @page {
    size: A4 portrait;
    margin: 12mm;
    @bottom-left { content: "${escapeHtml(doc.footerUrl || 'https://gallotrack.app')}"; color: #64748b; font-size: 9px; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); color: #64748b; font-size: 9px; }
  }
  @media print {
    body { margin: 0 auto; padding-bottom: 12mm; max-width: 186mm; }
    .report-footer { position: fixed; right: 0; bottom: 0; left: 0; margin: 0; padding-top: 4px; }
    .page-number::after { content: "Page " counter(page) " of " counter(pages); }
  }
</style>
</head>
<body>
<header>
  <div class="masthead">
    <div class="title-block">
      ${brand}
      <h1>${escapeHtml(doc.title)}</h1>
      ${doc.meta ? `<p class="meta">${escapeHtml(doc.meta)}</p>` : ''}
      <p class="meta">GalloTrack structured report · Generated ${escapeHtml(generated)}</p>
    </div>
    ${photo}
  </div>
</header>
${sections}
${gallery}
<footer class="report-footer">
  <span>Generated by GalloTrack. Win rate is wins ÷ (wins + losses); draws are excluded.</span>
  ${footerUrl}
  ${pageNumber}
</footer>
<script>window.addEventListener('load', function () { window.focus(); window.print(); });<\/script>
</body>
</html>`;
}

/**
 * Render the report into a hidden iframe and hand it straight to the print
 * dialog (the user can then "Save as PDF"). An iframe is used instead of a
 * popup window because popup blockers routinely swallow `window.open`.
 */
export function printReport(doc: ReportDocument): void {
  const html = buildReportHtml(doc);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('title', doc.title);
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // The report calls print() itself on load; drop the frame afterwards so a
  // second export starts clean.
  setTimeout(() => frame.remove(), 60000);
}
