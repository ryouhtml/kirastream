// ─── NEKO (NEKOPOI) API ──────────────────────────────────────
// Sumber: sankavollerei.web.id/anime/nekopoi
//
// PERINGATAN: seluruh konten di modul ini adalah konten dewasa (18+).
// Modul ini sengaja dipisah dari lib/api.ts supaya tidak ikut ke bundle
// halaman lain dan gampang diaktifkan/nonaktifkan.
//
// Daftar endpoint yang tersedia:
//   GET /home                 → fetchNekoHome
//   GET /search?q=&page=      → fetchNekoSearch
//   GET /hentai-list?page=    → fetchNekoHentaiList
//   GET /genres               → fetchNekoGenres
//   GET /genre/:slug?page=    → fetchNekoByGenre
//   GET /category/:slug?page= → fetchNekoByCategory
//   GET /latest-hentai?page=  → fetchNekoLatestHentai
//   GET /latest-jav?page=     → fetchNekoLatestJav
//   GET /detail/:slug         → fetchNekoDetail
//   GET /episode/:slug        → fetchNekoEpisode

import axios, { AxiosInstance } from 'axios'
import { CONFIG, ENDPOINTS } from './config'

const nekoClient: AxiosInstance = axios.create({
  baseURL: CONFIG.NEKO_API,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

// ─── TYPES ───────────────────────────────────────────────────

export interface NekoPagination {
  currentPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface NekoPost {
  title: string
  slug: string
  url: string
  thumbnail: string
  genres: string[]
  description?: string
  date?: string
  status?: string
  score?: string
  /** Ada di daftar episode terbaru (kalau episode punya series). */
  seriesName?: string
  seriesSlug?: string
  seriesUrl?: string
}

export interface NekoRecommendation {
  title: string
  slug: string
  url: string
}

export interface NekoHomeData {
  recommended: NekoRecommendation[]
  latestHentai: NekoPost[]
  latestEpisodes: NekoPost[]
  latestJav: NekoPost[]
}

export interface NekoListResult {
  items: NekoPost[]
  pagination: NekoPagination
}

export interface NekoGenre {
  name: string
  slug: string
  url: string
}

export interface NekoEpisodeSummary {
  title: string
  slug: string
  url: string
  thumbnail: string
  uploadedDate?: string
}

export interface NekoDetail {
  title: string
  slug: string
  url: string
  thumbnail: string
  japanName?: string
  producer?: string
  type?: string
  status?: string
  duration?: string
  score?: string
  /** Genre di detail masih berupa string, bukan objek. */
  genres: string[]
  episodes: NekoEpisodeSummary[]
}

export interface NekoStream {
  server: string
  url: string
}

export interface NekoDownloadLink {
  host: string
  url: string
}

export interface NekoDownloadGroup {
  quality: string
  links: NekoDownloadLink[]
}

export interface NekoSeriesRef {
  name: string
  slug: string
  url: string
}

export interface NekoEpisodeDetail {
  title: string
  slug: string
  url: string
  thumbnail: string
  description?: string
  series: NekoSeriesRef | null
  streams: NekoStream[]
  downloads: NekoDownloadGroup[]
}

// ─── HELPERS ─────────────────────────────────────────────────

const isHttpUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value)

function mapPagination(raw: any): NekoPagination {
  const p = raw?.pagination || {}
  return {
    currentPage: Number(p.current_page ?? 1) || 1,
    totalPages: Number(p.total_pages ?? 1) || 1,
    hasNext: Boolean(p.has_next),
    hasPrev: Boolean(p.has_prev),
  }
}

function mapGenres(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((g: any) => (typeof g === 'string' ? g : g?.name || ''))
    .filter(Boolean)
}

function mapPost(item: any): NekoPost {
  return {
    title: item?.title || '',
    slug: item?.slug || '',
    url: item?.url || '',
    thumbnail: item?.thumbnail || '',
    genres: mapGenres(item?.genres),
    description: item?.description || '',
    date: item?.date || item?.uploadedDate || '',
    status: item?.status || '',
    score: item?.score != null ? String(item.score) : '',
    seriesName: item?.series_name || '',
    seriesSlug: item?.series_slug || '',
    seriesUrl: item?.series_url || '',
  }
}

function mapList(raw: any): NekoListResult {
  const list = Array.isArray(raw?.data) ? raw.data : []
  return {
    items: list.map(mapPost),
    pagination: mapPagination(raw),
  }
}

const EMPTY_LIST: NekoListResult = {
  items: [],
  pagination: { currentPage: 1, totalPages: 1, hasNext: false, hasPrev: false },
}

/**
 * True kalau URL Nekopoi adalah halaman seri (`/hentai/<slug>/`).
 * URL kategori (`/category/hentai/`) sengaja tidak dianggap seri.
 */
export function isNekoSeriesUrl(url: string): boolean {
  if (!url) return false
  try {
    return new URL(url).pathname.startsWith('/hentai/')
  } catch {
    return false
  }
}

/**
 * URL Nekopoi membedakan seri (`/hentai/<slug>/`) dari post episode
 * (`/<slug>/`). Seri dibuka di halaman detail, post lain di halaman episode.
 */
export function nekoPostHref(item: { slug?: string; url?: string }): string {
  const slug = item?.slug || ''
  if (!slug) return '/neko'
  return isNekoSeriesUrl(item?.url || '')
    ? `/neko/detail/${encodeURIComponent(slug)}`
    : `/neko/episode/${encodeURIComponent(slug)}`
}

/** "big-oppai" → "Big Oppai" untuk judul sementara saat nama asli belum ada. */
export function prettyNekoSlug(slug: string): string {
  return (slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Endpoint episode mengisi `series` dengan kategori (mis. /category/hentai/),
 * bukan seri induknya. Slug episode umumnya berbentuk
 * "<seri>-episode-<n>-...", jadi slug seri induk bisa ditebak dengan
 * memotong bagian episodenya.
 */
export function nekoSeriesSlugFromEpisode(slug: string): string {
  const match = (slug || '').match(/^(.+?)-episode-\d+(?:-|$)/i)
  return match ? match[1] : ''
}

// ─── API FUNCTIONS ───────────────────────────────────────────

/** Rilis terbaru: rekomendasi, hentai, episode, dan JAV. */
export async function fetchNekoHome(): Promise<NekoHomeData> {
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_HOME)
    const d = data?.data || {}
    return {
      recommended: Array.isArray(d.recommended)
        ? d.recommended.map((item: any) => ({
            title: item?.title || '',
            slug: item?.slug || '',
            url: item?.url || '',
          }))
        : [],
      latestHentai: Array.isArray(d.latest_hentai) ? d.latest_hentai.map(mapPost) : [],
      latestEpisodes: Array.isArray(d.latest_episodes) ? d.latest_episodes.map(mapPost) : [],
      latestJav: Array.isArray(d.latest_jav) ? d.latest_jav.map(mapPost) : [],
    }
  } catch {
    return { recommended: [], latestHentai: [], latestEpisodes: [], latestJav: [] }
  }
}

/** Cari seri hentai berdasarkan kata kunci. */
export async function fetchNekoSearch(query: string, page = 1): Promise<NekoListResult> {
  const q = query.trim()
  if (!q) return EMPTY_LIST
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_SEARCH(q, page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** Daftar semua seri hentai (bukan per episode). */
export async function fetchNekoHentaiList(page = 1): Promise<NekoListResult> {
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_HENTAI_LIST(page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** Daftar seluruh genre. */
export async function fetchNekoGenres(): Promise<NekoGenre[]> {
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_GENRES)
    const list = Array.isArray(data?.data) ? data.data : []
    return list
      .map((g: any) => ({
        name: g?.name || '',
        slug: g?.slug || '',
        url: g?.url || '',
      }))
      .filter((g: NekoGenre) => g.name && g.slug)
  } catch {
    return []
  }
}

/** Post berdasarkan genre (mis. "action"). */
export async function fetchNekoByGenre(slug: string, page = 1): Promise<NekoListResult> {
  if (!slug) return EMPTY_LIST
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_GENRE(slug, page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** Post berdasarkan kategori (mis. "3d-hentai", "jav-cosplay"). */
export async function fetchNekoByCategory(slug: string, page = 1): Promise<NekoListResult> {
  if (!slug) return EMPTY_LIST
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_CATEGORY(slug, page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** Episode hentai (animasi) terbaru. */
export async function fetchNekoLatestHentai(page = 1): Promise<NekoListResult> {
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_LATEST_HENTAI(page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** JAV / 3D terbaru. */
export async function fetchNekoLatestJav(page = 1): Promise<NekoListResult> {
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_LATEST_JAV(page))
    return mapList(data)
  } catch {
    return EMPTY_LIST
  }
}

/** Detail seri: metadata + daftar episode. */
export async function fetchNekoDetail(slug: string): Promise<NekoDetail | null> {
  if (!slug) return null
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_DETAIL(slug))
    const d = data?.data
    if (!d) return null
    return {
      title: d.title || '',
      slug: d.slug || slug,
      url: d.url || '',
      thumbnail: d.thumbnail || '',
      japanName: d.japan_name || '',
      producer: d.producer || '',
      type: d.type || '',
      status: d.status || '',
      duration: d.duration || '',
      score: d.score != null ? String(d.score) : '',
      genres: mapGenres(d.genres),
      episodes: Array.isArray(d.episodes)
        ? d.episodes.map((ep: any) => ({
            title: ep?.title || '',
            slug: ep?.slug || '',
            url: ep?.url || '',
            thumbnail: ep?.thumbnail || '',
            uploadedDate: ep?.uploadedDate || '',
          }))
        : [],
    }
  } catch {
    return null
  }
}

/** Stream & download per episode. URL non-http(s) dibuang. */
export async function fetchNekoEpisode(slug: string): Promise<NekoEpisodeDetail | null> {
  if (!slug) return null
  try {
    const { data } = await nekoClient.get(ENDPOINTS.NEKO_EPISODE(slug))
    const d = data?.data
    if (!d) return null

    const series = d.series
    return {
      title: d.title || '',
      slug: d.slug || slug,
      url: d.url || '',
      thumbnail: d.thumbnail || '',
      description: d.description || '',
      series:
        series && typeof series === 'object'
          ? {
              name: series.name || '',
              slug: series.slug || '',
              url: series.url || '',
            }
          : null,
      streams: Array.isArray(d.streams)
        ? d.streams
            .filter((s: any) => isHttpUrl(s?.url))
            .map((s: any) => ({ server: s.server || '', url: s.url }))
        : [],
      downloads: Array.isArray(d.downloads)
        ? d.downloads
            .map((group: any) => ({
              quality: group?.quality || '',
              links: Array.isArray(group?.links)
                ? group.links
                    .filter((l: any) => isHttpUrl(l?.url))
                    .map((l: any) => ({ host: l.host || '', url: l.url }))
                : [],
            }))
            .filter((group: NekoDownloadGroup) => group.links.length > 0)
        : [],
    }
  } catch {
    return null
  }
}
