/**
 * effects.ts — in-page recording effects for the GalloTrack video capture.
 *
 * Provides on `window.__gt`:
 *   focus(el, level, dur, noAnchor)   eased camera zoom onto an element
 *   unfocus(dur)                      eased return to 1.0x
 *   scrollTo(y, dur)                  eased scroll (visual px)
 *   scrollToBy(dy, dur)               eased relative scroll
 *   scrollToEl(el, dur, frac)         ride the page to an element (stays 1.0x)
 *   pulse(el)                         highlight ring around a click target
 *   stats()                           debug snapshot
 * plus always-on overlays: virtual cursor (Playwright video never captures the
 * real one) with click ripple, all inside a counter-zoomed fixed layer whose
 * coordinates are pure visual pixels.
 *
 * Camera model (verified empirically with a headless Playwright geometry probe):
 *   `zoom` on <html> keeps getBoundingClientRect(), mouse clientX/Y and
 *   window.scrollY in uniform *visual* px, with visualTop = docY1 * s - scrollY,
 *   so the camera anchor is: scrollY = docY1 * s - anchorVisualY.
 *   Fixed elements stay viewport-pinned and just scale (browser-zoom look).
 *
 * Injection: page.addInitScript(initEffects, config). tsx/esbuild keepNames
 * wraps named functions in __name(), which does not exist in the page — the
 * driver must first inject the string shim: globalThis.__name = (fn) => fn.
 */

export type EffectsConfig = { headerPx?: number };

