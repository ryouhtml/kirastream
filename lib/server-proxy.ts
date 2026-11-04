// ─── REMOTE URL GUARD (server-only) ──────────────────────────
// Dipakai semua API route yang mengambil konten dari URL eksternal.
// Tujuan:
//   1. Cegah SSRF ke jaringan internal / cloud metadata.
//   2. Cegah XSS same-origin dengan memaksa respons berupa gambar asli.
//   3. Batasi redirect, timeout, dan ukuran respons.

import axios from 'axios'
import dns from 'node:dns/promises'
import net from 'node:net'

export class RemoteFetchError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'RemoteFetchError'
    this.status = status
  }
}

export interface RemoteFetchOptions {
  /** Daftar domain yang boleh diakses (suffix match, mis. "myanimelist.net"). */
  allowHosts?: string[]
  /** Protokol yang diizinkan. Default: https saja. */
  protocols?: string[]
  /** Batas waktu request (ms). Default 12 detik. */
  timeoutMs?: number
  /** Batas ukuran respons (byte). Default 15 MB. */
  maxBytes?: number
  /** Jumlah redirect maksimal. Default 3. */
  maxRedirects?: number
  headers?: Record<string, string>
}

export interface RemoteFetchResult {
  data: Buffer
  contentType: string | null
  finalUrl: string
}

const DEFAULT_PROTOCOLS = ['https:']
const DEFAULT_MAX_BYTES = 15 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_MAX_REDIRECTS = 3

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true
  const [a, b] = parts
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 || // privat
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // privat
    (a === 192 && b === 168) || // privat
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 198 && (b === 18 || b === 19)) || // benchmark
    (a === 198 && b === 51) || // TEST-NET-2
    (a === 203 && b === 0) || // TEST-NET-3
    a >= 224 // multicast + reserved
  )
}

function isBlockedIp(ip: string): boolean {
  const value = ip.toLowerCase().replace(/%.+$/, '')
  if (net.isIPv4(value)) return isBlockedIpv4(value)
  if (!net.isIPv6(value)) return true

  if (value === '::' || value === '::1') return true
  if (value.startsWith('::ffff:')) return true // IPv4-mapped: tidak diperlukan untuk fetch publik
  if (value.startsWith('2002:')) return true // 6to4 (bisa membungkus IPv4 privat)
  if (value.startsWith('2001:0000:') || value.startsWith('2001:0:')) return true // Teredo
  if (value.startsWith('fc') || value.startsWith('fd')) return true // ULA
  if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true // link-local
  if (value.startsWith('ff')) return true // multicast
  if (value.startsWith('2001:db8')) return true // dokumentasi
  if (value.startsWith('64:ff9b')) return true // NAT64

  return false
}

function hostAllowed(hostname: string, allowHosts: string[]): boolean {
  return allowHosts.some((host) => {
    const allowed = host.toLowerCase()
    return hostname === allowed || hostname.endsWith(`.${allowed}`)
  })
}

/**
 * Validasi URL eksternal sebelum di-fetch. Melempar RemoteFetchError (400)
 * jika URL tidak valid, memakai protokol terlarang, mengarah ke host yang
 * tidak diizinkan, atau resolve ke alamat privat.
 */
export async function assertRemoteUrl(rawUrl: string, options: Pick<RemoteFetchOptions, 'allowHosts' | 'protocols'> = {}) {
  let url: URL
  try {
    url = new URL(String(rawUrl))
  } catch {
    throw new RemoteFetchError('URL tidak valid', 400)
  }

  const protocols = options.protocols || DEFAULT_PROTOCOLS
  if (!protocols.includes(url.protocol)) {
    throw new RemoteFetchError('Protokol URL tidak diizinkan', 400)
  }
  if (url.username || url.password) {
    throw new RemoteFetchError('URL tidak boleh memuat kredensial', 400)
  }
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new RemoteFetchError('Port URL tidak diizinkan', 400)
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!hostname) throw new RemoteFetchError('Host URL tidak valid', 400)
  if (options.allowHosts && !hostAllowed(hostname, options.allowHosts)) {
    throw new RemoteFetchError('Host URL tidak diizinkan', 400)
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new RemoteFetchError('Alamat tujuan diblokir', 400)
    return url
  }

  let records: Array<{ address: string }>
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new RemoteFetchError('Host tidak dapat di-resolve', 400)
  }
  if (records.length === 0) throw new RemoteFetchError('Host tidak dapat di-resolve', 400)
  for (const record of records) {
    if (isBlockedIp(record.address)) throw new RemoteFetchError('Alamat tujuan diblokir', 400)
  }

  return url
}

