import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://localhost:4400';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The browser talks to the NestJS API through this same origin, so auth
  // cookies are first-party and no CORS is needed in the browser.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
