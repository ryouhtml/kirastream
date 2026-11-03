import type { NextApiRequest, NextApiResponse } from 'next'
import {
  applyImageHeaders,
  assertRemoteUrl,
  detectImageType,
  fetchRemote,
  RemoteFetchError,
} from '@/lib/server-proxy'

// Endpoint ini khusus gambar MyAnimeList, jadi host dibatasi.
const MAL_HOSTS = ['myanimelist.net']
const MAX_URL_LENGTH = 2048

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query

  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL missing' })
  if (url.length > MAX_URL_LENGTH) return res.status(414).json({ error: 'URL terlalu panjang' })

  try {
    const target = await assertRemoteUrl(url, { allowHosts: MAL_HOSTS, protocols: ['https:'] })
    const upstream = await fetchRemote(target.toString(), {
      allowHosts: MAL_HOSTS,
      protocols: ['https:'],
      timeoutMs: 12_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://myanimelist.net/',
        Accept: 'image/*,*/*;q=0.8',
      },
    })

    const imageType = detectImageType(upstream.data)
    if (!imageType) {
      return res.status(415).json({ error: 'Upstream bukan gambar yang didukung' })
    }

    applyImageHeaders(res, imageType)
    return res.status(200).send(upstream.data)
  } catch (error) {
    console.error('MAL image proxy error:', error instanceof Error ? error.message : error)
    const status = error instanceof RemoteFetchError ? error.status : 502
    return res.status(status).json({ error: 'Gagal mengambil gambar' })
  }
}
