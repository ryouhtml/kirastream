import axios, { AxiosInstance } from 'axios'
import { CONFIG, ENDPOINTS } from './config'

// ─── API CLIENTS ─────────────────────────────────────────────

// Anime API Client (Sankavollerei — Animekompi)
const animeClient: AxiosInstance = axios.create({
  baseURL: CONFIG.ANIME_API,
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
  },
})

// Jikan API Client (MAL Alternative - Free)
const jikanClient: AxiosInstance = axios.create({
  baseURL: CONFIG.JIKAN_API,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
  },
})

// ─── TYPES ───────────────────────────────────────────────────

export interface Anime {
  title: string
  slug: string
  image: string
  score?: string
  episode?: string
  type?: string
  status?: string
  genres?: string[]
  release?: string
}

export interface AnimeDetail {
  title: string
  image: string
  description: string
  info: {
    japanese?: string
    type?: string
    status?: string
    total_episode?: string | number
    score?: string
    duration?: string
    season?: string
    released?: string
    producer?: string
    studio?: string
    genre?: string
  }
  genres: string[]
  episodes: Episode[]
  batchSlug?: string
}

export interface Episode {
  title: string
  slug: string
  date?: string
}

export interface StreamData {
  title: string
  // kind: 'embed' → iframe, 'direct' → file video langsung (<video>)
  streams: { server: string; url: string; kind?: string }[]
  downloads: DownloadLink[]
  animeSlug?: string
  prevSlug?: string
  nextSlug?: string
}

export interface DownloadLink {
  resolution: string
  format: string
  links: { host: string; url: string }[]
}

export interface MALAnime {
  mal_id: number
  title: string
  images: { jpg: { image_url: string; large_image_url: string } }
  score?: number
  scored_by?: number
  rank?: number
  popularity?: number
  episodes?: number
  status?: string
  synopsis?: string
  genres?: { mal_id: number; name: string }[]
  studios?: { mal_id: number; name: string }[]
}

export interface AnimeCharacterType {
  name: string
  slug: string
}

export interface AnimeSeason {
  name: string
  slug: string
}

// ─── ANIME API FUNCTIONS ─────────────────────────────────────
// Sumber: sankavollerei.web.id/anime/animekompi (home, terbaru, batch, movie, schedule,
// list, az, search, filter, genres, genre/:slug, seasons, season/:slug, detail/:slug,
// episode/:slug, episode/:slug/mirrors, ...)

async function getJSON(path: string): Promise<any> {
  const { data } = await animeClient.get(path)
  return data
}

async function listOf(path: string): Promise<Anime[]> {
  try {
    return extractAnimes(await getJSON(path))
  } catch {
    return []
  }
}

export async function fetchHome(_page = 1): Promise<Anime[]> {
  try {
    const raw = await getJSON(ENDPOINTS.HOME)
    const d = raw?.data ?? raw ?? {}
    // Gabungkan semua section (featured, latest, popular, trending, ...)
    const seen = new Set<string>()
    const out: Anime[] = []
    const push = (list: Anime[]) =>
      list.forEach((a) => { if (!seen.has(a.slug)) { seen.add(a.slug); out.push(a) } })
    if (Array.isArray(d)) push(extractAnimes(d))
    else Object.values(d).forEach((v) => Array.isArray(v) && push(extractAnimes(v)))
    return out
  } catch {
    return []
  }
}

// Anime terbaru / ongoing
export async function fetchLatest(page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.ONGOING(page))
}

export async function fetchOngoing(page = 1): Promise<Anime[]> {
  return fetchLatest(page)
}

export async function fetchCompleted(page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.COMPLETE(page))
}

export async function fetchPopular(page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.POPULAR(page))
}

export async function fetchMovies(page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.MOVIE(page))
}

export async function fetchUpcoming(page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.UPCOMING(page))
}

// Semua anime (list mode)
export async function fetchAllAnime(_page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.ALL_ANIME)
}

export async function fetchByType(type: string, page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.TYPE(type, page))
}

export async function searchAnime(keyword: string, page = 1): Promise<Anime[]> {
  if (!keyword.trim()) return []
  return listOf(ENDPOINTS.SEARCH(keyword.trim(), page))
}

export async function fetchGenres(): Promise<{ name: string; slug: string }[]> {
  try {
    const data = await getJSON(ENDPOINTS.GENRES)
    const list = data?.data?.genres || data?.data?.genreList || data?.genres || data?.genreList || data?.data || []
    if (!Array.isArray(list)) return []
    return list
      .map((g: any) => ({
        name: g.title || g.name || g.genre || (typeof g === 'string' ? g : ''),
        slug: g.slug || g.genreId || cleanSlug(g.href || '') || String(g.title || g.name || g || '').toLowerCase().replace(/\s+/g, '-'),
      }))
      .filter((g: any) => g.name)
  } catch {
    return []
  }
}

export async function fetchSeasons(): Promise<AnimeSeason[]> {
  try {
    const data = await getJSON(ENDPOINTS.SEASONS)
    const d = data?.data ?? data
    const flat: any[] = []
    // Bisa berupa array flat atau dikelompokkan per tahun
    const walk = (v: any) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') {
        if (v.slug && (v.name || v.title)) flat.push(v)
        else Object.values(v).forEach(walk)
      }
    }
    walk(d?.seasons ?? d)
    return flat.map((s) => ({ name: s.name || s.title || '', slug: s.slug })).filter((s) => s.name)
  } catch {
    return []
  }
}

// season: slug penuh (mis. "fall-2025") atau season + year terpisah
export async function fetchBySeason(season: string, year?: string | number, page = 1): Promise<Anime[]> {
  const slug = year ? `${String(season).toLowerCase()}-${year}` : String(season)
  return listOf(ENDPOINTS.SEASON(slug, page))
}

export async function fetchByGenre(slug: string, page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.GENRE(slug, page))
}

export async function fetchByStudio(slug: string, page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.STUDIO(slug, page))
}

// Daftar A-Z: filter huruf dilakukan server-side lewat /az
export async function fetchAnimeList(letter: string, page = 1): Promise<Anime[]> {
  const l = (letter || '').trim()
  if (!l || l.toLowerCase() === 'all') return fetchAllAnime()
  return listOf(ENDPOINTS.AZ(l.toUpperCase(), page))
}

