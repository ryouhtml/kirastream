# AGENT.md — KiraStream Project Guide

> Dokumen ini dibuat untuk membantu AI agent memahami struktur, arsitektur, dan konvensi proyek KiraStream secara menyeluruh, agar setiap pekerjaan dapat dilakukan dengan tepat dan efisien.

---

## 1. Ringkasan Proyek

**KiraStream** (package name: `kiranime`) adalah platform streaming anime/manga/webtoon/novel modern berbasis **Next.js 14** dengan fitur PWA. Konten diambil dari API scraper eksternal dan web scraping. Autentikasi & sosial menggunakan **Firebase**. UI dibangun dengan **Tailwind CSS** + **Framer Motion**.

- **Owner:** ryou (matchadesu / kanawangyy / yoikage / Bagus)
- **Stack utama:** Next.js 15, React 18, TypeScript, Tailwind CSS v3, Framer Motion v11, Firebase v11, Zustand, Axios, Cheerio, HLS.js, Lenis

---

## 2. Struktur Direktori

```
kirastream-main/
├── pages/                  # Next.js Pages Router — setiap file = route
│   ├── _app.tsx            # Root app shell, provider wrapper
│   ├── _document.tsx       # Custom HTML document
│   ├── index.tsx           # Homepage (/)
│   ├── api/                # Next.js API Routes (server-side)
│   ├── anime/              # Halaman anime (list, detail, episode)
│   ├── manga/              # Halaman manga (list, detail, reader)
│   ├── webtoon/            # Halaman webtoon (list, detail, reader)
│   ├── novel/              # Halaman novel (list, detail, reader)
│   └── ...                 # Halaman lain (search, profile, dll.)
├── components/             # Komponen React reusable
├── contexts/               # React Context providers
├── lib/                    # Utilities, API functions, hooks
├── styles/                 # CSS global & komponen
├── public/                 # Static assets (icons, manifest, sw.js)
├── firestore.rules         # Aturan keamanan Firestore
├── next.config.js          # Konfigurasi Next.js
├── tailwind.config.ts      # Konfigurasi Tailwind
└── tsconfig.json           # Konfigurasi TypeScript
```

---

## 3. Halaman (`pages/`)

### Root
| File | Route | Fungsi |
|------|-------|--------|
| `_app.tsx` | — | Root shell: wrap semua provider (AuthProvider, SettingsProvider, LoadingProvider), pasang font Google (Plus Jakarta Sans + Noto Sans JP), register Service Worker di production, pasang MotionConfig |
| `_document.tsx` | — | Custom HTML `<Document>` untuk meta tag, font preload |
| `index.tsx` | `/` | Homepage: hero section + search bar + quick links + grid anime terbaru/populer + webtoon + jadwal |
| `search.tsx` | `/search` | Halaman pencarian dengan query param `?q=` |
| `filter.tsx` | `/filter` | Filter anime lanjutan (genre, type, status, order) |
| `explore.tsx` | `/explore` | Halaman eksplorasi konten |
| `schedule.tsx` | `/schedule` | Jadwal tayang anime per hari |
| `genres.tsx` | `/genres` | Daftar semua genre |
| `animelist.tsx` | `/animelist` | Daftar A-Z semua anime |
| `batch.tsx` | `/batch` | Daftar rilis batch |
| `ongoing.tsx` | `/ongoing` | Anime sedang tayang |
| `completed.tsx` | `/completed` | Anime selesai tayang |
| `popular.tsx` | `/popular` | Anime terpopuler |
| `upcoming.tsx` | `/upcoming` | Anime upcoming |
| `movies.tsx` | `/movies` | Daftar anime movie |
| `donghua.tsx` | `/donghua` | Daftar donghua (anime China) |
| `live-action.tsx` | `/live-action` | Daftar live-action |
| `tokusatsu.tsx` | `/tokusatsu` | Daftar tokusatsu |
| `news.tsx` | `/news` | Halaman berita |
| `login.tsx` | `/login` | Halaman login (Google OAuth + Email/Password) |
| `profile.tsx` | `/profile` | Profil user (perlu login) |
| `favorites.tsx` | `/favorites` | Daftar favorit user |
| `settings.tsx` | `/settings` | Pengaturan app (tema, bahasa, accent color, animasi) |
| `friends.tsx` | `/friends` | Halaman sosial — daftar teman |
| `groups.tsx` | `/groups` | Daftar group diskusi |
| `offline.tsx` | `/offline` | Fallback halaman offline (PWA) |

