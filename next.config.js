/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_ANIME_API: 'https://www.sankavollerei.web.id/anime',
    NEXT_PUBLIC_MAL_API: 'https://api.myanimelist.net/v2',
    NEXT_PUBLIC_JIKAN_API: 'https://api.jikan.moe/v4',
  },
  // Rute lama → rute baru (link lama di favorit/riwayat/pesan tetap jalan)
  async redirects() {
    return [
      { source: '/anime/:slug((?!detail$|episode$)[^/]+)', destination: '/anime/detail/:slug', permanent: true },
      { source: '/watch/:slug', destination: '/anime/episode/:slug', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
    ]
  },
}

module.exports = nextConfig
