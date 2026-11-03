import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Download, MonitorPlay } from 'lucide-react'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import NekoAgeGate from '@/components/NekoAgeGate'
import { fetchNekoEpisode, type NekoEpisodeDetail } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const imageProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`

function NekoEpisodeContent() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [data, setData] = useState<NekoEpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [server, setServer] = useState(0)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setServer(0)
    fetchNekoEpisode(slug).then((episode) => {
      if (cancelled) return
      setData(episode)
      setLoading(false)
      window.scrollTo({ top: 0 })
    })
    return () => { cancelled = true }
  }, [slug])

  const backHref = data?.series?.slug
    ? `/neko/detail/${encodeURIComponent(data.series.slug)}`
    : '/neko'
  const backLabel = data?.series?.name || t('neko.backHome')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-52" />
        <div className="skeleton aspect-video w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card p-8 text-center space-y-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{t('neko.notFound')}</h2>
        <Link href="/neko" className="btn-primary inline-flex items-center gap-1.5">
          <ArrowLeft size={15} aria-hidden="true" /> {t('neko.backHome')}
        </Link>
      </div>
    )
  }

  const current = data.streams[server] || data.streams[0]

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-ocean">
        <ArrowLeft size={14} aria-hidden="true" /> {backLabel}
      </Link>

      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{data.title}</h1>
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-red-400">18+</span>
        </div>

        {current ? (
          <div className="video-container mb-4">
            <iframe
              key={current.url}
              src={current.url}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              // Batasi kemampuan halaman embed: tanpa akses ke parent/top,
              // tanpa form/popup, dan referer tidak dikirim.
              sandbox="allow-scripts allow-same-origin allow-presentation allow-orientation-lock"
              referrerPolicy="no-referrer"
              frameBorder="0"
              title={data.title}
            />
          </div>
        ) : (
          <div className="mb-4 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-alt)] text-center">
            {data.thumbnail ? (
              <div className="relative h-full w-full overflow-hidden rounded-xl opacity-60">
                <Image src={imageProxy(data.thumbnail)} alt={data.title} fill sizes="100vw" className="object-cover" />
              </div>
            ) : (
              <>
                <MonitorPlay size={28} className="text-[var(--color-text-muted)]" aria-hidden="true" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.loadError')}</p>
              </>
            )}
          </div>
        )}

        {data.streams.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.stream')}</span>
            {data.streams.map((s, i) => (
              <button
                key={s.url}
                type="button"
                onClick={() => setServer(i)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  server === i ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'
                }`}
              >
                {s.server || `Server ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {data.description && (
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {data.description}
          </p>
        )}

        <div>
          <h2 className="mb-3 flex items-center gap-2 font-medium" style={{ color: 'var(--color-text)' }}>
            <Download size={16} aria-hidden="true" /> {t('neko.download')}
          </h2>
          {data.downloads.length > 0 ? (
            <div className="space-y-2">
              {data.downloads.map((group, i) => (
                <div key={`${group.quality}-${i}`} className="rounded-lg bg-surface-dark p-3">
                  {group.quality && (
                    <p className="mb-2 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{group.quality}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {group.links.map((link, j) => (
                      <a
                        key={`${link.url}-${j}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="rounded bg-ocean/20 px-3 py-1 text-xs text-[var(--color-text)] transition-colors hover:bg-ocean/30"
                      >
                        {link.host || 'Download'}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.noResult')}</p>
          )}
        </div>

        {data.series && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.series')}</p>
            <Link href={backHref} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-ocean">
              {data.series.name} <span aria-hidden="true">›</span>
            </Link>
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
    </div>
  )
}

export default function NekoEpisodePage() {
  return (
    <>
      <Head>
        <title>Neko (18+) - KiraStream</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <NekoAgeGate>
            <NekoEpisodeContent />
          </NekoAgeGate>
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
