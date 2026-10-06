'use client';

/**
 * Root-level safety net: this renders instead of the whole app when the root
 * layout itself (providers, contexts, a page render) throws, so the visitor
 * still gets a working page rather than a blank browser tab.
 *
 * It replaces the root layout, so it must render its own <html> and <body> and
 * cannot rely on globals.css — every style here is inline.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const detail = error?.message || 'An unexpected error occurred.';
  const digest = error?.digest;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0b1220',
          color: '#e2e8f0',
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: '480px',
            width: '100%',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '32px 28px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 16px',
              borderRadius: '10px',
              background: 'rgba(5, 150, 105, 0.15)',
              border: '1px solid rgba(5, 150, 105, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>
            GalloTrack hit an unexpected error
          </h1>
          <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
            Your data is safe — this screen only means the interface failed to render.
          </p>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', wordBreak: 'break-word' }}>
            {detail}
            {digest ? ` (ref: ${digest})` : ''}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => (reset ? reset() : window.location.reload())}
              style={{
                background: 'linear-gradient(90deg, #059669, #10b981)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '11px 20px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '11px 20px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Go to sign in
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
