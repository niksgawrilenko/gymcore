import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// The plugin wires src/i18n/request.ts into server components (getTranslations, NextIntlClientProvider).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content Security Policy. Only the origins the app actually talks to are allowed: the Cloudinary
 * upload API (the browser uploads straight to it) and res.cloudinary.com (delivered photos/videos).
 * Next.js hydration uses inline scripts and React writes inline styles, hence 'unsafe-inline'.
 * There is no <script src="http…"> anywhere in the app, so 'self' covers all executable code.
 * Applied in production only: Turbopack HMR in `next dev` needs 'unsafe-eval' and a websocket.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com",
  "media-src 'self' blob: https://res.cloudinary.com https://*.cloudinary.com",
  "connect-src 'self' https://api.cloudinary.com",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

// Hardening headers on every response (Vercel serves HTTPS only, so HSTS is safe).
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework and its version in every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...SECURITY_HEADERS,
          ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: CSP }] : []),
        ],
      },
      // Personal data (the JSON backup) must never be cached by a browser or a shared proxy.
      { source: '/api/export', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      // Personal share links and API responses stay out of search indexes (robots.txt also blocks them).
      { source: '/shared/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