### Anime
| File | Route | Fungsi |
|------|-------|--------|
| `pages/anime.tsx` | `/anime` | Halaman utama anime — daftar terbaru |
| `pages/anime/detail/[slug].tsx` | `/anime/detail/:slug` | Detail anime: sinopsis, genre, episode list, info |
| `pages/anime/episode/[slug].tsx` | `/anime/episode/:slug` | Player episode: video HLS + server selector |

### Manga
| File | Route | Fungsi |
|------|-------|--------|
| `pages/manga/index.tsx` | `/manga` | Halaman utama manga |
| `pages/manga/[slug].tsx` | `/manga/:slug` | Detail manga |
| `pages/manga/read/[slug].tsx` | `/manga/read/:slug` | Reader manga (scroll vertikal, lazy load gambar) |
| `pages/manga/genre/[slug].tsx` | `/manga/genre/:slug` | Manga per genre |

### Webtoon
| File | Route | Fungsi |
|------|-------|--------|
| `pages/webtoon/index.tsx` | `/webtoon` | Halaman utama webtoon |
| `pages/webtoon/[slug].tsx` | `/webtoon/:slug` | Detail webtoon (slug = URL encoded webtoons.com) |
| `pages/webtoon/read/[slug].tsx` | `/webtoon/read/:slug` | Reader webtoon |

### Novel
| File | Route | Fungsi |
|------|-------|--------|
| `pages/novel/index.tsx` | `/novel` | Halaman utama novel |
| `pages/novel/[slug].tsx` | `/novel/:slug` | Detail novel |
| `pages/novel/read/[slug].tsx` | `/novel/read/:slug` | Reader novel |
| `pages/novel/genre/[slug].tsx` | `/novel/genre/:slug` | Novel per genre |

### Social
| File | Route | Fungsi |
|------|-------|--------|
| `pages/groups/[id].tsx` | `/groups/:id` | Detail grup diskusi |
| `pages/messages/index.tsx` | `/messages` | Daftar percakapan DM |
| `pages/messages/[id].tsx` | `/messages/:id` | Chat DM dengan user tertentu |

### Browse
| File | Route | Fungsi |
|------|-------|--------|
| `pages/browse/[kind]/[slug].tsx` | `/browse/:kind/:slug` | Halaman browse by kategori dinamis (genre, type, status, dll.) |

### API Routes
| File | Endpoint | Fungsi |
|------|----------|--------|
| `pages/api/proxy.ts` | `GET /api/proxy?url=` | Image proxy universal — bypass hotlink protection. Khusus handle: `sakuranovel.id` (via wsrv.nl), `webtoons.com` (referer spoof), `myanimelist.net` |
| `pages/api/mal-image.ts` | `GET /api/mal-image?url=` | Proxy khusus gambar MyAnimeList |
| `pages/api/webtoon.ts` | `GET /api/webtoon?action=` | Scraper webtoons.com — actions: `trending`, `search`, `detail`, `episodes`, `pages` |
| `pages/api/novel.ts` | `GET /api/novel?action=` | Scraper novel (sakuranovel.id) — actions: `list`, `search`, `detail`, `chapter` |

---

## 4. Komponen (`components/`)

