/** Short commit id of the running build ("dev" outside a Vercel build). */
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || 'dev';
