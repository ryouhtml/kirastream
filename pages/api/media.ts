// pages/api/media.ts
// Proxy media passthrough untuk URL file video LANGSUNG (mp4/webm/m3u8).
// Dipakai sebagai fallback saat <video src="..."> gagal memuat URL asli,
// misalnya karena host memeriksa Referer atau memblokir permintaan browser.
//
// Ini BUKAN solusi untuk halaman embed (DoodStream dan sejenisnya): halaman
// embed memuat aset, cookie, dan script dari domain aslinya, jadi tetap harus
// dibuka lewat iframe di sana. Proxy hanya meneruskan byte media apa adanya,
// termasuk dukungan HTTP Range agar video bisa di-seek tanpa menunggu unduh
// penuh.

import type { NextApiRequest, NextApiResponse } from 'next'
import { Readable } from 'node:stream'
import { openRemoteStream, RemoteFetchError } from '@/lib/server-proxy'

const MAX_URL_LENGTH = 2048
const MAX_PLAYLIST_BYTES = 4 * 1024 * 1024

// Hanya tipe media yang boleh diputar browser. HTML/SVG dari upstream ditolak
// supaya tidak bisa dieksekusi di origin aplikasi.
const ALLOWED_TYPE =
  /^(video\/|audio\/|application\/vnd\.apple\.mpegurl\b|application\/x-mpegurl\b|application\/octet-stream\b|binary\/octet-stream\b)/i

const PLAYLIST_TYPE = /mpegurl/i

function isPlaylist(url: string, contentType: string): boolean {
  return PLAYLIST_TYPE.test(contentType) || /\.m3u8(\?|$)/i.test(url)
}

function proxyHref(absoluteUrl: string): string {
  return `/api/media?url=${encodeURIComponent(absoluteUrl)}`
}

/**
 * Playlist HLS berisi URL segmen relatif terhadap lokasi playlist aslinya.
 * Kalau playlist dikirim apa adanya lewat proxy, browser akan mencari segmen
 * di origin aplikasi. Jadi semua URI segmen/key/sub-playlist ditulis ulang
 * agar tetap melewati proxy ini.
 */
function rewritePlaylist(text: string, baseUrl: string): string {
  const resolve = (reference: string) => {
    try {
      return new URL(reference, baseUrl).toString()
    } catch {
      return reference
    }
  }

  return text
    .replace(/URI="([^"]+)"/g, (_match, uri: string) => `URI="${proxyHref(resolve(uri))}"`)
    .replace(/^[^#\s][^\r\n]*/gm, (line) => proxyHref(resolve(line.trim())))
}

export const config = {
  api: {
    // Video bisa jauh melebihi batas 4 MB bawaan Next.js.
    responseLimit: false,
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Metode tidak didukung' })
  }

  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' })
  }
  if (url.length > MAX_URL_LENGTH) {
    return res.status(414).json({ error: 'URL terlalu panjang' })
  }

  try {
    const requestHeaders: Record<string, string> = {
      Accept: '*/*',
      'Accept-Encoding': 'identity',
    }

    // Sebagian CDN memeriksa Referer/Origin. Kirim referer dari domain
    // upstream sendiri, bukan dari domain aplikasi.
    try {
      requestHeaders.Referer = `https://${new URL(url).hostname}/`
    } catch {
      /* URL tidak valid akan ditolak assertRemoteUrl */
    }

    // Teruskan Range supaya seek dan resume tetap jalan.
    if (typeof req.headers.range === 'string') {
      requestHeaders.Range = req.headers.range
    }
    if (typeof req.headers['if-range'] === 'string') {
      requestHeaders['If-Range'] = req.headers['if-range']
    }

    const { response, finalUrl } = await openRemoteStream(url, { headers: requestHeaders })
    const contentType = (response.headers.get('content-type') || '').toLowerCase()

    if (!ALLOWED_TYPE.test(contentType)) {
      try {
        await response.body?.cancel()
      } catch {
        /* abaikan */
      }
      return res.status(415).json({ error: 'Upstream bukan media yang didukung' })
    }

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Cache-Control', 'private, max-age=300')

    if (isPlaylist(finalUrl, contentType)) {
      const body = await response.text()
      if (Buffer.byteLength(body, 'utf8') > MAX_PLAYLIST_BYTES) {
        return res.status(413).json({ error: 'Playlist terlalu besar' })
      }
      res.setHeader('Content-Type', contentType.split(';')[0].trim() || 'application/vnd.apple.mpegurl')
      return res.status(200).send(rewritePlaylist(body, finalUrl))
    }

    const length = response.headers.get('content-length')
    const range = response.headers.get('content-range')
    if (length) res.setHeader('Content-Length', length)
    if (range) res.setHeader('Content-Range', range)
    res.setHeader('Content-Type', contentType.split(';')[0].trim())
    res.setHeader('Accept-Ranges', response.headers.get('accept-ranges') || 'bytes')

    const status = response.status === 206 ? 206 : response.status === 200 ? 200 : response.status
    res.status(status)

    if (req.method === 'HEAD' || !response.body) {
      try {
        await response.body?.cancel()
      } catch {
        /* abaikan */
      }
      return res.end()
    }

    const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0])
    const abort = () => stream.destroy()
    res.on('close', abort)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  } catch (error) {
    console.error('Media proxy error:', error instanceof Error ? error.message : error)
    if (res.headersSent) return res.destroy()
    const status = error instanceof RemoteFetchError ? error.status : 502
    return res.status(status).json({ error: 'Gagal mengambil media' })
  }
}
