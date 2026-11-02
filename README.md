# KiraStream

![KiraStream](public/logo-title.png)

Platform streaming anime bersubtitle Indonesia sekaligus tempat baca manga, novel, dan webtoon. Dibangun dengan Next.js 15, TypeScript, dan Firebase — lengkap dengan fitur sosial dan dukungan PWA.

[![Stars](https://img.shields.io/github/stars/kanawangyy/kiranime?style=flat-square)](https://github.com/kanawangyy/kiranime/stargazers)
[![Forks](https://img.shields.io/github/forks/kanawangyy/kiranime?style=flat-square)](https://github.com/kanawangyy/kiranime/network/members)
[![Issues](https://img.shields.io/github/issues/kanawangyy/kiranime?style=flat-square)](https://github.com/kanawangyy/kiranime/issues)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vibe Coded](https://img.shields.io/badge/vibe-coded-%23ff69b4?style=flat-square)

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
- [Deploy](#️-deploy)
- [Kontribusi](#-kontribusi)
- [Contributors](#-contributors)
- [Roadmap](#️-roadmap)
- [FAQ](#-faq)
- [Lisensi](#-lisensi)
- [Disclaimer](#️-disclaimer)

---

## 📌 Tentang Proyek

**KiraStream** adalah aplikasi web modern untuk menonton anime bersubtitle Indonesia sekaligus membaca manga, komik, novel, dan webtoon dalam satu platform. Dibangun di atas Next.js Pages Router dengan TypeScript penuh, proyek ini mengutamakan performa, pengalaman pengguna yang halus (smooth scroll & micro-animation), serta dukungan instalasi sebagai Progressive Web App (PWA) agar terasa seperti aplikasi native di perangkat mobile maupun desktop.

Selain sebagai platform hiburan, KiraStream juga punya sisi sosial: pengguna bisa berteman, membuat/bergabung ke grup, dan mengobrol secara realtime — semuanya didukung oleh Firebase Authentication dan Firestore.

> 🎧 **Proyek ini dibuat dengan metode *vibe coding*** — dibangun mengikuti flow, intuisi, dan semangat, bukan sekadar spesifikasi kaku. Kalau ada yang aneh, itu fitur. Kalau mulus, itu keajaiban. ✨

---

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
- Pengaturan preferensi pengguna: accent color (6 pilihan), toggle animasi, pilihan bahasa UI (30 bahasa), jarak scroll reader

### 📱 PWA & Pengalaman Aplikasi
- Dapat **diinstal** ke home screen (Android, iOS, desktop) lewat prompt instalasi kustom
- **App shortcuts**: langsung ke Anime Terbaru, Manga, Webtoon, atau Jadwal Rilis dari icon aplikasi
- Halaman **offline** ketika koneksi terputus
- Service worker (`sw.js`) untuk caching aset

### 🎨 UI/UX
- Animasi halus dengan **Framer Motion** (`Reveal`, `motionVariants`, respects `prefers-reduced-motion`)
- **Smooth scroll** menggunakan **Lenis**
- Komponen navigasi responsif: `TopNavbar`, `MobileNav`, sidebar menu per konten
- Spotlight/slider untuk konten unggulan di beranda
- Fitur **share** konten (`ShareModal`)
- Desain sepenuhnya responsif dengan **Tailwind CSS**
- Dark mode default, theme accent color yang bisa dikustomisasi

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (Pages Router) |
| Bahasa | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Animasi | Framer Motion v11, Lenis v1 |
| State | Zustand v4, React Context |
| Auth & Database | Firebase v11 (Auth + Firestore) |
| Video | HLS.js v1 |
| Scraping/HTTP | Axios v1, Cheerio v1 |
| Icon | Lucide React |
| Font | Plus Jakarta Sans, Noto Sans JP |
| PWA | Web App Manifest + custom Service Worker |

---

## 📁 Struktur Proyek

```
kirastream-main/
├── components/       # Komponen UI (grid, navbar, chat room, reader, dll.)
├── contexts/         # React Context (Auth, Loading, Settings)
├── lib/              # Konfigurasi API, Firebase, helper i18n, motion tokens, hooks
├── pages/            # Routing Next.js (Pages Router)
│   ├── api/          # API routes server-side (proxy gambar, scraper novel & webtoon)
│   ├── anime/        # Detail & episode player anime
│   ├── manga/        # List, detail & reader manga
│   ├── novel/        # List, detail & reader novel
│   ├── webtoon/      # List, detail & reader webtoon
│   ├── groups/       # Halaman grup komunitas
│   └── messages/     # Halaman chat & pesan
├── public/           # Aset statis, ikon PWA, manifest.json, sw.js
├── styles/           # Global CSS & design tokens
├── firestore.rules   # Aturan keamanan Firestore
├── next.config.js    # Konfigurasi Next.js
├── tailwind.config.ts
└── AGENT.md          # Panduan lengkap untuk AI agent
```

> 📄 Lihat [`AGENT.md`](./AGENT.md) untuk dokumentasi teknis lengkap semua file, fungsi, konvensi, dan tips untuk AI yang bekerja di proyek ini.

---

## 🚀 Memulai

### Prasyarat

- Node.js 18+
- Akun [Firebase](https://firebase.google.com/) (untuk fitur autentikasi, database, dan sosial)

### Instalasi

```bash
git clone https://github.com/kanawangyy/kiranime.git
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

Endpoint API pihak ketiga (anime, MAL, Jikan) sudah dikonfigurasi secara default di `lib/config.ts`.

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

---

## 🔥 Setup Firebase

Fitur autentikasi, profil pengguna, favorit, pertemanan, grup, dan chat bergantung pada Firebase. Langkah setup:

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Authentication** → metode **Google**, **Email/Password**, dan (opsional) **Phone**.
3. Aktifkan **Firestore Database** (mode production atau test, sesuai kebutuhan).
4. Salin konfigurasi Web App Firebase ke `.env.local` (lihat bagian [Konfigurasi Environment](#konfigurasi-environment)).
5. Deploy aturan keamanan Firestore:

   ```bash
   npm install -g firebase-tools   # jika belum ada
   firebase login
   firebase init firestore         # hubungkan ke project Firebase kamu
   firebase deploy --only firestore:rules
   ```

Struktur data utama di Firestore:
- `users/{uid}` — profil pengguna, dengan subkoleksi `history`, `favorites`, `watchlist`, `continue`, `groups`, `stickers`
- Koleksi tambahan untuk **friendships**, **groups**, dan **messages/chat** (lihat `firestore.rules` untuk detail)

---

## 📦 Sumber Data & API

Konten anime, manga/komik, dan novel diambil dari API pihak ketiga yang dikonfigurasi di `lib/config.ts`:

| Sumber | Kegunaan |
|---|---|
| Sankavollerei (Animekompi API) | Data anime, episode, jadwal, genre, batch, A-Z list |
| Jikan API (MyAnimeList) | Data seasonal, top anime, pencarian lanjutan |
| MyAnimeList API | Integrasi opsional (butuh `NEXT_PUBLIC_MAL_CLIENT_ID`) |
| webtoons.com | Scraping trending, search, detail, pages webtoon |
| sakuranovel.id | Scraping list, search, genre, chapter novel |

Route API internal di `pages/api/` berfungsi sebagai **proxy** ke sumber-sumber di atas — menghindari CORS dan menyembunyikan endpoint asli dari client.

> ⚠️ Data dan konten diambil dari layanan pihak ketiga di luar kendali proyek ini. Ketersediaan endpoint dapat berubah sewaktu-waktu.

---

## 📱 PWA & Service Worker

- `public/manifest.json` mendefinisikan metadata aplikasi, ikon, dan **app shortcuts**
- `public/sw.js` menangani caching aset untuk mendukung penggunaan offline
- `pages/offline.tsx` ditampilkan saat pengguna kehilangan koneksi
- `components/InstallPwaPrompt.tsx` menampilkan prompt instalasi kustom

---

## ☁️ Deploy

Proyek ini adalah aplikasi Next.js standar dan dapat di-deploy ke:

- **[Vercel](https://vercel.com/)** *(direkomendasikan — plug-and-play untuk Next.js)*
- **Netlify** (dengan Next.js Runtime)
- Server Node.js sendiri (`npm run build && npm run start`)

Pastikan seluruh environment variable sudah diatur di dashboard platform deploy kamu.

---

## 🤝 Kontribusi

Kontribusi sangat terbuka! Untuk berkontribusi:

1. **Fork** repository ini
2. Buat branch fitur/perbaikan: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m "feat: menambahkan nama-fitur"`
4. Push ke branch: `git push origin fitur/nama-fitur`
5. Buka **Pull Request** ke branch utama

Mohon pastikan kode sudah lolos `npm run lint` sebelum membuka PR.

---

## 👥 Contributors

Terima kasih kepada semua yang membantu membangun proyek ini.

### Author & Maintainer

- **[kanawangyy](https://github.com/kanawangyy)** (yoikage / Bagus) — penulis & maintainer proyek ini

---

## 🗺️ Roadmap

- [ ] Peningkatan pengalaman offline (caching konten, bukan hanya shell aplikasi)
- [ ] Notifikasi push untuk episode/chapter baru
- [ ] Optimasi SEO & Open Graph per halaman detail
- [ ] Player kustom dengan subtitle renderer
- [ ] Mode baca manga horizontal (manga Jepang)

---

## ❓ FAQ

**Apakah KiraStream meng-hosting konten videonya sendiri?**
Tidak. KiraStream mengambil dan menampilkan data dari API pihak ketiga; tidak ada file media yang di-hosting oleh proyek ini.

**Kenapa Firebase wajib dikonfigurasi?**
Tanpa Firebase, fitur autentikasi, favorit, riwayat, pertemanan, grup, dan chat tidak akan berfungsi. Fitur penjelajahan konten tetap bisa berjalan, tetapi disarankan tetap mengisi environment variable-nya.

**Bisakah dijalankan tanpa Firebase?**
Sebagian besar halaman konten bisa berjalan, namun halaman yang bergantung pada autentikasi (`login`, `profile`, `friends`, `groups`, `messages`) memerlukan konfigurasi Firebase yang valid.

**Apa itu *vibe coding*?**
Pendekatan coding yang mengutamakan flow kreatif dan intuisi daripada perencanaan rigid. Proyek ini dibuat sambil dengerin musik, ngikutin mood, dan iterasi cepat — kalau kerasa bener, ya lanjut. ✌️

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **[MIT License](./LICENSE)** — bebas digunakan, dimodifikasi, dan didistribusikan, dengan tetap menyertakan atribusi hak cipta asli.

---

## ⚠️ Disclaimer

KiraStream dibuat untuk tujuan pembelajaran dan pengembangan. Seluruh konten anime, manga, novel, dan webtoon diambil dari API/sumber pihak ketiga dan bukan milik atau di-hosting oleh proyek ini. Hak cipta atas konten tetap menjadi milik pemegang hak masing-masing.

---

<div align="center">

Dibuat dengan 💜 + 🎧 oleh [ryou](https://github.com/kanawangyy)

*vibe coded, not engineered.*

</div>
