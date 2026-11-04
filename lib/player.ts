// ─── PLAYER HELPERS ──────────────────────────────────────────
// Sebagian host embed (terutama mirror DoodStream) sering diblokir
// jaringan/ISP Indonesia, jadi jangan dijadikan pilihan default kalau
// episode masih punya server lain. Pilihan manual pengguna tetap diingat
// supaya episode berikutnya langsung memakai server yang sama.

const PREFERRED_HOST_KEY = 'kira-stream-host'

// Host yang paling sering kena blokir ISP (mirror DoodStream).
const OFTEN_BLOCKED_HOSTS = [
  'playmogo.com',
  'doodstream.com',
  'dood.watch',
  'dood.to',
  'dood.pm',
  'dood.so',
  'dood.cx',
  'dood.la',
  'dood.wf',
  'dood.re',
  'doods.pro',
  'ds2play.com',
  'ds2video.com',
  'dsvplay.com',
]

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

/** Host sering diblokir ISP, bukan berarti selalu gagal. */
export function isOftenBlockedHost(url: string): boolean {
  const host = hostOf(url)
  if (!host) return false
  return OFTEN_BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))
}

export function getPreferredStreamHost(): string {
  try {
    return localStorage.getItem(PREFERRED_HOST_KEY) || ''
  } catch {
    return ''
  }
}

export function rememberStreamHost(url: string) {
  const host = hostOf(url)
  if (!host) return
  try {
    localStorage.setItem(PREFERRED_HOST_KEY, host)
  } catch {
    /* storage bisa diblokir — abaikan */
  }
}

/**
 * Index stream yang dipakai pertama kali:
 * 1. host pilihan pengguna (terakhir dipilih manual),
 * 2. server pertama yang host-nya bukan mirror DoodStream,
 * 3. server pertama.
 */
export function pickStreamIndex(urls: string[]): number {
  if (urls.length === 0) return 0

  const preferred = getPreferredStreamHost()
  if (preferred) {
    const index = urls.findIndex((url) => hostOf(url) === preferred)
    if (index >= 0) return index
  }

  const safe = urls.findIndex((url) => !isOftenBlockedHost(url))
  return safe >= 0 ? safe : 0
}

// ─── HEALTH CHECK SERVER ────────────────────────────────────
// Server mengecek host stream lebih dulu supaya halaman tidak perlu mencoba
// server yang jelas tidak bisa dipakai. Hasilnya cuma petunjuk: jaringan
// pengguna bisa berbeda dari jaringan server.

export interface StreamHealth {
  url: string
  /** Server kita berhasil mendapat respons < 400 dari host. */
  reachable: boolean
  /** Host mengizinkan dirinya di-embed di iframe (XFO / CSP). */
  frameable: boolean
  status: number
}

/** Host menolak di-embed — iframe pasti gagal, jadi server ini dilewati. */
export function isStreamBlocked(health?: StreamHealth): boolean {
  return !!health && !health.frameable
}

/** Ambil hasil health check untuk daftar URL stream (maksimal 8 per request). */
export async function checkStreamHealth(
  urls: string[],
  signal?: AbortSignal
): Promise<Map<string, StreamHealth>> {
  const unique = Array.from(new Set(urls.filter(Boolean))).slice(0, 8)
  const result = new Map<string, StreamHealth>()
  if (unique.length === 0) return result

  try {
    const response = await fetch(
      `/api/stream-health?urls=${encodeURIComponent(JSON.stringify(unique))}`,
      { cache: 'no-store', signal }
    )
    if (!response.ok) return result

    const body = (await response.json()) as { results?: StreamHealth[] }
    for (const entry of body.results || []) {
      if (entry && typeof entry.url === 'string') result.set(entry.url, entry)
    }
  } catch {
    /* health check bersifat opsional — abaikan kalau gagal */
  }

  return result
}

/**
 * Index server terbaik menurut hasil health check:
 * 1. host pilihan pengguna, selama host itu tidak menolak embed,
 * 2. server pertama yang terjangkau dan mengizinkan embed,
 * 3. server pertama yang mengizinkan embed,
 * 4. fallback ke urutan lama (pickStreamIndex).
 *
 * Server yang tidak punya data health dianggap netral, bukan gagal.
 */
export function bestStreamIndex(urls: string[], health: Map<string, StreamHealth>): number {
  if (urls.length === 0) return 0

  const preferred = getPreferredStreamHost()
  if (preferred) {
    const index = urls.findIndex((url) => hostOf(url) === preferred)
    if (index >= 0 && !isStreamBlocked(health.get(urls[index]))) return index
  }

  const healthy = urls.findIndex((url) => {
    const entry = health.get(url)
    return !!entry && entry.frameable && entry.reachable
  })
  if (healthy >= 0) return healthy

  const embeddable = urls.findIndex((url) => !isStreamBlocked(health.get(url)))
  if (embeddable >= 0) return embeddable

  return pickStreamIndex(urls)
}

/** URL proxy media untuk fallback saat <video> gagal memuat URL asli. */
export function mediaProxyUrl(url: string): string {
  return `/api/media?url=${encodeURIComponent(url)}`
}
