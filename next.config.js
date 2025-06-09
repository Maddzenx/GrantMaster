/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';
const supabaseUrl = 'https://mfqwewsuxvwvlbtfxwai.supabase.co';
const vinnovaUrl = 'https://data.vinnova.se';

const csp = isDev
  ? `default-src 'self'; img-src *; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${supabaseUrl} ${vinnovaUrl};`
  : `default-src 'self'; img-src *; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${supabaseUrl} ${vinnovaUrl};`;

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Production HTTPS redirect: replace 'yourdomain.com' with your real domain
      {
        source: '/(.*)',
        has: [{ type: 'host', value: 'yourdomain.com' }],
        permanent: true,
        destination: 'https://yourdomain.com/:path*',
      },
    ];
  },
}

module.exports = nextConfig