export function initEffects(config: EffectsConfig = {}) {
  const HEADER: number = config.headerPx ?? 64;
  const gw = window as unknown as Record<string, unknown>;
  if (gw.__gt) return;

  /* --------------------------- cursor + ripple ---------------------------- */
  let mx = -200;
  let my = -200;
  let cx = -200;
  let cy = -200;
  let seen = false;
  let pressed = false;

  document.addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      seen = true;
    },
    true,
  );
  document.addEventListener('mousedown', () => { pressed = true; }, true);
  document.addEventListener('mouseup', () => { pressed = false; }, true);

  /* -------------------------------- camera -------------------------------- */
  const cam = { s: 1, docY1: null as number | null, anchor: null as number | null, raf: 0 };
  let layer: HTMLElement | null = null;
  let cur: HTMLElement | null = null;

  function ease(t: number): number {
    return 1 - Math.pow(1 - t, 5);
  }

  function apply(): void {
    const html = document.documentElement;
    html.style.setProperty('zoom', String(cam.s));
    if (layer) layer.style.setProperty('zoom', String(1 / cam.s));
    if (cam.docY1 !== null && cam.anchor !== null) {
      const max = Math.max(0, html.scrollHeight - window.innerHeight);
      const y = cam.docY1 * cam.s - cam.anchor;
      window.scrollTo(0, Math.min(Math.max(y, 0), max));
    }
  }

  /** overlay needs <html>/<head>; init scripts run at document creation, so
   *  wait for DOMContentLoaded when it isn't parsed yet. */
  function installDom(): void {
    if (!document.documentElement || !document.head) return;
    if (layer) return;

    const css = document.createElement('style');
    css.textContent = `
      #__gt_layer, #__gt_layer * { pointer-events: none !important; }
      #__gt_layer { position: fixed; left: 0; top: 0; z-index: 2147483646; overflow: visible; }
      #gt_cur { position: absolute; left: 0; top: 0; width: 20px; height: 20px;
        transform-origin: 1px 1px; opacity: 0;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
      #gt_cur svg { display: block; }
      .gt-ripple { position: absolute; width: 76px; height: 76px; margin: -38px 0 0 -38px;
        border: 3px solid rgba(16,185,129,.9); border-radius: 9999px;
        transform: scale(.14); animation: gt-rip 550ms cubic-bezier(.22,1,.36,1) forwards; }
      @keyframes gt-rip { to { transform: scale(1); opacity: 0; } }
      .gt-pulse { position: absolute; border: 3px solid rgba(16,185,129,.95); border-radius: 10px;
        animation: gt-puls 900ms ease-in-out forwards; }
      @keyframes gt-puls { 0% { opacity: .2; } 45% { opacity: 1; } 100% { opacity: 0; } }
    `;
    document.head.appendChild(css);

    layer = document.createElement('div');
    layer.id = '__gt_layer';
    cur = document.createElement('div');
    cur.id = 'gt_cur';
    cur.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 20 20">' +
      '<path d="M1 1 L17 11 L10 11.8 L7.2 18.6 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    layer.appendChild(cur);
    document.documentElement.appendChild(layer);
    apply(); // re-sync counter-zoom with current camera state

    document.addEventListener(
      'click',
      (e) => {
        if (!layer) return;
        const r = document.createElement('div');
        r.className = 'gt-ripple';
        r.style.left = e.clientX + 'px';
        r.style.top = e.clientY + 'px';
        layer.appendChild(r);
        window.setTimeout(() => r.remove(), 700);
      },
      true,
    );

    const tick = () => {
      if (seen && cur) {
        cx += (mx - cx) * 0.32;
        cy += (my - cy) * 0.32;
        cur.style.opacity = '1';
        cur.style.transform =
          'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0) scale(' + (pressed ? 0.8 : 1) + ')';
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  if (document.head && document.documentElement) installDom();
  else document.addEventListener('DOMContentLoaded', installDom);

  function animate(to: number, dur: number): Promise<null> {
    installDom(); // lazy guard — page scripts may have replaced the DOM
    return new Promise((resolve) => {
      window.cancelAnimationFrame(cam.raf);
      const from = cam.s;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = dur <= 0 ? 1 : Math.min(1, (now - t0) / dur);
        cam.s = from + (to - from) * ease(t);
        apply();
        if (t < 1) {
          cam.raf = window.requestAnimationFrame(step);
        } else {
          cam.s = to;
          apply();
          resolve(null);
        }
      };
      cam.raf = window.requestAnimationFrame(step);
    });
  }

  function scrollTo(target: number, dur: number): Promise<null> {
    return new Promise((resolve) => {
      window.cancelAnimationFrame(cam.raf);
      const from = window.scrollY;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = dur <= 0 ? 1 : Math.min(1, (now - t0) / dur);
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const v = from + (target - from) * ease(t);
        window.scrollTo(0, Math.min(Math.max(v, 0), max));
        if (t < 1) {
          cam.raf = window.requestAnimationFrame(step);
        } else {
          resolve(null);
        }
      };
      cam.raf = window.requestAnimationFrame(step);
    });
  }

  /** Eased camera zoom that keeps the target's box anchored on screen.
   *  With a null element the viewport center becomes the anchor (pure camera push).
   */
  async function focus(el: Element | null, level: number, dur: number, noAnchor?: boolean): Promise<null> {
    const vh = window.innerHeight;
    if (!el) {
      // targetless zoom: pin whatever is at the screen center right now
      cam.docY1 = (window.scrollY + vh / 2) / cam.s;
      cam.anchor = vh / 2;
      return animate(level, dur);
    }
    if (noAnchor) {
      cam.docY1 = null;
      cam.anchor = null;
      return animate(level, dur);
    }
    const r0 = el.getBoundingClientRect();
    if (cam.s === 1 && (r0.bottom < 60 || r0.top > vh - 80)) {
      // element off-screen: ride the page to it at 1.0x first
      await scrollTo(r0.top + window.scrollY - (HEADER + 56), 700);
    }
    const r = el.getBoundingClientRect();
    const docY1 = (r.top + window.scrollY) / cam.s;
    const hNew = (r.height / cam.s) * level;
    const minTop = HEADER * level + 16;
    let anchor = r.top;
    if (hNew > vh - minTop - 24) {
      anchor = minTop;
    } else {
      if (anchor + hNew > vh - 24) anchor = vh - 24 - hNew;
      if (anchor < minTop) anchor = minTop;
    }
    cam.docY1 = docY1;
    cam.anchor = anchor;
    return animate(level, dur);
  }

  /** Eased return to 1.0x, keeping the last anchor so the subject stays put. */
  function unfocus(dur: number): Promise<null> {
    return animate(1, dur);
  }

  function scrollToEl(el: Element | null, dur: number, frac?: number): Promise<null> {
    if (!el) return Promise.resolve(null);
    const f = frac ?? 0.32;
    const r = el.getBoundingClientRect();
    return scrollTo(r.top + window.scrollY - window.innerHeight * f, dur);
  }

  function pulse(el: Element | null): void {
    if (!el || !layer) return;
    const r = el.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'gt-pulse';
    box.style.left = r.left - 3 + 'px';
    box.style.top = r.top - 3 + 'px';
    box.style.width = r.width + 6 + 'px';
    box.style.height = r.height + 6 + 'px';
    layer.appendChild(box);
    window.setTimeout(() => box.remove(), 1000);
  }

  gw.__gt = {
    focus,
    unfocus,
    scrollTo,
    scrollToBy: (dy: number, dur: number) => scrollTo(window.scrollY + dy, dur),
    scrollToEl,
    pulse,
    stats: () => ({ s: cam.s, y: window.scrollY, anchor: cam.anchor }),
  };
}
