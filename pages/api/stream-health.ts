// pages/api/stream-health.ts
// Cek cepat dari sisi server: apakah host stream bisa dijangkau dan apakah
// responsnya mengizinkan di-embed di iframe.
//
// Catatan penting: keterjangkauan dari server TIDAK sama dengan keterjangkauan
// dari jaringan pengguna. Server bisa menghubungi host yang diblokir ISP
// pengguna, dan sebaliknya host bisa memblokir IP server/VPS. Karena itu hasil
// `reachable` hanya dipakai sebagai petunjuk urutan server, sedangkan
// `frameable` (X-Frame-Options / CSP frame-ancestors) adalah sinyal keras:
// kalau host menolak di-embed, iframe di browser mana pun akan gagal.

import type { NextApiRequest, NextApiResponse } from 'next'
import { openRemoteStream } from '@/lib/server-proxy'

const MAX_URLS = 8
const TIMEOUT_MS = 6000
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 200

interface HealthResult {
  url: string
  /** Server kita berhasil mendapat respons < 400. */
  reachable: boolean
  /** Respons mengizinkan halaman ini dijadikan iframe. */
  frameable: boolean
  status: number
}

type CachedHealth = Omit<HealthResult, 'url'> & { expires: number }

const cache = new Map<string, CachedHealth>()

function readCache(url: string): CachedHealth | null {
  const entry = cache.get(url)
  if (!entry) return null
  if (entry.expires <= Date.now()) {
    cache.delete(url)
    return null
  }
  return entry
}

function writeCache(url: string, result: Omit<HealthResult, 'url'>) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    // Buang entri kedaluwarsa dulu, lalu entri terbaru paling lama.
    const now = Date.now()
    for (const [key, value] of cache) {
      if (value.expires <= now) cache.delete(key)
    }
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest) cache.delete(oldest)
    }
  }
  cache.set(url, { ...result, expires: Date.now() + CACHE_TTL_MS })
}

/** `frame-ancestors` mengizinkan origin kita kalau memakai `*` atau skema `https:`. */
function frameAncestorsAllowsUs(directive: string): boolean {
  if (!directive) return false
  if (directive.includes('*')) return true
  return /(^|\s)https:(\s|$)/.test(directive)
}

function canEmbed(headers: Headers): boolean {
  const xfo = (headers.get('x-frame-options') || '').toLowerCase()
  // SAMEORIGIN/DENY/ALLOW-FROM semuanya menolak iframe lintas origin.
  if (xfo.includes('deny') || xfo.includes('sameorigin') || xfo.includes('allow-from')) {
    return false
  }

  const csp = (headers.get('content-security-policy') || '').toLowerCase()
  const match = /frame-ancestors([^;]*)/.exec(csp)
  if (match) {
    const directive = match[1].trim()
    // `frame-ancestors 'none'`, `'self'`, atau daftar domain lain berarti
    // iframe dari aplikasi ini ditolak.
    if (!frameAncestorsAllowsUs(directive)) return false
  }

  return true
}

async function probe(url: string): Promise<HealthResult> {
  try {
    const { response } = await openRemoteStream(url, {
      timeoutMs: TIMEOUT_MS,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    const status = response.status
    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    // File media langsung diputar lewat <video>, bukan iframe, jadi
    // X-Frame-Options tidak relevan untuk tipe ini.
    const isDirectMedia = /^(video|audio)\//.test(contentType) || /mpegurl/.test(contentType)
    const result = {
      reachable: status > 0 && status < 400,
      frameable: isDirectMedia ? true : canEmbed(response.headers),
      status,
    }
    // Body tidak dibutuhkan — batalkan supaya koneksi upstream ditutup.
    try {
      await response.body?.cancel()
    } catch {
      /* abaikan */
    }
    writeCache(url, result)
    return { url, ...result }
  } catch {
    // Gagal koneksi/timeout: jangan simpan terlalu lama, tapi tetap cache
    // singkat supaya request beruntun tidak menembak host yang sama terus.
    const result = { reachable: false, frameable: true, status: 0 }
    writeCache(url, result)
    return { url, ...result }
  }
}

function parseUrls(raw: string | string[] | undefined): string[] {
  if (typeof raw !== 'string') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const urls: string[] = []
  for (const item of parsed) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 2048) continue
    if (urls.includes(item)) continue
    try {
      const url = new URL(item)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue
    } catch {
      continue
    }
    urls.push(item)
    if (urls.length >= MAX_URLS) break
  }
  return urls
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Metode tidak didukung' })
  }

  const urls = parseUrls(req.query.urls)
  if (urls.length === 0) {
    return res.status(400).json({ error: 'Parameter urls tidak valid' })
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const cached = readCache(url)
      if (!cached) return probe(url)
      return {
        url,
        reachable: cached.reachable,
        frameable: cached.frameable,
        status: cached.status,
      }
    })
  )

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ results })
}