export async function fetchAdvancedSearch(params: Record<string, string>, query?: URLSearchParams): Promise<Anime[]> {
  // `query` mendukung nilai ganda (genre[]=a&genre[]=b); jika tidak ada, pakai params biasa
  const qs = query ? query.toString() : new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  if (!qs) return fetchAllAnime()
  return listOf(`/filter?${qs}`)
}

export async function fetchCharacters(): Promise<AnimeCharacterType[]> {
  return []
}

export async function fetchByCharacter(_slug: string, _page = 1): Promise<Anime[]> {
  return []
}

// Jadwal rilis per hari → { senin: [...], selasa: [...] }
export async function fetchSchedule(): Promise<Record<string, Anime[]>> {
  try {
    const raw = await getJSON(ENDPOINTS.SCHEDULE)
    const d = raw?.data ?? raw
    const out: Record<string, Anime[]> = {}
    const add = (day: string, list: any) => {
      const key = String(day || '').trim().toLowerCase().replace("jum'at", 'jumat')
      if (key) out[key] = extractAnimes({ data: { animeList: list } })
    }
    if (Array.isArray(d)) {
      d.forEach((x: any) => add(x.day || x.hari, x.anime_list || x.animeList || x.anime || x.items || []))
    } else if (Array.isArray(d?.days)) {
      d.days.forEach((x: any) => add(x.day || x.hari, x.anime_list || x.animeList || x.anime || x.items || []))
    } else if (d?.schedule && typeof d.schedule === 'object') {
      Object.entries(d.schedule).forEach(([k, v]) => Array.isArray(v) && add(k, v))
    } else if (d && typeof d === 'object') {
      Object.entries(d).forEach(([k, v]) => Array.isArray(v) && add(k, v))
    }
    return out
  } catch {
    return {}
  }
}

const toText = (v: any): string => {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ')
  if (typeof v === 'object') return String(v.title || v.name || '')
  return String(v)
}

export async function fetchDetail(slug: string, onSynopsis?: (s: string) => void, withMAL = true): Promise<AnimeDetail | null> {
  try {
    const raw = await getJSON(ENDPOINTS.DETAIL(slug))
    const d = raw.data?.detail || raw.data?.anime || raw.data || raw.detail || raw

    const episodes: Episode[] = (d.episodeList || d.episodes || []).map((ep: any) => ({
      title: ep.title || ep.name || (ep.eps != null ? `Episode ${ep.eps}` : ''),
      slug: ep.slug || ep.episodeId || cleanSlug(ep.href || ep.url || ''),
      date: ep.date || ep.uploadDate || '',
    })).filter((e: Episode) => e.slug)

    const genres: string[] = (d.genreList || d.genres || [])
      .map((g: any) => (typeof g === 'object' ? g.title || g.name || '' : g))
      .filter(Boolean)

    const synopsis = Array.isArray(d.synopsis?.paragraphs)
      ? d.synopsis.paragraphs.join('\n\n')
      : typeof d.synopsis === 'string' ? d.synopsis : (d.description || d.sinopsis || '')

    const result: AnimeDetail = {
      title: d.title || '',
      image: d.poster || d.image || d.thumbnail || '',
      description: synopsis,
      info: {
        japanese: d.japanese || '',
        type: d.type || 'TV',
        status: d.status || '',
        total_episode: toText(d.episodes) || episodes.length || '?',
        score: toText(d.score) || 'N/A',
        duration: d.duration || '?',
        season: d.season || '',
        released: d.aired || d.releaseDate || '',
        producer: toText(d.producers),
        studio: toText(d.studios),
        genre: genres.join(', '),
      },
      genres,
      episodes,
      batchSlug: d.batch?.slug || d.batch?.batchId || cleanSlug(d.batch?.href || ''),
    }

    // Sinkronkan sinopsis dari MAL — di background (tidak memblokir halaman)
    if (!withMAL) return result
    const malId = d.mal_id || d.malId || d.malID
    ;(async () => {
      try {
        let malSynopsis = ''
        if (malId) {
          malSynopsis = (await fetchMALDetail(Number(malId)))?.synopsis || ''
        } else if (result.title) {
          const best = (await searchMAL(result.title))[0]
          if (best?.mal_id) {
            malSynopsis = (await fetchMALDetail(best.mal_id))?.synopsis || best.synopsis || ''
          }
        }
        if (malSynopsis) {
          result.description = malSynopsis
          onSynopsis?.(malSynopsis)
        }
      } catch {}
    })()

    return result
  } catch {
    return null
  }
}

// Parser download toleran: cari array berisi {url|link|href} di mana pun, dan pakai
// judul/key terdekat sebagai label resolusi/format (mis. { mkv: { "720p": [...] } }).
function parseDownloads(node: any): DownloadLink[] {
  const out: DownloadLink[] = []
  const urlOf = (x: any) => (x && typeof x === 'object' ? x.url || x.link || x.href || x.download || '' : '')
  const isLink = (x: any) => typeof urlOf(x) === 'string' && !!urlOf(x)
  const labelOf = (x: any) => {
    for (const k of ['title', 'name', 'quality', 'resolution', 'label', 'format']) {
      if (typeof x?.[k] === 'string' && x[k]) return x[k]
    }
    return ''
  }
  const walk = (v: any, labels: string[], depth = 0) => {
    if (v == null || depth > 6) return
    if (Array.isArray(v)) {
      const links = v.filter(isLink).map((l: any) => ({
        host: String(l.host || l.name || l.title || l.provider || l.server || l.label || ''),
        url: String(urlOf(l)),
      }))
      if (links.length) {
        out.push({ resolution: labels[labels.length - 1] || '', format: labels.length > 1 ? labels[labels.length - 2] : '', links })
      }
      v.forEach((x) => { if (x && typeof x === 'object' && !isLink(x)) walk(x, labels, depth + 1) })
    } else if (typeof v === 'object') {
      const own = labelOf(v)
      const fmt = typeof v.format === 'string' && v.format && v.format !== own ? [v.format] : []
      const next = own ? [...labels, ...fmt, own] : labels
      Object.entries(v).forEach(([k, child]) => {
        if (child && typeof child === 'object') {
          const keyLabel = own || /^\d+$/.test(k) || /^(urls?|links?|hosts?|mirrors?|servers?|items?|list|downloads?|qualities|formats|groups?)$/i.test(k) ? [] : [k]
          walk(child, [...next, ...keyLabel], depth + 1)
        }
      })
    }
  }
  walk(node, [])
  return out
}

