import type { NextConfig } from 'next';
import path from 'path';

// Injected at build time so the running bundle can identify itself. Vercel
// exposes VERCEL_GIT_COMMIT_SHA during the build; local builds show "dev".
const buildSha = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 7);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha,
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
