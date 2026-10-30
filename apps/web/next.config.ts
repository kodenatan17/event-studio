import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/** Origin of the public asset CDN, if configured and valid (architecture.md §11.3, §15.1). */
function assetCdnOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_ASSET_CDN_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const cdn = assetCdnOrigin();
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:', ...(cdn ? [cdn] : [])],
    // `blob:`: GLTFLoader's ImageBitmapLoader fetches GLB-embedded textures via same-document
    // object URLs; without it every texture of a trusted template GLB is blocked.
    'connect-src': ["'self'", 'blob:', ...(isDev ? ['ws:'] : [])],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    '@undangan/contracts',
    '@undangan/ui',
    '@undangan/wedding-features',
    '@undangan/world-engine',
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