// Ambil semua field berbau download dari payload (rekursif: respons bisa bersarang
// seperti { data: { episode: {...}, downloads: [...] } })
function collectDownloads(d: any, depth = 0): DownloadLink[] {
  if (!d || typeof d !== 'object' || depth > 3) return []
  const found: DownloadLink[] = []
  if (!Array.isArray(d)) {
    for (const [k, v] of Object.entries(d)) {
      if (/download|unduh|^dl$/i.test(k)) found.push(...parseDownloads(v))
      else if (v && typeof v === 'object' && !Array.isArray(v)) found.push(...collectDownloads(v, depth + 1))
    }
  }
  const seen = new Set<string>()
  return found.filter((g) => {
    const sig = g.links.map((l) => l.url).join('|')
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
}

// Detail episode + link nonton (iframe default, mirrors, sources) + download
export async function fetchEpisode(slug: string): Promise<StreamData | null> {
  try {
    const raw = await getJSON(ENDPOINTS.EPISODE(slug))
    // Bentuk: { data: { episode: {...meta}, sources: [...], downloads: [...], navigation } }
    const root = raw?.data && typeof raw.data === 'object' ? raw.data : raw
    const ep = root.episode && typeof root.episode === 'object' ? root.episode : root
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        if (root[k] != null) return root[k]
        if (ep[k] != null) return ep[k]
      }
      return undefined
    }

    const streams: { server: string; url: string; kind?: string }[] = []
    const addStream = (server: string, url: any, kind?: string) => {
      if (typeof url === 'string' && url && !streams.some((s) => s.url === url)) streams.push({ server, url, kind })
    }
    const addList = (list: any, fallback = 'Server') => {
      if (!Array.isArray(list)) return
      list.forEach((s: any, i: number) => {
        if (typeof s === 'string') return addStream(`${fallback} ${i + 1}`, s)
        addStream(
          String(s.label || s.name || s.server || s.title || `${fallback} ${i + 1}`) + (s.quality ? ` ${s.quality}` : ''),
          s.url || s.embedUrl || s.embed || s.src || s.iframe,
          s.kind || s.type,
        )
      })
    }

    const def = pick('defaultStreamingUrl', 'defaultUrl', 'iframe', 'streamUrl', 'default')
    addStream('Default', typeof def === 'string' ? def : def?.url, 'embed')
    addList(pick('streams'))
    addList(pick('sources'))
    addList(pick('mirrors'))

    // Mirror tambahan lewat /episode/:slug/mirrors
    try {
      const m = await getJSON(ENDPOINTS.MIRRORS(slug))
      const md = m?.data ?? m
      addList(Array.isArray(md) ? md : md?.mirrors || md?.servers || md?.sources || md?.list || [])
    } catch {}

    const downloads = collectDownloads(root).length ? collectDownloads(root) : collectDownloads(raw)

    const nav = pick('navigation', 'nav') || {}
    const slugOf = (v: any) => (typeof v === 'string' ? v : v?.slug || cleanSlug(v?.href || v?.url || ''))
    const animeRef = pick('anime', 'series')

    return {
      title: ep.title || root.title || raw.title || '',
      streams,
      downloads,
      animeSlug: (typeof animeRef === 'object' ? animeRef?.slug : '') || ep.animeSlug || ep.anime_slug || undefined,
      prevSlug: slugOf(nav.prev || nav.previous || nav.prevEpisode) || undefined,
      nextSlug: slugOf(nav.next || nav.nextEpisode) || undefined,
    }
  } catch {
    return null
  }
}

// Download batch: diambil dari detail anime (API animekompi tidak punya /batch/:slug;
// /batch hanya daftar anime yang punya rilis batch)
export async function fetchBatch(slug: string): Promise<DownloadLink[]> {
  try {
    const raw = await getJSON(ENDPOINTS.DETAIL(slug))
    const d = raw.data?.detail || raw.data?.anime || raw.data || raw
    const fromBatch = d.batch && typeof d.batch === 'object' ? parseDownloads(d.batch) : []
    return fromBatch.length ? fromBatch : collectDownloads(d)
  } catch {
    return []
  }
}

// ─── ANIMEKOMPI: FITUR TAMBAHAN ──────────────────────────────

export interface TaxonomyItem {
  name: string
  slug: string
  count?: string
  group?: string
}

export interface FilterList {
  genres: TaxonomyItem[]
  seasons: TaxonomyItem[]
  studios: TaxonomyItem[]
  statuses: TaxonomyItem[]
  types: TaxonomyItem[]
  orders: TaxonomyItem[]
}

export interface AnimeTooltip {
  title: string
  synopsis?: string
  score?: string
  status?: string
  type?: string
  genres?: string[]
  episodes?: string
}

export interface EpisodeComment {
  id: string
  author: string
  avatar?: string
  content: string
  date?: string
  replies?: EpisodeComment[]
}

export interface DanmakuItem {
  text: string
  time?: number
  color?: string
}

export interface PublicSettings {
  siteName?: string
  version?: string
  status?: string
  raw: any
}

// Kategori khusus: live-action, donghua, tokusatsu, upcoming, batch
export type CategoryKey = 'live-action' | 'donghua' | 'tokusatsu' | 'upcoming' | 'batch' | 'movie'

export async function fetchCategory(key: CategoryKey, page = 1): Promise<Anime[]> {
  const map: Record<CategoryKey, (p: number) => string> = {
    'live-action': ENDPOINTS.LIVE_ACTION,
    donghua: ENDPOINTS.DONGHUA,
    tokusatsu: ENDPOINTS.TOKUSATSU,
    upcoming: ENDPOINTS.UPCOMING,
    batch: ENDPOINTS.BATCH_LIST,
    movie: ENDPOINTS.MOVIE,
  }
  return listOf(map[key](page))
}