| File | Fungsi |
|------|--------|
| `Layout.tsx` | Wrapper utama: TopNavbar + main content + Footer + MobileNav + InstallPwaPrompt. Pakai AnimatePresence untuk page transitions |
| `TopNavbar.tsx` | Navbar atas: logo, nav links, search, theme toggle, user menu/avatar, mobile drawer |
| `MobileNav.tsx` | Bottom navigation bar untuk mobile (home, anime, manga, webtoon, novel) |
| `Footer.tsx` | Footer halaman |
| `AnimeGrid.tsx` | Grid kartu anime — menerima array `Anime[]`, render dengan hover animasi |
| `ComicGrid.tsx` | Grid kartu manga/webtoon/comic |
| `NovelGrid.tsx` | Grid kartu novel |
| `Section.tsx` | Wrapper section dengan judul, subtitle JP, dan tombol "View All" |
| `LandscapeSlider.tsx` | Slider horizontal landscape untuk spotlight konten |
| `LandscapeSpotlight.tsx` | Card besar landscape untuk featured content (anime/comic) |
| `CategoryPage.tsx` | Halaman generik untuk list per kategori (genre, status, dll.) |
| `CategorySearchBar.tsx` | Search bar khusus halaman kategori |
| `AZList.tsx` | Daftar A-Z anime dengan filter huruf |
| `AnimeMenuAside.tsx` | Sidebar menu untuk halaman anime (filter, kategori) |
| `MangaMenuAside.tsx` | Sidebar menu untuk halaman manga |
| `NovelMenuAside.tsx` | Sidebar menu untuk halaman novel |
| `WebtoonMenuAside.tsx` | Sidebar menu untuk halaman webtoon |
| `EpisodeExtras.tsx` | Komponen info tambahan di halaman episode (rekomendasi, dll.) |
| `ReaderScrollControls.tsx` | Tombol kontrol scroll di halaman reader (manga/webtoon) |
| `ChatRoom.tsx` | Komponen room chat (dipakai di halaman groups/messages) |
| `ShareModal.tsx` | Modal share konten ke sosial media |
| `InstallPwaPrompt.tsx` | Banner prompt install PWA |
| `SmoothScroll.tsx` | Wrapper Lenis smooth scroll |
| `Reveal.tsx` | Wrapper animasi reveal on scroll (Framer Motion) |
| `motionVariants.ts` | Kumpulan Framer Motion variants reusable (fade, slide, scale) |

---

## 5. Contexts (`contexts/`)

| File | Fungsi |
|------|--------|
| `AuthContext.tsx` | Menyediakan: `user` (Firebase User), `profile` (data Firestore), `loading`, `loginWithGoogle()`, `loginWithEmail()`, `registerWithEmail()`, `logout()`, `updateProfile()`, `refreshProfile()`. Hook: `useAuth()` |
| `SettingsContext.tsx` | Menyimpan settings ke `localStorage` key `kiranime-settings`. State: `accent` (AccentKey), `animations` (boolean), `language` (LanguageCode), `readerScrollDistance` (10–100). Hook: `useSettings()`. AccentKeys: `blue`, `violet`, `emerald`, `rose`, `amber`, `cyan` |
| `LoadingContext.tsx` | Global loading state untuk page transitions. Hook: `useLoading()` |

---

## 6. Library (`lib/`)

