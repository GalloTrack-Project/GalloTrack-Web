import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GalloTrack — Advanced Gamefowl Breeding & Match Analytics Platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f766e 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1.8 20.5 5v6c0 5.2-3.5 8.5-8.5 11.2C7 19.5 3.5 16.2 3.5 11V5L12 1.8z" />
            </svg>
          </div>
          <span style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            GALLO<span style={{ color: '#a7f3d0' }}>TRACK</span>
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              marginLeft: '8px',
            }}
          >
            v1.0.0
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '900px' }}>
          <h1
            style={{
              fontSize: '54px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              margin: 0,
            }}
          >
            Advanced Gamefowl Breeding &amp; Match Analytics
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#a7f3d0',
              fontWeight: 500,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Lineage tracking, pedigree mapping, match records, and flock overview.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            paddingTop: '24px',
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          <span>ISUFST CICT Capstone Project</span>
          <span>gallotrack.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
