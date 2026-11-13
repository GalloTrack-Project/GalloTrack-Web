import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GalloTrack — Advanced Gamefowl Breeding & Match Analytics Platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://gallotrack.vercel.app';
  const logoUrl = new URL('/brand/logo-full-dark.svg', site).toString();

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
          <img src={logoUrl} alt="GalloTrack" height={56} style={{ width: 'auto' }} />
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
          <span>ISUFST CICI Capstone Project</span>
          <span>gallotrack.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
