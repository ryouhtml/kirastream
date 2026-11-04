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
