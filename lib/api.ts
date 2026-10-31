import axios, { AxiosInstance } from 'axios'
import { CONFIG, ENDPOINTS } from './config'

// ─── API CLIENTS ─────────────────────────────────────────────

// Anime API Client (Sankavollerei — Kusonime)
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
  streams: { server: string; url: string }[]
  downloads: DownloadLink[]
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
// Sumber: sankavollerei.web.id/anime  (home, ongoing-anime, complete-anime,
// genre, schedule, anime/:slug, episode/:slug, server/:id, batch/:slug, search/:kw, unlimited)

async function getJSON(path: string): Promise<any> {
  const { data } = await animeClient.get(path)
  return data
}

export async function fetchHome(_page = 1): Promise<Anime[]> {
  try {
    const d = (await getJSON(ENDPOINTS.HOME)).data || {}
    return [
      ...extractAnimes({ data: d.ongoing }),
      ...extractAnimes({ data: d.completed }),
    ]
  } catch {
    return []
  }
}

// Anime ongoing (sedang tayang)
export async function fetchLatest(page = 1): Promise<Anime[]> {
  try {
    return extractAnimes(await getJSON(ENDPOINTS.ONGOING(page)))
  } catch {
    return []
  }
}

export async function fetchOngoing(page = 1): Promise<Anime[]> {
  return fetchLatest(page)
}

export async function fetchCompleted(page = 1): Promise<Anime[]> {
  try {
    return extractAnimes(await getJSON(ENDPOINTS.COMPLETE(page)))
  } catch {
    return []
  }
}

// Tidak ada endpoint popular — pakai anime tamat, urut skor tertinggi
export async function fetchPopular(page = 1): Promise<Anime[]> {
  const list = await fetchCompleted(page)
  return [...list].sort((a, b) => (parseFloat(b.score || '0') || 0) - (parseFloat(a.score || '0') || 0))
}

// Tidak ada endpoint movie khusus — cari kata kunci "movie"
export async function fetchMovies(page = 1): Promise<Anime[]> {
  return page > 1 ? [] : searchAnime('movie')
}

// Semua anime A-Z
export async function fetchAllAnime(_page = 1): Promise<Anime[]> {
  try {
    return extractAnimes(await getJSON(ENDPOINTS.ALL_ANIME))
  } catch {
    return []
  }
}

export async function fetchByType(_type: string, _page = 1): Promise<Anime[]> {
  return []
}

export async function searchAnime(keyword: string, _page = 1): Promise<Anime[]> {
  if (!keyword.trim()) return []
  try {
    return extractAnimes(await getJSON(ENDPOINTS.SEARCH(keyword)))
  } catch {
    return []
  }
}

export async function fetchGenres(): Promise<{ name: string; slug: string }[]> {
  try {
    const data = await getJSON(ENDPOINTS.GENRES)
    const list = data?.data?.genreList || data?.data?.genres || data?.genreList || data?.data || []
    if (!Array.isArray(list)) return []
    return list
      .map((g: any) => ({
        name: g.title || g.name || g.genre || '',
        slug: g.genreId || g.slug || cleanSlug(g.href || '') || String(g.title || '').toLowerCase().replace(/\s+/g, '-'),
      }))
      .filter((g: any) => g.name)
  } catch {
    return []
  }
}


// Musim tidak tersedia di API ini
export async function fetchSeasons(): Promise<AnimeSeason[]> {
  return []
}

export async function fetchBySeason(_season: string, _year: string | number): Promise<Anime[]> {
  return []
}

export async function fetchByGenre(slug: string, page = 1): Promise<Anime[]> {
  try {
    return extractAnimes(await getJSON(ENDPOINTS.GENRE(slug, page)))
  } catch {
    return []
  }
}

// Daftar A-Z: filter huruf di sisi klien dari /unlimited
export async function fetchAnimeList(letter: string, _page = 1): Promise<Anime[]> {
  const all = await fetchAllAnime()
  const l = (letter || '').trim().toLowerCase()
  if (!l || l === 'all') return all
  return all.filter((a) => (a.title || '').trim().toLowerCase().startsWith(l === '#' ? '' : l))
}