| File | Fungsi |
|------|--------|
| `config.ts` | **Sumber kebenaran semua config.** `CONFIG` object: `ANIME_API`, `MAL_API`, `MAL_CLIENT_ID`, `JIKAN_API`, `FIREBASE`. `ENDPOINTS` object: semua endpoint API anime (HOME, SCHEDULE, ONGOING, COMPLETE, POPULAR, MOVIE, UPCOMING, BATCH_LIST, TYPE, ALL_ANIME, AZ, DETAIL, SEARCH, EPISODE, GENRE, FILTER, BROWSE). Helper `enc()` untuk safe URL encoding |
| `api.ts` | Semua fungsi fetch konten anime dari `sankavollerei.web.id/anime/animekompi`. Export: `fetchLatest()`, `fetchPopular()`, `fetchCompleted()`, `fetchSchedule()`, `fetchMALSeason()`, `fetchDetail(slug)`, `fetchEpisode(slug)`, `fetchSearch(query)`, `fetchGenres()`, `fetchFilter(params)`, `fetchBrowse(kind, slug)`, dll. Export types: `Anime`, `AnimeDetail`, `Episode`, `MALAnime` |
| `firebase.ts` | Inisialisasi Firebase app + semua fungsi Firebase. Auth: `loginWithGoogle()`, `loginWithEmail()`, `registerWithEmail()`, `logout()`, `onAuthChange()`, `updateUserProfile()`, `sendPasswordReset()`, `loginWithPhone()`. Firestore: `getUserFirestore()`, `updateUserFirestore()`, `addFavorite()`, `removeFavorite()`, `getFavorites()`, `addWatchHistory()`, `getWatchHistory()`, social functions (friends, groups, messages, chat) |
| `i18n.ts` | Sistem internasionalisasi — 30 bahasa. `LanguageCode` type. `LANGUAGES[]` array dengan metadata. `translate(lang, key)` function dengan fallback chain: `lang → en → id → key`. Semua string UI ada di sini |
| `novel.ts` | Fungsi khusus untuk novel — fetch dari API `/api/novel`. |
| `webtoon.ts` | Fungsi khusus untuk webtoon — fetch dari API `/api/webtoon`. |
| `social.ts` | Fungsi sosial Firebase — friends, groups, messages, chat room |
| `utils.ts` | Helper functions umum: format date, format duration, truncate text, dll. |
| `motionTokens.ts` | Design tokens untuk Framer Motion. `motionTokens`: duration (fast/normal/slow), easing (smooth/bounce/spring), distance (sm/md/lg). `adaptiveDuration()`: returns 0 jika reduced motion |
| `hooks/useAnimations.ts` | Hook `useAnimationsEnabled()` — returns boolean, gabungkan `prefers-reduced-motion` dengan setting `animations` dari SettingsContext |
| `hooks/useReducedMotion.ts` | Hook murni untuk `prefers-reduced-motion` media query |

---

## 7. Styles (`styles/`)

| File | Fungsi |
|------|--------|
| `globals.css` | CSS global: CSS custom properties (design tokens), dark mode, tema accent color via `data-accent` attribute di `<html>`. Variabel utama: `--color-text`, `--color-text-muted`, `--color-surface`, `--color-border`, `--color-primary`, `--color-accent`, `--color-ocean`. Utility classes: `.badge`, `.card`, `.btn-primary`, `.input-field`, `.skeleton`, `.anime-card`, `.anime-grid` |
| `components.css` | Tambahan styling komponen spesifik |

**Penting — Cara theming:**
- Dark mode: class `dark` di `<html>` (toggle via localStorage key `theme`)
- Accent color: `data-accent="blue|violet|emerald|rose|amber|cyan"` di `<html>`
- Selalu gunakan CSS variables, **bukan** hard-code warna Tailwind

---

## 8. Konfigurasi

| File | Fungsi |
|------|--------|
| `next.config.js` | Config Next.js: image domains whitelist (CDN anime, MAL, webtoons, dll.), headers, redirects |
| `tailwind.config.ts` | Extend Tailwind dengan font variables (`--font-jakarta`, `--font-noto-jp`), custom colors mengacu ke CSS variables |
| `firestore.rules` | Security rules Firestore — atur akses baca/tulis per collection |
| `.eslintrc.json` | ESLint rules |
| `tsconfig.json` | TypeScript config — path alias `@/` → root project |

---

## 9. Public Assets (`public/`)

| File/Folder | Fungsi |
|-------------|--------|
| `manifest.json` | PWA Web App Manifest — nama, ikon, start URL, theme color |
| `sw.js` | Service Worker untuk PWA — cache strategy, offline fallback |
| `icons/` | Ikon PWA semua ukuran (72×72 hingga 512×512) + maskable icon |
| `logo-title.png` | Logo KiraStream |
| `favicon.ico` | Favicon |

---

## 10. Sumber Data Eksternal

| Sumber | Digunakan untuk |
|--------|-----------------|
| `sankavollerei.web.id/anime/animekompi` | **API utama anime** — semua endpoint list, detail, episode, search |
| `api.myanimelist.net/v2` | MAL API — seasonal anime, score, extra metadata |
| `api.jikan.moe/v4` | Jikan (MAL unofficial) — fallback/alternative |
| `www.webtoons.com` | Scraping webtoon — trending, search, detail, episode, pages |
| `sakuranovel.id` | Scraping novel — list, search, detail, chapter |
| Firebase Auth | Autentikasi user |
| Firebase Firestore | Data user: profil, favorit, history, sosial |

