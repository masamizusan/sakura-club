const withNextIntl = require('next-intl/plugin')('./src/i18n.ts')
// Vercel Build Cache Buster
require('./vercel-build-cache-buster.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel用の設定
  output: 'standalone',
  outputFileTracing: true,
  
  // PWA対応のための設定
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // PWAパフォーマンス最適化
  compress: true,
  
  // モバイル最適化
  poweredByHeader: false,
  
  // セキュリティヘッダー
  async rewrites() {
    return [
      {
        source: '/sw.js',
        destination: '/sw.js',
      },
    ]
  },
}

module.exports = withNextIntl(nextConfig)