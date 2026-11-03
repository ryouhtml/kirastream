import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ImageOff, PlayCircle } from 'lucide-react'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import NekoAgeGate from '@/components/NekoAgeGate'
import { fetchNekoDetail, type NekoDetail } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const imageProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function NekoDetailContent() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [data, setData] = useState<NekoDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    fetchNekoDetail(slug).then((detail) => {
      if (cancelled) return
      setData(detail)
      setLoading(false)
      window.scrollTo({ top: 0 })
    })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="skeleton h-64 w-full sm:w-48" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-6 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          </div>
        </div>
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

  return (
    <div className="space-y-6">
      <Link href="/neko" className="inline-flex items-center gap-1 text-sm text-ocean">
        <ArrowLeft size={14} aria-hidden="true" /> {t('neko.backHome')}
      </Link>

      <div className="card p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-alt)] sm:w-48">
            {data.thumbnail ? (
              <Image
                src={imageProxy(data.thumbnail)}
                alt={data.title}
                fill
                sizes="(max-width: 640px) 90vw, 192px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                <ImageOff size={24} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-red-400">18+</span>
                {data.status && (
                  <span className="rounded bg-surface-dark px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">{data.status}</span>
                )}
                {data.score && (
                  <span className="rounded bg-ocean/15 px-2 py-0.5 text-xs font-bold text-ocean">★ {data.score}</span>
                )}
              </div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--color-text)' }}>{data.title}</h1>
              {data.japanName && (
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{data.japanName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <MetaRow label={t('neko.producer')} value={data.producer} />
              <MetaRow label={t('neko.type')} value={data.type} />
              <MetaRow label={t('neko.status')} value={data.status} />
              <MetaRow label={t('neko.duration')} value={data.duration} />
            </div>

            {data.genres.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.genre')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.genres.map((genre) => (
                    <span key={genre} className="rounded-lg bg-surface-dark px-2.5 py-1 text-xs font-medium text-[var(--color-text)]">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <PlayCircle size={20} aria-hidden="true" /> {t('neko.episodes')}
          <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>({data.episodes.length})</span>
        </h2>

        {data.episodes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.noResult')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.episodes.map((ep) => (
              <Link
                key={ep.slug}
                href={`/neko/episode/${encodeURIComponent(ep.slug)}`}
                className="group flex items-center gap-3 rounded-xl border p-2 transition-colors hover:bg-surface-hover"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-alt)]">
                  {ep.thumbnail ? (
                    <Image
                      src={imageProxy(ep.thumbnail)}
                      alt={ep.title}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                      <PlayCircle size={18} aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium group-hover:text-ocean" style={{ color: 'var(--color-text)' }}>
                    {ep.title}
                  </p>
                  {ep.uploadedDate && (
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>{ep.uploadedDate}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
    </div>
  )
}

export default function NekoDetailPage() {
  return (
    <>
      <Head>
        <title>Neko (18+) - KiraStream</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <NekoAgeGate>
            <NekoDetailContent />
          </NekoAgeGate>
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