---

## 11. Konvensi & Pola Penting

### Routing
- Gunakan **Next.js Pages Router** (bukan App Router)
- Dynamic routes: `[slug].tsx` untuk single param, `[kind]/[slug].tsx` untuk nested
- Semua URL anime menggunakan `slug` dari API, bukan ID numerik
- Webtoon slug = **URL encoded** dari URL webtoons.com original

### API Calls
- Semua fetch anime melalui fungsi di `lib/api.ts` — jangan langsung `fetch/axios` di komponen
- Webtoon & novel diambil via Next.js API routes (`/api/webtoon`, `/api/novel`) untuk avoid CORS
- Gambar dari luar selalu diproksikan via `/api/proxy?url=` atau `/api/mal-image?url=`

### Autentikasi
- Firebase Auth — Google OAuth + Email/Password
- Akses user via `useAuth()` hook — **jangan** akses Firebase langsung dari komponen
- Data profil tambahan disimpan di Firestore, bukan hanya di Firebase Auth user object

### Animasi
- Semua animasi pakai **Framer Motion**
- Selalu cek `useAnimationsEnabled()` sebelum apply animasi — jika false, skip atau set ke nilai netral
- Gunakan `motionTokens` dan `adaptiveDuration()` dari `lib/motionTokens.ts` untuk konsistensi
- Jangan hardcode nilai duration/easing

### Internasionalisasi
- Semua string UI harus menggunakan `translate(language, key)` dari `lib/i18n.ts`
- Dapatkan `language` dari `useSettings()` context
- Pattern: `const t = (key: string) => translate(language, key)` lalu pakai `{t('key.path')}`

### Styling
- Selalu gunakan **CSS variables** untuk warna, bukan class Tailwind langsung
- Pattern warna teks: `style={{ color: 'var(--color-text)' }}` atau `style={textStyle(muted)}`
- Dark mode otomatis via class `dark` di `<html>` — Tailwind `dark:` prefix

### TypeScript
- Path alias `@/` = root project (contoh: `import { ... } from '@/lib/api'`)
- Tipe `Anime`, `AnimeDetail`, `Episode`, `MALAnime` diexport dari `lib/api.ts`
- Semua komponen pakai TypeScript strict

---

## 12. Environment Variables

Semua env var diakses via `process.env.NEXT_PUBLIC_*` (client-side) atau `process.env.*` (server-only di API routes). Didefinisikan di `lib/config.ts`.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_MAL_CLIENT_ID
```

---

## 13. Scripts

```bash
npm run dev     # Development server (localhost:3000)
npm run build   # Production build
npm run start   # Jalankan production build
npm run lint    # ESLint check
```

---

## 14. Tips untuk AI Agent

- **Mau tambah halaman baru?** Buat file di `pages/`, ikuti konvensi file yang sudah ada. Daftar link di `TopNavbar.tsx` dan/atau `MobileNav.tsx`.
- **Mau tambah data fetch?** Tambah fungsi di `lib/api.ts` (untuk anime) atau di API route yang relevan.
- **Mau tambah komponen?** Buat di `components/`, ikuti pola import contexts via hooks.
- **Mau ubah warna/tema?** Edit CSS variables di `styles/globals.css`, jangan ubah `tailwind.config.ts` kecuali untuk token baru.
- **Mau ubah string UI?** Edit `lib/i18n.ts`, tambah key di semua bahasa yang ada.
- **Jangan** mengakses Firebase langsung di komponen — selalu lewat `useAuth()` atau fungsi di `lib/firebase.ts`.
- **Jangan** langsung `fetch()` URL gambar eksternal di komponen — selalu proxy via `/api/proxy` atau `/api/mal-image`.
- File yang paling sering diedit: `lib/api.ts`, `lib/config.ts`, `pages/index.tsx`, `styles/globals.css`, `lib/i18n.ts`.
