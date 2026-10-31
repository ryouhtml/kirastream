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

// Update terbaru — endpoint utama kusonime
export async function fetchHome(page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.HOME(page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

export async function fetchLatest(page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.LATEST(page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

// Kusonime tidak punya endpoint popular — fallback ke all-anime
export async function fetchPopular(page = 1): Promise<Anime[]> {
  return fetchAllAnime(page)
}

export async function fetchMovies(page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.MOVIES(page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

// Kusonime tidak punya endpoint ongoing — fallback ke latest
export async function fetchOngoing(page = 1): Promise<Anime[]> {
  return fetchLatest(page)
}

// Kusonime tidak punya endpoint completed — return empty
export async function fetchCompleted(_page = 1): Promise<Anime[]> {
  return []
}

// Semua anime A-Z (menggantikan animalist & popular di animasu)
export async function fetchAllAnime(page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.ALL_ANIME(page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

// Anime berdasarkan tipe: 'ona' | 'ova' | 'special'
export async function fetchByType(type: string, page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.TYPE(type, page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

export async function searchAnime(keyword: string, page = 1): Promise<Anime[]> {
  if (!keyword.trim()) return []
  try {
    const { data } = await animeClient.get(ENDPOINTS.SEARCH(keyword, page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

export async function fetchGenres(): Promise<{ name: string; slug: string }[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.GENRES)
    const list = Array.isArray(data) ? data : (data.data || data.genres || [])
    return list.map((g: any) => ({
      name: g.name || g.genre || g.title || g.slug || '',
      slug: g.slug || (g.name || '').toLowerCase().replace(/\s+/g, '-'),
    })).filter((g: any) => g.name)
  } catch {
    return []
  }
}

// Daftar musim/tahun rilis dari kusonime
export async function fetchSeasons(): Promise<AnimeSeason[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.ALL_SEASONS)
    const list = Array.isArray(data) ? data : (data.data || data.seasons || [])
    return list.map((s: any) => ({
      name: s.name || s.title || s.season || String(s),
      slug: s.slug || (s.name || String(s)).toLowerCase().replace(/\s+/g, '-'),
    })).filter((s: any) => s.name)
  } catch {
    return []
  }
}

export async function fetchByGenre(slug: string, page = 1): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.GENRE(slug, page))
    return extractAnimes(data)
  } catch {
    return []
  }
}

// Anime berdasarkan musim: season ('fall'|'winter'|'spring'|'summer') + year
export async function fetchBySeason(season: string, year: string | number): Promise<Anime[]> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.SEASON(season, year))
    return extractAnimes(data)
  } catch {
    return []
  }
}

// fetchAnimeList — di kusonime tidak ada filter by letter, pakai all-anime saja
export async function fetchAnimeList(_letter: string, page = 1): Promise<Anime[]> {
  return fetchAllAnime(page)
}

// Advanced search tidak tersedia di kusonime — fallback ke search biasa
export async function fetchAdvancedSearch(params: Record<string, string>): Promise<Anime[]> {
  const keyword = params.q || params.keyword || params.search || ''
  if (keyword) return searchAnime(keyword, Number(params.page) || 1)
  return fetchAllAnime(Number(params.page) || 1)
}

// Kusonime tidak punya endpoint characters
export async function fetchCharacters(): Promise<AnimeCharacterType[]> {
  return []
}

export async function fetchByCharacter(_slug: string, _page = 1): Promise<Anime[]> {
  return []
}

// Kusonime tidak punya endpoint schedule
export async function fetchSchedule(): Promise<Record<string, Anime[]>> {
  return {}
}

export async function fetchDetail(slug: string): Promise<AnimeDetail | null> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.DETAIL(slug))
    const d = data.detail || data.data || data

    const episodes = (d.episodes || d.episodeList || []).map((ep: any) => ({
      title: ep.name || ep.title || ep.episode || '',
      slug: ep.slug || cleanSlug(ep.href || ep.url || ep.link || ''),
      date: ep.date || ep.uploadDate || '',
    }))

    const genres = (d.genres || d.genreList || []).map((g: any) =>
      typeof g === 'object' ? (g.name || g.title || '') : g
    ).filter(Boolean)

    const result: AnimeDetail = {
      title: d.title || '',
      image: d.poster || d.thumbnail || d.image || d.cover || '',
      description: d.synopsis || d.description || d.sinopsis || '',
      info: {
        japanese: d.japanese || d.synonym || d.alternativeTitle || '',
        type: d.type || 'TV',
        status: d.status || 'Ongoing',
        total_episode: d.totalEpisode || d.total_episode || episodes.length || '?',
        score: d.score || d.rating || 'N/A',
        duration: d.duration || d.durasi || '?',
        season: d.season || '',
        released: d.aired || d.releaseDate || d.release || d.year || '',
        producer: d.producer || d.author || d.studio || '',
        studio: d.studio || d.producer || '',
        genre: genres.join(', '),
      },
      genres,
      episodes,
      batchSlug: d.batch?.slug || cleanSlug(d.batch?.href || d.batch?.url || ''),
    }

    // Sinkronkan sinopsis dari MAL
    try {
      const malId = d.mal_id || d.malId || d.malID
      let malSynopsis = ''
      if (malId) {
        const mal = await fetchMALDetail(Number(malId))
        malSynopsis = mal?.synopsis || ''
      } else if (result.title) {
        const hits = await searchMAL(result.title)
        const best = hits[0]
        if (best?.mal_id) {
          const mal = await fetchMALDetail(best.mal_id)
          malSynopsis = mal?.synopsis || best.synopsis || ''
        }
      }
      if (malSynopsis) result.description = malSynopsis
    } catch {
      // tetap pakai sinopsis bawaan kalau MAL gagal
    }

    return result
  } catch {
    return null
  }
}

export async function fetchEpisode(slug: string): Promise<StreamData | null> {
  try {
    const { data } = await animeClient.get(ENDPOINTS.EPISODE(slug))
    const d = data.data || data

    const streams = (d.streams || d.server || d.servers || []).map((s: any) => ({
      server: s.name || s.server || s.title || 'Server',
      url: s.url || s.embedUrl || s.src || '',
    })).filter((s: any) => s.url)

    const downloads: DownloadLink[] = []
    const dlRaw = d.downloadUrl || d.downloads || d.download || []

    if (Array.isArray(dlRaw)) {
      dlRaw.forEach((group: any) => {
        (group.qualities || group.links || []).forEach((q: any) => {
          downloads.push({
            resolution: q.title || q.resolution || q.quality || '',
            format: group.title || group.format || '',
            links: (q.urls || q.hosts || []).map((l: any) => ({
              host: l.title || l.name || l.host || '',
              url: l.url || '',
            })),
          })
        })
      })
    }

    return {
      title: d.title || data.title || '',
      streams,
      downloads,
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
  // Kusonime mungkin return: { data: [...] } atau { animeList: [...] } atau langsung array
  const arr =
    raw?.animeList ||
    raw?.animes ||
    raw?.anime_list ||
    raw?.results ||
    raw?.data?.animeList ||
    raw?.data?.animes ||
    raw?.data?.results ||
    raw?.data ||
    (Array.isArray(raw) ? raw : [])

  if (!Array.isArray(arr)) return []

  return arr.map((item: any) => ({
    title: item.title || item.judul || '',
    slug: item.slug || cleanSlug(item.href || item.url || item.link || ''),
    image: item.poster || item.thumbnail || item.image || item.cover || '',
    score: item.score || item.rating || '',
    episode: item.episode != null ? String(item.episode) : (item.latestEpisode != null ? String(item.latestEpisode) : ''),
    type: item.type || item.tipe || '',
    status: item.status || item.status_or_day || item.statusOrDay || '',
    genres: Array.isArray(item.genres) ? item.genres : (Array.isArray(item.genre) ? item.genre : []),
    release: item.release_day || item.releaseDay || item.release || '',
  }))
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
