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
    // CSP disesuaikan dengan kebutuhan Next.js (inline bootstrap), Firebase Auth,
    // reCAPTCHA, serta host gambar/video yang dipakai aplikasi.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      `script-src 'self' 'unsafe-inline'${
        process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
      } https://apis.google.com https://www.gstatic.com https://www.google.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "media-src 'self' blob: https:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      [
        "connect-src 'self'",
        // Host streaming embed berubah-ubah, jadi cakup semua HTTPS. Ini
        // dipakai EmbedPlayer untuk mengecek apakah server video bisa
        // dijangkau jaringan pengguna sebelum iframe dimuat.
        'https:',
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'wss://*.firebaseio.com',
        'https://firestore.googleapis.com',
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://www.google.com',
        'https://www.gstatic.com',
        'https://www.sankavollerei.web.id',
        'https://api.jikan.moe',
        'https://api.myanimelist.net',
        'https://cors.siputzx.my.id',
        'https://wsrv.nl',
      ].join(' '),
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
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
