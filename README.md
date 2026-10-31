# KiraStream

![KiraStream](public/logo-title.png)

Platform streaming anime bersubtitle Indonesia sekaligus tempat baca manga, novel, dan webtoon. Dibangun dengan Next.js 14, TypeScript, dan Firebase — lengkap dengan fitur sosial dan dukungan PWA.

[![Stars](https://img.shields.io/github/stars/kanawangyy-yoikage/kiranime?style=flat-square)](https://github.com/kanawangyy-yoikage/kiranime/stargazers)
[![Forks](https://img.shields.io/github/forks/kanawangyy-yoikage/kiranime?style=flat-square)](https://github.com/kanawangyy-yoikage/kiranime/network/members)
[![Issues](https://img.shields.io/github/issues/kanawangyy-yoikage/kiranime?style=flat-square)](https://github.com/kanawangyy-yoikage/kiranime/issues)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)

---

## 📖 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Fitur](#-fitur)
- [Tech Stack](#️-tech-stack)
- [Struktur Proyek](#-struktur-proyek)
- [Memulai](#-memulai)
  - [Prasyarat](#prasyarat)
  - [Instalasi](#instalasi)
  - [Konfigurasi Environment](#konfigurasi-environment)
  - [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
  - [Build untuk Produksi](#build-untuk-produksi)
- [Setup Firebase](#-setup-firebase)
- [Sumber Data & API](#-sumber-data--api)
- [PWA & Service Worker](#-pwa--service-worker)
- [Deploy](#-deploy)
- [Kontribusi](#-kontribusi)
- [Contributors](#-contributors)
- [Roadmap](#️-roadmap)
- [FAQ](#-faq)
- [Lisensi](#-lisensi)
- [Disclaimer](#️-disclaimer)

## 📌 Tentang Proyek

**KiraStream** adalah aplikasi web modern untuk menonton anime bersubtitle Indonesia sekaligus membaca manga, komik, novel, dan webtoon dalam satu platform. Dibangun di atas Next.js Pages Router dengan TypeScript penuh, proyek ini mengutamakan performa, pengalaman pengguna yang halus (smooth scroll & micro-animation), serta dukungan instalasi sebagai Progressive Web App (PWA) agar terasa seperti aplikasi native di perangkat mobile maupun desktop.

Selain sebagai platform hiburan, KiraStream juga punya sisi sosial: pengguna bisa berteman, membuat/bergabung ke grup, dan mengobrol secara realtime — semuanya didukung oleh Firebase Authentication dan Firestore.

## ✨ Fitur

### 🎬 Anime
- Jelajahi anime **ongoing**, **completed**, **populer**, dan **movie**
- Halaman **jadwal rilis** (schedule) mingguan
- Daftar anime **A–Z** dan filter berdasarkan **genre**
- Pencarian anime dengan hasil real-time
- Halaman detail lengkap: sinopsis, info (studio, skor, status, tipe, durasi, musim), daftar episode, dan batch download
- Streaming episode berbasis **HLS** (HTTP Live Streaming)

### 📚 Manga & Webtoon
- Katalog manga & webtoon: terbaru, populer, trending, genre, tipe, hingga pencarian lanjutan
- Reader dengan kontrol scroll khusus (`ReaderScrollControls`) untuk pengalaman baca yang nyaman
- Navigasi antar-chapter

### 📖 Novel
- Jelajahi katalog novel & pencarian populer (hot search)
- Filter berdasarkan genre
- Baca per-chapter

### 👥 Sosial & Akun
- Autentikasi via **Google Sign-In**, **Email/Password**, hingga **verifikasi nomor telepon** (Firebase Auth)
- Profil pengguna yang dapat diperbarui (nama, foto)
- Sistem **pertemanan** (friends)
- **Grup** diskusi/komunitas
- **Chat room** realtime dengan Firestore
- Sistem **pesan** (messages) 1-on-1

### ⭐ Personalisasi
- Simpan **favorit** anime/manga/novel/webtoon
- **Riwayat tontonan/bacaan** untuk lanjut dari posisi terakhir
- Pengaturan preferensi pengguna (`SettingsContext`)

### 📱 PWA & Pengalaman Aplikasi
- Dapat **diinstal** ke home screen (Android, iOS, desktop) lewat prompt instalasi kustom
- **App shortcuts**: langsung ke Anime Terbaru, Manga, Webtoon, atau Jadwal Rilis dari icon aplikasi
- Halaman **offline** ketika koneksi terputus
- Service worker (`sw.js`) untuk caching aset

### 🎨 UI/UX
- Animasi halus dengan **Framer Motion** (`Reveal`, `motionVariants`)
- **Smooth scroll** menggunakan **Lenis**
- Komponen navigasi responsif: `TopNavbar`, `MobileNav`, `AnimeMenuAside`
- Spotlight/slider untuk konten unggulan di beranda
- Fitur **share** konten (`ShareModal`)
- Desain sepenuhnya responsif dengan **Tailwind CSS**

## 🛠️ Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (Pages Router) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS |
| Animasi | Framer Motion, Lenis |
| State | Zustand, React Context |
| Auth & Database | Firebase (Auth + Firestore) |
| Video | HLS.js |
| Scraping/HTTP | Axios, Cheerio |
| Icon | Lucide React |
| PWA | Web App Manifest + custom Service Worker |

## 📁 Struktur Proyek

```
kiranime-main/
├── components/       # Komponen UI (grid, navbar, chat room, reader, dll.)
├── contexts/         # React Context (Auth, Loading, Settings)
├── lib/              # Konfigurasi API, Firebase, helper i18n, dll.
├── pages/             # Routing Next.js (Pages Router)
│   ├── api/          # API routes (proxy, image-proxy, novel, webtoon)
│   ├── anime/         # Halaman detail anime
│   ├── manga/         # Halaman manga
│   ├── novel/         # Halaman novel
│   ├── webtoon/       # Halaman webtoon
│   ├── groups/        # Halaman grup
│   └── messages/      # Halaman pesan/chat
├── public/            # Aset statis, ikon PWA, manifest, service worker
├── styles/            # Global CSS
├── firestore.rules    # Aturan keamanan Firestore
└── next.config.js
```

## 🚀 Memulai

### Prasyarat

- Node.js 18+
- Akun [Firebase](https://firebase.google.com/) (untuk fitur autentikasi, database, dan sosial)

### Instalasi

```bash
git clone https://github.com/kanawangyy-yoikage/kiranime.git
cd kiranime
npm install
```

### Konfigurasi Environment

Buat file `.env.local` di root proyek dan isi dengan kredensial Firebase kamu:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_MAL_CLIENT_ID=
```

Endpoint API pihak ketiga (anime, MAL, Jikan) sudah dikonfigurasi secara default di `next.config.js` dan `lib/config.ts`.

### Menjalankan Secara Lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Build untuk Produksi

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## 🔥 Setup Firebase

Fitur autentikasi, profil pengguna, favorit, pertemanan, grup, dan chat bergantung pada Firebase. Langkah setup:

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication** → metode **Google**, **Email/Password**, dan (opsional) **Phone**.
3. Aktifkan **Firestore Database** (mode production atau test, sesuai kebutuhan).
4. Salin konfigurasi Web App Firebase ke `.env.local` (lihat bagian [Konfigurasi Environment](#konfigurasi-environment)).
5. Deploy aturan keamanan Firestore yang sudah disediakan di `firestore.rules`:

   ```bash
   npm install -g firebase-tools   # jika belum ada
   firebase login
   firebase init firestore         # hubungkan ke project Firebase kamu
   firebase deploy --only firestore:rules
   ```

Struktur data utama di Firestore mengikuti pola:
- `users/{uid}` — profil pengguna, dengan subkoleksi `history`, `favorites`, `watchlist`, `continue`, `groups`, `stickers`
- Koleksi tambahan untuk **friendships**, **groups**, dan **messages/chat** (lihat `firestore.rules` untuk detail aturan aksesnya)

## 📦 Sumber Data & API

Konten anime, manga/komik, dan novel diambil dari API pihak ketiga yang didefinisikan di `lib/config.ts`:

| Sumber | Kegunaan |
|---|---|
| Sankavollerei (Animasu API) | Data anime, episode, jadwal, genre, karakter, serta manga/komik |
| Jikan API (MyAnimeList) | Data tambahan MAL — musim, top anime, pencarian |
| MyAnimeList API | Integrasi opsional (butuh `NEXT_PUBLIC_MAL_CLIENT_ID`) |
| Sankavollerei Novel API | Katalog, pencarian, genre, dan chapter novel |

Route API internal di `pages/api/` (`proxy.ts`, `image-proxy.ts`, `mal-image.ts`, `novel.ts`, `webtoon.ts`) berfungsi sebagai **proxy** ke sumber-sumber di atas — tujuannya menghindari masalah CORS dan menyembunyikan endpoint asli dari client.

> ⚠️ Data dan konten (anime/manga/novel/webtoon) diambil dari layanan pihak ketiga di luar kendali proyek ini. Ketersediaan dan keakuratan endpoint dapat berubah sewaktu-waktu.

## 📱 PWA & Service Worker

- `public/manifest.json` mendefinisikan metadata aplikasi, ikon, dan **app shortcuts** (Anime Terbaru, Manga, Webtoon, Jadwal Rilis).
- `public/sw.js` menangani caching aset untuk mendukung penggunaan offline.
- `pages/offline.tsx` ditampilkan saat pengguna kehilangan koneksi.
- `components/InstallPwaPrompt.tsx` menampilkan prompt instalasi kustom di browser yang mendukung.

Header cache khusus untuk `sw.js` dan `manifest.json` sudah dikonfigurasi di `next.config.js`.

## ☁️ Deploy

Proyek ini adalah aplikasi Next.js standar sehingga dapat di-deploy ke platform mana pun yang mendukung Next.js, misalnya:

- **[Vercel](https://vercel.com/)** (direkomendasikan, plug-and-play untuk Next.js)
- **Netlify** (dengan Next.js Runtime)
- Server Node.js sendiri (`npm run build && npm run start`)

Pastikan seluruh environment variable pada bagian [Konfigurasi Environment](#konfigurasi-environment) sudah diatur di dashboard platform deploy kamu.

## 🤝 Kontribusi

Kontribusi sangat terbuka! Untuk berkontribusi:

1. **Fork** repository ini
2. Buat branch fitur/perbaikan: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m "feat: menambahkan nama-fitur"`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buka **Pull Request** ke branch utama

Mohon pastikan kode sudah lolos `npm run lint` sebelum membuka PR.

## 👥 Contributors

Terima kasih kepada semua yang membantu membangun proyek ini. Daftar lengkap tersedia di [CONTRIBUTORS.md](./CONTRIBUTORS.md).

### Author & Maintainer

- **[ryouhtml](https://github.com/ryouhtml)** — author & maintainer repo ini
- **[kanawangyy-yoikage](https://github.com/kanawangyy-yoikage)** — penulis proyek asli

### AI Assistance

Proyek ini dikembangkan dengan bantuan beberapa asisten AI:

| Tool | Situs |
| --- | --- |
| OpenCode | <https://opencode.ai> |
| Gemini | <https://gemini.google.com> |
| Claude | <https://claude.ai> |
| ChatGPT | <https://chatgpt.com> |
| Grok | <https://grok.com> |
| Perplexity | <https://www.perplexity.ai> |
| DeepSeek | <https://www.deepseek.com> |

## 🗺️ Roadmap

- [ ] Dukungan multi-bahasa (i18n) yang lebih luas
- [ ] Peningkatan pengalaman offline (caching konten, bukan hanya shell aplikasi)
- [ ] Notifikasi push untuk episode/chapter baru
- [ ] Dark mode / theme kustom lewat `SettingsContext`
- [ ] Optimasi SEO & Open Graph per halaman detail

## ❓ FAQ

**Apakah KiraStream meng-hosting konten videonya sendiri?**
Tidak. KiraStream mengambil dan menampilkan data dari API pihak ketiga; tidak ada file media yang di-hosting oleh proyek ini.

**Kenapa Firebase wajib dikonfigurasi?**
Tanpa Firebase, fitur autentikasi, favorit, riwayat, pertemanan, grup, dan chat tidak akan berfungsi. Fitur penjelajahan konten (anime/manga/novel/webtoon) tetap bisa berjalan tanpa Firebase, tetapi disarankan tetap mengisi environment variable-nya.

**Bisakah dijalankan tanpa Firebase untuk eksperimen cepat?**
Sebagian besar halaman konten dapat dijalankan, namun halaman yang bergantung pada autentikasi (`login`, `profile`, `friends`, `groups`, `messages`) memerlukan konfigurasi Firebase yang valid.

## 📄 Lisensi

Proyek ini dilisensikan di bawah **[MIT License](./LICENSE)** — bebas digunakan, dimodifikasi, dan didistribusikan, dengan tetap menyertakan atribusi hak cipta asli.

## ⚠️ Disclaimer

KiraStream dibuat untuk tujuan pembelajaran dan pengembangan. Seluruh konten anime, manga, novel, dan webtoon diambil dari API/sumber pihak ketiga dan bukan milik atau di-hosting oleh proyek ini. Hak cipta atas konten tetap menjadi milik pemegang hak masing-masing.

---

Dibuat dengan 💜 oleh [kanawangyy-yoikage](https://github.com/kanawangyy-yoikage)
