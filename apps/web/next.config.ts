import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ktb/shared'],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    // API_URL = internal address (server-to-server, not browser)
    // In dev container: http://localhost:3001
    // In production: http://api-service:3001 or similar
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    return {
      // Use fallback so Next.js API routes (like /api/auth) are checked first
      fallback: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