export async function fetchByStatus(slug: string, page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.STATUS(slug, page))
}

export async function fetchByOrder(slug: string, page = 1): Promise<Anime[]> {
  return listOf(ENDPOINTS.ORDER(slug, page))
}

function extractTaxonomy(raw: any, group?: string): TaxonomyItem[] {
  const d = raw?.data ?? raw
  const out: TaxonomyItem[] = []
  const seen = new Set<string>()
  const add = (v: any, grp?: string) => {
    if (v == null) return
    const isStr = typeof v === 'string'
    const name = isStr ? v : v.title || v.name || v.label || v.genre || v.text || ''
    const slug = isStr
      ? v.toLowerCase().trim().replace(/\s+/g, '-')
      : v.slug || v.id || v.value || v.genreId || cleanSlug(v.href || v.url || '') || String(name).toLowerCase().trim().replace(/\s+/g, '-')
    if (!name || !slug || seen.has(`${grp}|${slug}`)) return
    seen.add(`${grp}|${slug}`)
    const count = v.count ?? v.total ?? v.jumlah
    out.push({ name: String(name), slug: String(slug), count: count != null ? String(count) : undefined, group: grp || group })
  }
  const walk = (v: any, grp?: string) => {
    if (Array.isArray(v)) {
      v.forEach((x) => {
        // Dikelompokkan per tahun/huruf: { year|group|title, items|seasons|studios|list: [...] }
        const nested = x && typeof x === 'object' && (x.items || x.seasons || x.studios || x.list || x.genres)
        if (nested && Array.isArray(nested)) walk(nested, String(x.year || x.group || x.letter || x.title || x.name || grp || ''))
        else add(x, grp)
      })
    } else if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, x]) => (Array.isArray(x) ? walk(x, k) : null))
    }
  }
  walk(Array.isArray(d) ? d : d?.items || d?.list || d?.data || d?.genres || d?.seasons || d?.studios || d?.statuses || d?.status || d?.types || d?.orders || d)
  return out
}

async function taxonomy(path: string): Promise<TaxonomyItem[]> {
  try {
    return extractTaxonomy(await getJSON(path))
  } catch {
    return []
  }
}

export const fetchStudios = () => taxonomy(ENDPOINTS.STUDIOS)
export const fetchStatuses = () => taxonomy(ENDPOINTS.STATUSES)
export const fetchTypes = () => taxonomy(ENDPOINTS.TYPES)
export const fetchOrders = () => taxonomy(ENDPOINTS.ORDERS)

export async function fetchFilterList(): Promise<FilterList> {
  const empty: FilterList = { genres: [], seasons: [], studios: [], statuses: [], types: [], orders: [] }
  try {
    const raw = await getJSON(ENDPOINTS.FILTER_LIST)
    const d = raw?.data ?? raw ?? {}
    const pick = (...keys: string[]) => {
      for (const k of keys) if (d[k] != null) return extractTaxonomy(d[k])
      return []
    }
    return {
      genres: pick('genres', 'genre'),
      seasons: pick('seasons', 'season'),
      studios: pick('studios', 'studio'),
      statuses: pick('statuses', 'status'),
      types: pick('types', 'type'),
      orders: pick('orders', 'order', 'sort'),
    }
  } catch {
    return empty
  }
}

// Metadata detail genre
export async function fetchGenreDetail(slug: string): Promise<{ name: string; description: string } | null> {
  try {
    const raw = await getJSON(ENDPOINTS.GENRE_DETAIL(slug))
    const d = raw?.data?.genre || raw?.data || raw
    const name = d.title || d.name || d.genre || ''
    const description = d.description || d.synopsis || d.desc || d.about || ''
    return name || description ? { name: String(name), description: String(description) } : null
  } catch {
    return null
  }
}

// Saran pencarian (autocomplete): anime & episode
export async function fetchSearchSuggest(keyword: string): Promise<{ title: string; slug: string; image?: string; kind: 'anime' | 'episode' }[]> {
  if (keyword.trim().length < 2) return []
  try {
    const raw = await getJSON(ENDPOINTS.SUGGEST(keyword.trim()))
    const d = raw?.data ?? raw
    const out: { title: string; slug: string; image?: string; kind: 'anime' | 'episode' }[] = []
    const add = (list: any, kind: 'anime' | 'episode') => {
      if (!Array.isArray(list)) return
      list.forEach((i: any) => {
        const title = typeof i === 'string' ? i : i.title || i.name || ''
        const slug = typeof i === 'string' ? '' : i.slug || cleanSlug(i.href || i.url || '')
        if (title && slug) out.push({ title, slug, image: i.poster || i.image || i.thumbnail || '', kind })
      })
    }
    if (Array.isArray(d)) add(d, 'anime')
    else {
      add(d?.anime || d?.animes || d?.series, 'anime')
      add(d?.episodes || d?.episode, 'episode')
      add(d?.results || d?.suggestions || d?.items, 'anime')
    }
    return out.slice(0, 8)
  } catch {
    return []
  }
}

export async function fetchTooltip(slug: string): Promise<AnimeTooltip | null> {
  try {
    const raw = await getJSON(ENDPOINTS.TOOLTIP(slug))
    const d = raw?.data?.tooltip || raw?.data || raw
    if (!d || !(d.title || d.name)) return null
    return {
      title: d.title || d.name,
      synopsis: d.synopsis || d.description || '',
      score: toText(d.score ?? d.rating),
      status: toText(d.status),
      type: toText(d.type),
      episodes: toText(d.episodes ?? d.totalEpisodes),
      genres: (Array.isArray(d.genres) ? d.genres : Array.isArray(d.genreList) ? d.genreList : [])
        .map((g: any) => (typeof g === 'object' ? g.title || g.name || '' : String(g))).filter(Boolean),
    }
  } catch {
    return null
  }
}

function mapComment(c: any, i: number): EpisodeComment {
  return {
    id: String(c.id ?? c.commentId ?? i),
    author: c.author || c.user || c.username || c.name || 'Anonim',
    avatar: c.avatar || c.photo || c.image || '',
    content: String(c.content || c.comment || c.text || c.message || ''),
    date: c.date || c.createdAt || c.time || '',
    replies: Array.isArray(c.replies || c.children) ? (c.replies || c.children).map(mapComment) : [],
  }
}