export async function fetchAdvancedSearch(params: Record<string, string>): Promise<Anime[]> {
  const keyword = params.q || params.keyword || params.search || ''
  if (keyword) return searchAnime(keyword)
  return fetchAllAnime()
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
      d.forEach((x: any) => add(x.day || x.hari, x.anime_list || x.animeList || x.anime || []))
    } else if (Array.isArray(d?.days)) {
      d.days.forEach((x: any) => add(x.day || x.hari, x.anime_list || x.animeList || x.anime || []))
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

export async function fetchDetail(slug: string, onSynopsis?: (s: string) => void): Promise<AnimeDetail | null> {
  try {
    const raw = await getJSON(ENDPOINTS.DETAIL(slug))
    const d = raw.data?.detail || raw.data || raw.detail || raw

    const episodes: Episode[] = (d.episodeList || d.episodes || []).map((ep: any) => ({
      title: ep.title || ep.name || (ep.eps != null ? `Episode ${ep.eps}` : ''),
      slug: ep.episodeId || ep.slug || cleanSlug(ep.href || ep.url || ''),
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
      batchSlug: d.batch?.batchId || d.batch?.slug || cleanSlug(d.batch?.href || ''),
    }

    // Sinkronkan sinopsis dari MAL — di background (tidak memblokir halaman)
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

// Detail episode + link nonton (server di-resolve lewat /server/:serverId)
export async function fetchEpisode(slug: string): Promise<StreamData | null> {
  try {
    const raw = await getJSON(ENDPOINTS.EPISODE(slug))
    const d = raw.data || raw

    const streams: { server: string; url: string }[] = []
    if (d.defaultStreamingUrl) streams.push({ server: 'Default', url: d.defaultStreamingUrl })

    const serverRefs: { label: string; id: string }[] = []
    const qualities = d.server?.qualities || []
    qualities.forEach((q: any) =>
      (q.serverList || []).forEach((s: any) => {
        if (s.serverId) serverRefs.push({ label: `${s.title || 'Server'} ${q.title || ''}`.trim(), id: s.serverId })
      })
    )
    // Server lama (format flat)
    ;(Array.isArray(d.streams) ? d.streams : []).forEach((s: any) => {
      const url = s.url || s.embedUrl || s.src
      if (url) streams.push({ server: s.name || s.server || s.title || 'Server', url })
    })

    const resolved = await Promise.allSettled(
      serverRefs.slice(0, 10).map(async (r) => {
        const res = await getJSON(ENDPOINTS.SERVER(r.id))
        const url = res?.data?.url || res?.url || ''
        return url ? { server: r.label, url } : null
      })
    )
    resolved.forEach((r) => {
      if (r.status === 'fulfilled' && r.value && !streams.some((s) => s.url === r.value!.url)) streams.push(r.value)
    })

    const downloads: DownloadLink[] = []
    const dl = d.downloadUrl || d.downloads || d.download
    const groups = Array.isArray(dl) ? dl : (dl?.qualities || [])
    groups.forEach((g: any) => {
      const links = (g.urls || g.links || g.hosts || []).map((l: any) => ({
        host: l.title || l.name || l.host || '',
        url: l.url || '',
      })).filter((l: any) => l.url)
      if (links.length) downloads.push({ resolution: g.title || g.resolution || g.quality || '', format: g.format || '', links })
    })

    return { title: d.title || raw.title || '', streams, downloads }
  } catch {
    return null
  }
}

// Download batch: /batch/:slug
export async function fetchBatch(slug: string): Promise<DownloadLink[]> {
  try {
    const d = (await getJSON(ENDPOINTS.BATCH(slug))).data || {}
    const groups = d.downloadUrl?.formats || d.downloadUrl?.qualities || d.downloads || []
    const out: DownloadLink[] = []
    groups.forEach((f: any) => {
      const fmt = f.title || f.format || ''
      ;(f.qualities || [f]).forEach((q: any) => {
        const links = (q.urls || q.links || []).map((l: any) => ({ host: l.title || '', url: l.url || '' })).filter((l: any) => l.url)
        if (links.length) out.push({ resolution: q.title || '', format: fmt, links })
      })
    })
    return out
  } catch {
    return []
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
    d?.animeList || d?.anime_list || d?.animes || d?.results || d?.list || d?.data ||
    raw?.animeList || raw?.animes || raw?.results || []

  if (!Array.isArray(arr)) return []
  // /unlimited: [{ startWith, animeList: [...] }] → ratakan
  if (arr.length && arr[0] && Array.isArray(arr[0].animeList)) {
    arr = arr.flatMap((g: any) => g.animeList || [])
  }

  const toStr = (v: any) => (v == null ? '' : String(v))
  return arr.map((item: any) => ({
    title: item.title || item.judul || '',
    slug: item.animeId || item.slug || cleanSlug(item.href || item.url || item.link || ''),
    image: item.poster || item.thumbnail || item.image || item.cover || '',
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