/**
 * Fetch URL yang sudah divalidasi, mengikuti redirect secara manual agar
 * setiap hop tetap melewati assertRemoteUrl.
 */
export async function fetchRemote(rawUrl: string, options: RemoteFetchOptions = {}): Promise<RemoteFetchResult> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const protocolOptions = { allowHosts: options.allowHosts, protocols: options.protocols }

  let current = await assertRemoteUrl(rawUrl, protocolOptions)

  for (let attempt = 0; attempt <= maxRedirects; attempt++) {
    let response
    try {
      response = await axios.get<ArrayBuffer>(current.toString(), {
        responseType: 'arraybuffer',
        timeout: timeoutMs,
        maxRedirects: 0,
        maxContentLength: maxBytes,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: options.headers,
      })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status) {
        throw new RemoteFetchError('Upstream mengembalikan error', 502)
      }
      throw new RemoteFetchError('Gagal menghubungi upstream', 502)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers['location']
      if (!location) throw new RemoteFetchError('Redirect tanpa tujuan', 502)
      const next = new URL(String(location), current)
      current = await assertRemoteUrl(next.toString(), protocolOptions)
      continue
    }

    return {
      data: Buffer.from(response.data),
      contentType: (response.headers['content-type'] as string) || null,
      finalUrl: current.toString(),
    }
  }

  throw new RemoteFetchError('Terlalu banyak redirect', 502)
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export interface RemoteStreamOptions {
  /** Protokol yang diizinkan. Default: http + https. */
  protocols?: string[]
  /** Batas waktu sampai header respons diterima (ms). Default 12 detik. */
  timeoutMs?: number
  /** Jumlah redirect maksimal. Default 3. */
  maxRedirects?: number
  headers?: Record<string, string>
}

export interface RemoteStreamResult {
  response: Response
  finalUrl: string
}

/**
 * Buka respons upstream tanpa menampung seluruh body (untuk proxy media).
 * Redirect ditangani manual supaya setiap hop tetap lewat assertRemoteUrl.
 * Timeout hanya berlaku sampai header diterima; body dialirkan apa adanya.
 */
export async function openRemoteStream(
  rawUrl: string,
  options: RemoteStreamOptions = {}
): Promise<RemoteStreamResult> {
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const protocolOptions = { protocols: options.protocols || ['http:', 'https:'] }

  let current = await assertRemoteUrl(rawUrl, protocolOptions)

  for (let attempt = 0; attempt <= maxRedirects; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response

    try {
      response = await fetch(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': DEFAULT_USER_AGENT,
          ...options.headers,
        },
      })
    } catch {
      throw new RemoteFetchError('Gagal menghubungi upstream', 502)
    } finally {
      clearTimeout(timer)
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      try {
        await response.body?.cancel()
      } catch {
        /* abaikan */
      }
      if (!location) throw new RemoteFetchError('Redirect tanpa tujuan', 502)
      current = await assertRemoteUrl(new URL(location, current).toString(), protocolOptions)
      continue
    }

    return { response, finalUrl: current.toString() }
  }

  throw new RemoteFetchError('Terlalu banyak redirect', 502)
}

/**
 * Deteksi tipe gambar dari magic bytes. Hanya tipe raster yang diizinkan —
 * SVG sengaja ditolak karena bisa memuat <script>.
 */
export function detectImageType(data: Buffer): string | null {
  if (data.length < 12) return null

  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return 'image/png'
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return 'image/gif'
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (data.toString('ascii', 4, 8) === 'ftyp') {
    const brand = data.toString('ascii', 8, 12)
    if (brand.startsWith('avif') || brand.startsWith('avis')) return 'image/avif'
    if (brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('mif1')) return 'image/heic'
  }
  if (data[0] === 0x42 && data[1] === 0x4d) return 'image/bmp'
  if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x01 && data[3] === 0x00) return 'image/x-icon'

  return null
}

/** Header keamanan untuk respons gambar dari proxy. */
export function applyImageHeaders(res: { setHeader: (name: string, value: string) => void }, contentType: string) {
  res.setHeader('Content-Type', contentType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate')
}