export async function fetchEpisodeComments(slug: string): Promise<EpisodeComment[]> {
  try {
    const raw = await getJSON(ENDPOINTS.COMMENTS(slug))
    const d = raw?.data ?? raw
    const list = Array.isArray(d) ? d : d?.comments || d?.items || d?.list || d?.threads || []
    return Array.isArray(list) ? list.map(mapComment).filter((c) => c.content) : []
  } catch {
    return []
  }
}

export async function fetchEpisodeReactions(slug: string): Promise<{ label: string; count: number }[]> {
  try {
    const raw = await getJSON(ENDPOINTS.REACTIONS(slug))
    const d = raw?.data?.reactions || raw?.data || raw
    const list = Array.isArray(d) ? d : d?.reactions || d?.items || null
    if (Array.isArray(list)) {
      return list
        .map((r: any) => ({ label: String(r.label || r.name || r.type || r.reaction || r.emoji || ''), count: Number(r.count ?? r.total ?? r.value ?? 0) || 0 }))
        .filter((r) => r.label)
    }
    // Bentuk objek: { suka: 10, tawa: 3 }
    if (d && typeof d === 'object') {
      return Object.entries(d)
        .filter(([, v]) => typeof v === 'number' || /^\d+$/.test(String(v)))
        .map(([k, v]) => ({ label: k, count: Number(v) }))
    }
    return []
  } catch {
    return []
  }
}

export async function fetchEpisodeDanmaku(slug: string): Promise<DanmakuItem[]> {
  try {
    const raw = await getJSON(ENDPOINTS.DANMAKU(slug))
    const d = raw?.data ?? raw
    const list = Array.isArray(d) ? d : d?.danmaku || d?.comments || d?.items || d?.list || []
    return Array.isArray(list)
      ? list
          .map((i: any) => (typeof i === 'string'
            ? { text: i }
            : { text: String(i.text || i.content || i.message || i.comment || ''), time: Number(i.time ?? i.t ?? i.timestamp) || undefined, color: i.color }))
          .filter((i: DanmakuItem) => i.text)
      : []
  } catch {
    return []
  }
}

// Konfigurasi publik & status backend
export async function fetchPublicSettings(): Promise<PublicSettings | null> {
  try {
    const raw = await getJSON(ENDPOINTS.SETTINGS)
    const d = raw?.data ?? raw
    return {
      siteName: d?.siteName || d?.site_name || d?.name || '',
      version: toText(d?.version || d?.backendVersion),
      status: toText(d?.status || d?.backendStatus || d?.backend?.status),
      raw: d,
    }
  } catch {
    return null
  }
}

// ─── JIKAN API FUNCTIONS (MAL Alternative) ───────────────────

export async function fetchMALSeason(year?: number, season?: string): Promise<MALAnime[]> {
  const now = new Date()
  const y = year || now.getFullYear()
  const m = now.getMonth() + 1
  const s = season || (m >= 10 ? 'fall' : m >= 7 ? 'summer' : m >= 4 ? 'spring' : 'winter')

  try {
    const { data } = await jikanClient.get(ENDPOINTS.JIKAN_SEASON(y, s))
    return (data.data || []).slice(0, 25)
  } catch {
    return []
  }
}

export async function fetchMALTop(filter = 'airing'): Promise<MALAnime[]> {
  try {
    const { data } = await jikanClient.get(ENDPOINTS.JIKAN_TOP(filter))
    return (data.data || []).slice(0, 20)
  } catch {
    return []
  }
}

export async function fetchMALDetail(malId: number): Promise<MALAnime | null> {
  try {
    const { data } = await jikanClient.get(ENDPOINTS.JIKAN_DETAIL(malId))
    return data.data || null
  } catch {
    return null
  }
}

export async function searchMAL(query: string): Promise<MALAnime[]> {
  if (!query.trim()) return []
  try {
    const { data } = await jikanClient.get(ENDPOINTS.JIKAN_SEARCH(query))
    return data.data || []
  } catch {
    return []
  }
}

// ─── COMIC / MANGA TYPES ─────────────────────────────────────

export interface Comic {
  title: string
  slug: string
  image: string
  chapter?: string
  genres?: string[]
  score?: string
  type?: string
  status?: string
}

export interface ComicDetail {
  title: string
  image: string
  description: string
  status?: string
  author?: string
  artist?: string
  released?: string
  type?: string
  genres: string[]
  chapters: ComicChapter[]
}

export interface ComicChapter {
  title: string
  slug: string
  date?: string
}

export interface ChapterPages {
  title: string
  pages: string[]
}

export interface ChapterNav {
  prevSlug?: string
  nextSlug?: string
}

export interface ComicGenre {
  name: string
  slug: string
}

// ─── COMIC / MANGA API FUNCTIONS (animasu-api / Komiku.org) ──

const comicClient: AxiosInstance = axios.create({
  baseURL: 'https://www.sankavollerei.web.id',
  timeout: 15000,
  headers: { 'Accept': 'application/json' },
})

function extractComics(raw: any): Comic[] {
  const arr =
    raw?.komikList ||
    raw?.komiklist ||
    raw?.results ||
    raw?.comics ||
    raw?.trending ||
    raw?.data?.komikList ||
    raw?.data?.comics ||
    raw?.data?.results ||
    raw?.data?.trending ||
    raw?.data ||
    (Array.isArray(raw) ? raw : [])
  if (!Array.isArray(arr)) return []
  const chapterOf = (c: any): string =>
    typeof c === 'string' ? c : (c?.title || '')
  return arr.map((item: any) => ({
    title: item.title || item.name || '',
    slug: item.slug || cleanSlug(item.detailUrl || item.link || item.href || item.url || ''),
    image: item.poster || item.image || item.thumbnail || item.cover || '',
    chapter: chapterOf(item.chapter) || chapterOf(item.latestChapter) || chapterOf(item.firstChapter) || '',
    genres: Array.isArray(item.genres || item.genreList)
      ? (item.genres || item.genreList).map((g: any) => (typeof g === 'object' ? g.name || '' : g)).filter(Boolean)
      : (typeof item.genre === 'string' && item.genre ? [item.genre] : []),
    score: item.score || item.rating || item.stats || '',
    type: item.type || 'Manga',
    status: item.status || '',
  }))
}

