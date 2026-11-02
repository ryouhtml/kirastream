import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, ArrowLeft } from 'lucide-react'
import { fetchEpisode, fetchDetail, animeSlugOf, type StreamData, type AnimeDetail } from '@/lib/api'
import { watchHref } from '@/lib/config'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { saveHistory } from '@/lib/firebase'
import EpisodeExtras from '@/components/EpisodeExtras'

// Halaman nonton khusus: /anime/episode/:episodeSlug (terpisah dari halaman detail anime)
export default function WatchPage() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const { user } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [data, setData] = useState<StreamData | null>(null)
  const [anime, setAnime] = useState<AnimeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [server, setServer] = useState(0)

  const animeSlug = data?.animeSlug || (slug ? animeSlugOf({ slug }) : '')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setServer(0)
    fetchEpisode(slug).then((d) => {
      if (cancelled) return
      setData(d)
      setLoading(false)
      window.scrollTo({ top: 0 })
    })
    return () => { cancelled = true }
  }, [slug])

  // Daftar episode & info anime (tanpa sinkron MAL)
  useEffect(() => {
    if (!animeSlug) return
    let cancelled = false
    fetchDetail(animeSlug, undefined, false).then((d) => !cancelled && setAnime(d))
    return () => { cancelled = true }
  }, [animeSlug])

  useEffect(() => {
    if (user && anime && animeSlug) {
      saveHistory({ slug: animeSlug, title: anime.title, image: anime.image, timestamp: Date.now() })
    }
  }, [user, anime, animeSlug])

  // Prev/next: dari API kalau ada, kalau tidak dari daftar episode (urut terbaru → lama)
  const list = anime?.episodes || []
  const idx = list.findIndex((e) => e.slug === slug)
  const nextSlug = data?.nextSlug || (idx > 0 ? list[idx - 1].slug : '')
  const prevSlug = data?.prevSlug || (idx >= 0 && idx < list.length - 1 ? list[idx + 1].slug : '')

  const Nav = ({ to, children, disabled }: { to: string; children: React.ReactNode; disabled?: boolean }) =>
    disabled || !to ? (
      <span className="btn-secondary opacity-40 pointer-events-none inline-flex items-center gap-1">{children}</span>
    ) : (
      <a href={watchHref(to)} className="btn-secondary inline-flex items-center gap-1">{children}</a>
    )

  if (loading) {
    return <div className="text-center py-12"><div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" /></div>
  }

  if (!data || data.streams.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{t('anime.notFound')}</h2>
        <button onClick={() => router.back()} className="btn-primary">{t('common.back')}</button>
      </div>
    )
  }

  const current = data.streams[server] || data.streams[0]

  return (
    <>
      <Head><title>{data.title} - KiraStream</title></Head>
      <div className="space-y-6">
        <div className="card p-4">
          <Link href={`/anime/detail/${animeSlug}`} className="inline-flex items-center gap-1 text-sm text-ocean mb-2">
            <ArrowLeft size={14} aria-hidden="true" /> {anime?.title || t('common.back')}
          </Link>
          <h1 className="font-bold text-[var(--color-text)] mb-4 text-lg">{data.title}</h1>

          <div className="video-container mb-4">
            {current.kind === 'direct' ? (
              <video key={current.url} src={current.url} controls playsInline className="absolute inset-0 w-full h-full bg-black" />
            ) : (
              <iframe key={current.url} src={current.url} className="absolute inset-0 w-full h-full" allowFullScreen frameBorder="0" />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mb-4">
            <Nav to={prevSlug}><ChevronLeft size={16} aria-hidden="true" /> Prev</Nav>
            <Nav to={nextSlug}>Next <ChevronRight size={16} aria-hidden="true" /></Nav>
          </div>

          {data.streams.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-[var(--color-text-muted)] self-center">{t('anime.server')}</span>
              {data.streams.map((s, i) => (
                <button
                  key={s.url}
                  onClick={() => setServer(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${server === i ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'}`}
                >
                  {s.server}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4">
            <h2 className="text-[var(--color-text)] font-medium flex items-center gap-2 mb-3">
              <Download size={16} aria-hidden="true" /> {t('anime.downloads')}
            </h2>
            {data.downloads.length > 0 ? (
              <div className="space-y-2">
                {data.downloads.map((dl, i) => (
                  <div key={i} className="bg-surface-dark rounded-lg p-3">
                    {(dl.resolution || dl.format) && (
                      <p className="text-sm font-medium text-[var(--color-text)] mb-2">{[dl.format, dl.resolution].filter(Boolean).join(' · ')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {dl.links.map((l, j) => (
                        <a key={j} href={l.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-ocean/20 hover:bg-ocean/30 rounded text-xs text-[var(--color-text)] transition-colors">
                          {l.host || 'Download'}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{t('ak.noDownload')}</p>
            )}
          </div>

          <EpisodeExtras episodeSlug={slug} />
        </div>

        {list.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title">{t('anime.episodes')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...list].reverse().map((e) => (
                <a
                  key={e.slug}
                  href={watchHref(e.slug)}
                  className={`p-3 rounded-lg font-medium text-center transition ${e.slug === slug ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'}`}
                >
                  {e.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
