// ─── KIRA API CONFIG ─────────────────────────────────────────
// Sumber: sankavollerei.web.id/anime/kusonime

export const CONFIG = {
  // Anime API (Sankavollerei — Kusonime)
  ANIME_API: 'https://www.sankavollerei.web.id/anime',

  // MAL API (MyAnimeList)
  MAL_API: 'https://api.myanimelist.net/v2',
  MAL_CLIENT_ID: process.env.NEXT_PUBLIC_MAL_CLIENT_ID || '',

  // Jikan API (Alternative MAL)
  JIKAN_API: 'https://api.jikan.moe/v4',

  // Firebase Config
  FIREBASE: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  },
} as const

// API Endpoints — sankavollerei.web.id/anime
export const ENDPOINTS = {
  HOME:      '/home',
  SCHEDULE:  '/schedule',
  ONGOING:   (page = 1) => `/ongoing-anime?page=${page}`,
  COMPLETE:  (page = 1) => `/complete-anime?page=${page}`,
  ALL_ANIME: '/unlimited',
  GENRES:    '/genre',
  GENRE:     (slug: string, page = 1) => `/genre/${encodeURIComponent(slug)}?page=${page}`,
  SEARCH:    (keyword: string) => `/search/${encodeURIComponent(keyword)}`,
  DETAIL:    (slug: string) => `/anime/${encodeURIComponent(slug)}`,
  EPISODE:   (slug: string) => `/episode/${encodeURIComponent(slug)}`,
  SERVER:    (id: string) => `/server/${encodeURIComponent(id)}`,
  BATCH:     (slug: string) => `/batch/${encodeURIComponent(slug)}`,

  // ── Jikan (MAL Alternative — Free, No Auth) ────────────────
  JIKAN_SEASON: (year: number, season: string) => `/seasons/${year}/${season}`,
  JIKAN_TOP:    (filter = 'airing') => `/top/anime?filter=${filter}`,
  JIKAN_SEARCH: (query: string) => `/anime?q=${encodeURIComponent(query)}&limit=10`,
  JIKAN_DETAIL: (malId: number) => `/anime/${malId}/full`,

  // ── Comic / Manga (Komiku.org) ─────────────────────────────
  COMIC_LATEST:           (page = 1) => `/comic/terbaru?page=${page}`,
  COMIC_POPULAR:          (page = 1) => `/comic/populer?page=${page}`,
  COMIC_TRENDING:         (page = 1) => `/comic/trending?page=${page}`,
  COMIC_SEARCH:           (q: string, page = 1) => `/comic/search?q=${encodeURIComponent(q)}&page=${page}`,
  COMIC_DETAIL:           (slug: string) => `/comic/comic/${encodeURIComponent(slug)}`,
  COMIC_CHAPTER:          (slug: string) => `/comic/chapter/${encodeURIComponent(slug)}`,
  COMIC_CHAPTER_NAV:      (slug: string) => `/comic/chapter/${encodeURIComponent(slug)}/navigation`,
  COMIC_GENRES:           '/comic/genres',
  COMIC_GENRE:            (slug: string, page = 1) => `/comic/genre/${encodeURIComponent(slug)}?page=${page}`,
  COMIC_TYPE:             (type: string, page = 1) => `/comic/type/${encodeURIComponent(type)}?page=${page}`,
  COMIC_UNLIMITED:        (page = 1) => `/comic/unlimited?page=${page}`,
  COMIC_HOMEPAGE:         '/comic/homepage',
  COMIC_RANDOM:           '/comic/random',
  COMIC_RECOMMENDATIONS:  (page = 1) => `/comic/recommendations?page=${page}`,
  COMIC_BROWSE:           (params: Record<string, string>) => `/comic/browse?${new URLSearchParams(params)}`,
  COMIC_SCROLL:           (offset = 0) => `/comic/scroll?offset=${offset}`,
  COMIC_INFINITE:         (page = 1, type = 'latest') => `/comic/infinite?page=${page}&type=${type}`,
  COMIC_ADVANCED_SEARCH:  (params: Record<string, string>) => `/comic/advanced-search?${new URLSearchParams(params)}`,
  COMIC_COLORED:          (page = 1) => `/comic/berwarna/${page}`,
  COMIC_LIBRARY:          (page = 1) => `/comic/pustaka/${page}`,

  // ── Novel (NovelHub via Sankavollerei) ─────────────────────
  NOVEL_HOME:       '/novel/home',
  NOVEL_HOT_SEARCH: '/novel/hot-search',
  NOVEL_SEARCH:     (q: string) => `/novel/search?q=${encodeURIComponent(q)}`,
  NOVEL_GENRE:      (genreId: string) => `/novel/genre/${encodeURIComponent(genreId)}`,
  NOVEL_CHAPTERS:   (novelId: string) => `/novel/chapters/${encodeURIComponent(novelId)}`,
} as const