function extractGenres(raw: any): ComicGenre[] {
  const arr = raw?.genres || raw?.genreList || raw?.data?.genres || raw?.data || (Array.isArray(raw) ? raw : [])
  if (!Array.isArray(arr)) return []
  return arr
    .map((g: any) => (typeof g === 'string' ? { name: g, slug: cleanSlug(g) } : { name: g.name || g.title || '', slug: g.slug || cleanSlug(g.href || g.url || g.name || '') }))
    .filter((g: ComicGenre) => g.name)
}

export async function fetchComicLatest(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_LATEST(page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicPopular(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_POPULAR(page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicTrending(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_TRENDING(page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicAll(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_UNLIMITED(page))
    return extractComics(data)
  } catch { return [] }
}

// Filter by type: 'manga' | 'manhwa' | 'manhua'
export async function fetchComicByType(type: string, page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_TYPE(type, page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicGenres(): Promise<ComicGenre[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_GENRES)
    return extractGenres(data)
  } catch { return [] }
}

export async function fetchComicByGenre(genreSlug: string, page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_GENRE(genreSlug, page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicHomepage(): Promise<{ popular: Comic[]; latest: Comic[]; trending: Comic[] }> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_HOMEPAGE)
    const d = data.data || data
    const home = {
      popular: extractComics(d.popular || d.populer || []),
      latest: extractComics(d.latest || d.terbaru || []),
      trending: extractComics(d.trending || []),
    }
    if (!home.popular.length || !home.latest.length || !home.trending.length) {
      const [popular, latest, trending] = await Promise.all([
        home.popular.length ? Promise.resolve(home.popular) : fetchComicPopular(1),
        home.latest.length ? Promise.resolve(home.latest) : fetchComicLatest(1),
        home.trending.length ? Promise.resolve(home.trending) : fetchComicTrending(1),
      ])
      return { popular, latest, trending }
    }
    return home
  } catch { return { popular: [], latest: [], trending: [] } }
}

export async function fetchComicRandom(): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_RANDOM)
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicRecommendations(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_RECOMMENDATIONS(page))
    return extractComics(data)
  } catch { return [] }
}

// Browse dengan kombinasi filter: type, order (latest/popular/title), genre
export async function fetchComicBrowse(filters: { type?: string; order?: string; genre?: string; page?: number }): Promise<Comic[]> {
  try {
    const params: Record<string, string> = {}
    if (filters.type) params.type = filters.type
    if (filters.order) params.order = filters.order
    if (filters.genre) params.genre = filters.genre
    if (filters.page) params.page = String(filters.page)
    const { data } = await comicClient.get(ENDPOINTS.COMIC_BROWSE(params))
    return extractComics(data)
  } catch { return [] }
}

// Simulasi infinite scroll dengan offset pagination
export async function fetchComicScroll(offset = 0): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_SCROLL(offset))
    return extractComics(data)
  } catch { return [] }
}

// Infinite scroll dengan pagination (default type latest)
export async function fetchComicInfinite(page = 1, type = 'latest'): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_INFINITE(page, type))
    return extractComics(data)
  } catch { return [] }
}

// Pencarian dengan multiple filter (q wajib, plus type/status/genre/year/sort)
export async function fetchComicAdvancedSearch(params: { q: string; type?: string; status?: string; genre?: string; year?: string; sort?: string; page?: number }): Promise<Comic[]> {
  if (!params.q?.trim()) return []
  try {
    const query: Record<string, string> = { q: params.q }
    if (params.type) query.type = params.type
    if (params.status) query.status = params.status
    if (params.genre) query.genre = params.genre
    if (params.year) query.year = params.year
    if (params.sort) query.sort = params.sort
    if (params.page) query.page = String(params.page)
    const { data } = await comicClient.get(ENDPOINTS.COMIC_ADVANCED_SEARCH(query))
    return extractComics(data)
  } catch { return [] }
}

// Daftar komik berwarna
export async function fetchComicColored(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_COLORED(page))
    return extractComics(data)
  } catch { return [] }
}

// Perpustakaan komik
export async function fetchComicLibrary(page = 1): Promise<Comic[]> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_LIBRARY(page))
    return extractComics(data)
  } catch { return [] }
}

export async function searchComic(keyword: string, page = 1): Promise<Comic[]> {
  if (!keyword.trim()) return []
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_SEARCH(keyword, page))
    return extractComics(data)
  } catch { return [] }
}

export async function fetchComicDetail(slug: string): Promise<ComicDetail | null> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_DETAIL(slug))
    const d = data.detail || data.data || data
    const chapters = (d.chapters || d.chapterList || []).map((ch: any, idx: number) => {
      const rawTitle =
        ch.title || ch.name || ch.chapter || ch.chapter_title || ch.chapterTitle ||
        ch.judul || ch.label || ch.text ||
        (ch.number ?? ch.chapterNumber ?? ch.chapter_number ?? ch.nomor ?? ch.no)
      return {
        title: rawTitle ? String(rawTitle) : `Chapter ${(d.chapters || d.chapterList).length - idx}`,
        slug: ch.slug || cleanSlug(ch.href || ch.url || ''),
        date: ch.date || ch.updatedAt || ch.releaseDate || ch.uploaded || '',
      }
    })
    return {
      title: d.title || '',
      image: d.poster || d.image || d.thumbnail || d.cover || '',
      description: d.synopsis || d.description || '',
      status: d.status || '',
      author: d.author || '',
      artist: d.artist || '',
      released: d.released || d.year || '',
      type: d.type || 'Manga',
      genres: (d.genres || d.genreList || []).map((g: any) => typeof g === 'object' ? g.name || '' : g).filter(Boolean),
      chapters,
    }
  } catch { return null }
}

export async function fetchChapterPages(chapterSlug: string): Promise<ChapterPages | null> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_CHAPTER(chapterSlug))
    const d = data.data || data
    const rawPages = d.images || d.pages || d.imagesUrl || (Array.isArray(d) ? d : [])
    const pages: string[] = (Array.isArray(rawPages) ? rawPages : [])
      .map((p: any) => (typeof p === 'string' ? p : p?.url || p?.src || p?.image || ''))
      .filter(Boolean)
    return {
      title: d.title || d.chapter || '',
      pages,
    }
  } catch { return null }
}

