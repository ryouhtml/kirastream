// pages/api/proxy.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyImageHeaders,
  assertRemoteUrl,
  detectImageType,
  fetchRemote,
  RemoteFetchError,
} from '@/lib/server-proxy'

const MAX_URL_LENGTH = 2048
const SAKURANOVEL_HOST = /(^|\.)sakuranovel\.id$/i

function refererFor(hostname: string): string {
  // Beberapa CDN (Webtoons, MyAnimeList) punya hotlink protection yang cuma
  // ngizinin Referer dari domain resminya sendiri.
  if (/webtoons\.com|pstatic\.net/i.test(hostname)) return 'https://www.webtoons.com/'
  if (/myanimelist\.net/i.test(hostname)) return 'https://myanimelist.net/'
  return `https://${hostname}/`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }
  if (url.length > MAX_URL_LENGTH) {
    return res.status(414).json({ error: 'URL terlalu panjang' })
  }

  try {
    const target = await assertRemoteUrl(url, { protocols: ['http:', 'https:'] })

    // sakuranovel.id diproteksi Cloudflare/WAF yang memblokir request server.
    // Titipkan lewat wsrv.nl (image proxy publik) khusus domain ini.
    const upstream = SAKURANOVEL_HOST.test(target.hostname)
      ? await fetchRemote(`https://wsrv.nl/?url=${encodeURIComponent(target.toString())}`, {
          timeoutMs: 15_000,
        })
      : await fetchRemote(target.toString(), {
          protocols: ['http:', 'https:'],
          timeoutMs: 15_000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: refererFor(target.hostname),
            Accept: 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8',
          },
        })

    // Hanya gambar raster asli yang boleh dikirim balik. Ini mencegah upstream
    // menyajikan HTML/SVG yang bisa dieksekusi di origin aplikasi.
    const imageType = detectImageType(upstream.data)
    if (!imageType) {
      return res.status(415).json({ error: 'Upstream bukan gambar yang didukung' })
    }

    applyImageHeaders(res, imageType)
    return res.send(upstream.data)
  } catch (error) {
    console.error('Image proxy error:', error instanceof Error ? error.message : error)
    const status = error instanceof RemoteFetchError ? error.status : 502
    return res.status(status).json({ error: 'Gagal mengambil gambar' })
  }
}
