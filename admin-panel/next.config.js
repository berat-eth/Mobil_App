/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Leaflet haritası için devre dışı
  
  // Production optimizations
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compression
  compress: true,
  
  // Performance
  poweredByHeader: false,
  
  // Docker için standalone output
  output: 'standalone',
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js ve bazı kütüphaneler için gerekli
              "style-src 'self' 'unsafe-inline'", // Tailwind ve inline styles için
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.huglutekstil.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()'
            ].join(', ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