export async function fetchChapterNavigation(chapterSlug: string): Promise<ChapterNav | null> {
  try {
    const { data } = await comicClient.get(ENDPOINTS.COMIC_CHAPTER_NAV(chapterSlug))
    const d = data.data || data
    return {
      prevSlug: d.prev || d.prevChapter || d.previous || d.prevSlug || '',
      nextSlug: d.next || d.nextChapter || d.nextSlug || '',
    }
  } catch { return null }
}

// ─── NOVEL TYPES ─────────────────────────────────────────────

export interface Novel {
  novelId: string
  title: string
  slug: string
  image: string
  type?: string
  latestChapter?: string
  rating?: string
  status?: string
  summary?: string
  genres?: string[]
  tags?: string[]
  totalViews?: string
  totalWords?: string
  language?: string
  novelStatus?: number
}

export interface NovelGenreTag {
  id: string
  name: string
  slug?: string
  count?: string
  cover?: string
}

export interface NovelSection {
  title: string
  novels: Novel[]
}

export interface NovelHomeData {
  sections: NovelSection[]
  genres: NovelGenreTag[]
}

export interface NovelChapterItem {
  chapterId: string
  title: string
  slug: string
  date?: string
}

export interface NovelChaptersData {
  novel: Novel
  chapters: NovelChapterItem[]
}

// ─── NOVEL API FUNCTIONS ──────────────────────────────────────
// REST API novel Sankavollerei (novelId based, konten NovelHub).

const novelClient: AxiosInstance = axios.create({
  baseURL: 'https://www.sankavollerei.web.id',
  timeout: 15000,
  headers: { 'Accept': 'application/json' },
  // novelId di API ini angkanya > Number.MAX_SAFE_INTEGER (19 digit), kalau di-parse
  // pakai JSON.parse biasa presisinya kepotong. Regex ini nge-ubah nilai numeriknya jadi
  // string biar aman, dan cuma nyentuh key "novelId".
  transformResponse: [(data: any) => {
    if (typeof data !== 'string') return data
    const safe = data.replace(/"novelId":\s*(\d+)/g, '"novelId":"$1"')
    try { return JSON.parse(safe) } catch { return data }
  }],
})

function mapNovel(item: any): Novel {
  const novelId = String(item.novelId ?? '')
  return {
    novelId,
    title: item.title || '',
    slug: novelId,
    image: item.cover?.url || item.thumbnail || item.poster || '',
    type: item.novelStatusDesc || item.type || 'Novel',
    latestChapter: item.totalChapters ? `${item.totalChapters} Chapters` : '',
    rating: item.score || item.rating || '',
    status: item.novelStatusDesc || item.status || '',
    summary: item.summary || item.synopsis || item.description || '',
    genres: Array.isArray(item.genres) ? item.genres.map((g: any) => String(g)) : [],
    tags: Array.isArray(item.tags) ? item.tags.map((g: any) => String(g)) : [],
    totalViews: item.totalViews || '',
    totalWords: item.totalWordsFormat || (item.totalWords ? String(item.totalWords) : ''),
    language: item.language || '',
    novelStatus: item.novelStatus,
  }
}

export async function fetchNovelHome(): Promise<NovelHomeData> {
  try {
    const { data } = await novelClient.get(ENDPOINTS.NOVEL_HOME)
    const items = data?.result?.items
    const sections: NovelSection[] = []
    const genres: NovelGenreTag[] = []
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item?.type === 'GenreList') {
          for (const g of (item.genres || [])) {
            const id = String(g.genreId ?? '')
            if (id) genres.push({ id, name: g.name || '', slug: id, cover: g.cover?.url || '' })
          }
        } else if (Array.isArray(item?.contents)) {
          sections.push({ title: item.title || '', novels: item.contents.map(mapNovel) })
        }
      }
    }
    return { sections, genres }
  } catch { return { sections: [], genres: [] } }
}

export async function fetchNovelHotSearch(): Promise<Novel[]> {
  try {
    const { data } = await novelClient.get(ENDPOINTS.NOVEL_HOT_SEARCH)
    const items = data?.result?.items
    return Array.isArray(items) ? items.map(mapNovel) : []
  } catch { return [] }
}

export async function searchNovel(keyword: string): Promise<Novel[]> {
  if (!keyword.trim()) return []
  try {
    const { data } = await novelClient.get(ENDPOINTS.NOVEL_SEARCH(keyword.trim()))
    const items = data?.result?.items
    return Array.isArray(items) ? items.map(mapNovel) : []
  } catch { return [] }
}

export async function fetchNovelByGenre(genreId: string): Promise<{ genres: NovelGenreTag[]; novels: Novel[] }> {
  try {
    const { data } = await novelClient.get(ENDPOINTS.NOVEL_GENRE(genreId))
    const result = data?.result
    const genres: NovelGenreTag[] = Array.isArray(result?.genres)
      ? result.genres.map((g: any): NovelGenreTag => {
          const id = String(g.genreId ?? '')
          return { id, name: g.name || '', slug: id }
        })
      : []
    const novels: Novel[] = Array.isArray(result?.items) ? result.items.map(mapNovel) : []
    return { genres, novels }
  } catch { return { genres: [], novels: [] } }
}

export async function fetchNovelChapters(novelId: string): Promise<NovelChaptersData | null> {
  try {
    const { data } = await novelClient.get(ENDPOINTS.NOVEL_CHAPTERS(novelId))
    if (data?.success !== true || !data?.result) return null
    const result = data.result
    const detail = result.novel || result.detail || result.data || result
    const chaptersRaw = result.chapters || result.chapterList || result.list || []
    if (!Array.isArray(chaptersRaw)) return null
    const chapters: NovelChapterItem[] = chaptersRaw.map((c: any, idx: number) => {
      const rawTitle = c.title || c.name || c.chapterName || c.chapter_title || c.chapterTitle
      return {
        chapterId: String(c.chapterId ?? c.id ?? idx),
        title: rawTitle ? String(rawTitle) : `Chapter ${idx + 1}`,
        slug: String(c.chapterId ?? c.id ?? idx),
        date: c.date || c.updatedAt || c.releaseDate || '',
      }
    })
    return { novel: mapNovel(detail), chapters }
  } catch { return null }
}

