import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register'],
      disallow: [
        '/dashboard',
        '/dashboard/*',
        '/admin',
        '/admin/*',
        '/api/*',
        '/share/*',
        '/chicken-profile/*',
        '/match-logs/*',
        '/breeding-history/*',
        '/chicken-inventory/*',
      ],
    },
    sitemap: 'https://gallotrack.vercel.app/sitemap.xml',
  };
}