export async function fetchNovelByTitle(title: string): Promise<Novel | null> {
  const key = title.trim().toLowerCase()
  if (!key) return null
  const results = await searchNovel(title)
  return results.find((n) => n.title.trim().toLowerCase() === key) || results[0] || null
}

export async function fetchNovelGenresMap(): Promise<NovelGenreTag[]> {
  const { genres } = await fetchNovelByGenre('1001')
  if (genres.length > 0) return genres
  return (await fetchNovelHome()).genres
}

// ─── HELPERS ─────────────────────────────────────────────────

function extractAnimes(raw: any): Anime[] {
  const d = raw?.data ?? raw
  let arr: any =
    (Array.isArray(d) ? d : null) ||
    d?.animeList || d?.anime_list || d?.animes || d?.anime || d?.items || d?.results || d?.list || d?.data ||
    raw?.animeList || raw?.animes || raw?.items || raw?.results || []

  if (!Array.isArray(arr)) return []
  // /unlimited: [{ startWith, animeList: [...] }] → ratakan
  if (arr.length && arr[0] && Array.isArray(arr[0].animeList)) {
    arr = arr.flatMap((g: any) => g.animeList || [])
  }

  const toStr = (v: any) => (v == null ? '' : String(v))
  return arr.map((item: any) => ({
    title: item.title || item.judul || '',
    slug: animeSlugOf(item) || cleanSlug(item.href || item.url || item.link || ''),
    image: item.poster || item.thumbnail || item.image || item.cover || item.img || item.imageUrl || '',
    score: toStr(item.score || item.rating),
    episode: toStr(item.episodes ?? item.episode ?? item.latestEpisode),
    type: item.type || item.tipe || '',
    status: item.status || item.status_or_day || item.statusOrDay || '',
    genres: (Array.isArray(item.genreList) ? item.genreList : Array.isArray(item.genres) ? item.genres : Array.isArray(item.genre) ? item.genre : [])
      .map((g: any) => (g && typeof g === 'object' ? g.title || g.name || '' : String(g ?? '')))
      .filter(Boolean),
    release: item.releaseDay || item.release_day || item.latestReleaseDate || item.lastReleaseDate || item.release || '',
  })).filter((a: Anime) => a.slug)
}

// Daftar "terbaru" berisi item EPISODE (slug: "judul-episode-5-subtitle-indonesia"),
// padahal halaman /detail/:slug butuh slug anime. Pakai field slug anime jika ada,
// kalau tidak, buang akhiran "-episode-N..." dari slug episode.
const EPISODE_SUFFIX = /-(?:episode|eps?)-\d+(?:[-\w]*)?$/i

export function animeSlugOf(item: any): string {
  const explicit =
    item.animeSlug || item.anime_slug || item.seriesSlug || item.series_slug ||
    item.anime?.slug || item.series?.slug || ''
  if (explicit) return String(explicit)
  const raw = String(item.slug || item.animeId || cleanSlug(item.href || item.url || item.link || ''))
  return raw.replace(EPISODE_SUFFIX, '') || raw
}

function cleanSlug(raw = ''): string {
  return String(raw)
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop() || String(raw)
}

// ─── FIRESTORE REST API (Base64 Trick for Free Tier) ─────────

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE.projectId}/databases/(default)/documents`

// Encode URL to Firestore document key (base64 trick)
export function urlToKey(url: string): string {
  return encodeURIComponent(url).replace(/\./g, '%2E')
}

// Firestore REST helpers
export async function fsGet(collection: string, id: string): Promise<any> {
  if (!CONFIG.FIREBASE.projectId) return null
  try {
    const { data } = await axios.get(`${FIRESTORE_BASE}/${collection}/${id}?key=${CONFIG.FIREBASE.apiKey}`)
    return fromFirestoreDoc(data)
  } catch {
    return null
  }
}

export async function fsSet(collection: string, id: string, docData: any): Promise<boolean> {
  if (!CONFIG.FIREBASE.projectId) return false
  try {
    await axios.patch(
      `${FIRESTORE_BASE}/${collection}/${id}?key=${CONFIG.FIREBASE.apiKey}`,
      { fields: toFirestoreFields(docData) }
    )
    return true
  } catch {
    return false
  }
}

export async function fsDelete(collection: string, id: string): Promise<boolean> {
  if (!CONFIG.FIREBASE.projectId) return false
  try {
    await axios.delete(`${FIRESTORE_BASE}/${collection}/${id}?key=${CONFIG.FIREBASE.apiKey}`)
    return true
  } catch {
    return false
  }
}

// Firestore value converters
function toFirestoreFields(data: any): any {
  const fields: any = {}
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v)
  }
  return { fields }
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (Number.isInteger(val)) return { integerValue: String(val) }
  if (typeof val === 'number') return { doubleValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } }
  if (typeof val === 'object') {
    const fields: any = {}
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v)
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

function fromFirestoreDoc(doc: any): any {
  const name = doc.name || ''
  const id = name.split('/').pop()
  const fields = doc.fields || {}
  const result: any = { id }
  for (const [key, fval] of Object.entries(fields)) {
    result[key] = fromFirestoreValue(fval)
  }
  return result
}

function fromFirestoreValue(fval: any): any {
  if ('stringValue' in fval) return fval.stringValue
  if ('integerValue' in fval) return parseInt(fval.integerValue, 10)
  if ('doubleValue' in fval) return fval.doubleValue
  if ('booleanValue' in fval) return fval.booleanValue
  if ('nullValue' in fval) return null
  if ('timestampValue' in fval) return fval.timestampValue
  if ('arrayValue' in fval) return (fval.arrayValue.values || []).map(fromFirestoreValue)
  if ('mapValue' in fval) {
    const obj: any = {}
    for (const [k, v] of Object.entries(fval.mapValue.fields || {})) obj[k] = fromFirestoreValue(v)
    return obj
  }
  return null
}
