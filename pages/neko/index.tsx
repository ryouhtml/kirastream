import { useEffect, useState, type FormEvent } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { Cat, ImageOff, Search } from 'lucide-react'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import NekoAgeGate from '@/components/NekoAgeGate'
import { fetchNekoHome, fetchNekoSearch, type NekoHomeData, type NekoPost } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const imageProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`

function NekoCard({ item, href }: { item: NekoPost; href: string }) {
  return (
    <Link href={href} className="anime-card group">
      <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)]">
        {item.thumbnail ? (
          <Image
            src={imageProxy(item.thumbnail)}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 45vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
            <ImageOff size={20} aria-hidden="true" />
          </div>
        )}
        {item.date && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white backdrop-blur-sm line-clamp-1">
            {item.date}
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-medium">{item.title}</p>
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  )
}

function NekoHomeContent() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [home, setHome] = useState<NekoHomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [results, setResults] = useState<NekoPost[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchNekoHome().then((data) => {
      if (cancelled) return
      setHome(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const runSearch = async (event: FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (!q) {
      setSubmitted('')
      setResults([])
      return
    }
    setSearching(true)
    setSubmitted(q)
    const res = await fetchNekoSearch(q, 1)
    setResults(res.items)
    setSearching(false)
  }

  const isEmpty =
    !home ||
    (home.recommended.length === 0 &&
      home.latestHentai.length === 0 &&
      home.latestEpisodes.length === 0 &&
      home.latestJav.length === 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Cat size={22} className="text-ocean" aria-hidden="true" /> {t('ak.neko')}
            <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold leading-none text-red-400">18+</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.subtitle')}</p>
        </div>

        <form onSubmit={runSearch} className="flex w-full max-w-sm gap-2" role="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('neko.searchPlaceholder')}
            aria-label={t('neko.searchPlaceholder')}
            className="input-field"
          />
          <button type="submit" className="btn-secondary inline-flex items-center gap-1.5" disabled={searching}>
            <Search size={15} aria-hidden="true" />
            {t('neko.search')}
          </button>
        </form>
      </div>

      {submitted ? (
        <Section title={`${t('neko.searchResult')}: ${submitted}`}>
          {searching ? (
            <div className="anime-grid">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('neko.noResult')}
            </div>
          ) : (
            <div className="anime-grid">
              {results.map((item) => (
                <NekoCard key={item.slug} item={item} href={`/neko/detail/${encodeURIComponent(item.slug)}`} />
              ))}
            </div>
          )}
        </Section>
      ) : loading ? (
        <div className="space-y-6">
          <div className="anime-grid">
            {[...Array(10)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
          </div>
        </div>
      ) : isEmpty ? (
        <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('neko.loadError')}
        </div>
      ) : (
        <>
          {home.recommended.length > 0 && (
            <Section title={t('neko.recommended')}>
              <div className="flex flex-wrap gap-2">
                {home.recommended.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/neko/detail/${encodeURIComponent(item.slug)}`}
                    className="rounded-full bg-surface-dark px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-surface-hover"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {home.latestHentai.length > 0 && (
            <Section title={t('neko.latestHentai')}>
              <div className="anime-grid">
                {home.latestHentai.map((item) => (
                  <NekoCard key={item.slug} item={item} href={`/neko/detail/${encodeURIComponent(item.slug)}`} />
                ))}
              </div>
            </Section>
          )}

          {home.latestEpisodes.length > 0 && (
            <Section title={t('neko.latestEpisodes')}>
              <div className="anime-grid">
                {home.latestEpisodes.map((item) => (
                  <NekoCard key={item.slug} item={item} href={`/neko/episode/${encodeURIComponent(item.slug)}`} />
                ))}
              </div>
            </Section>
          )}

          {home.latestJav.length > 0 && (
            <Section title={t('neko.latestJav')}>
              <div className="anime-grid">
                {home.latestJav.map((item) => (
                  <NekoCard key={item.slug} item={item} href={`/neko/detail/${encodeURIComponent(item.slug)}`} />
                ))}
              </div>
            </Section>
          )}

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
        </>
      )}
    </div>
  )
}

export default function NekoPage() {
  return (
    <>
      <Head>
        <title>Neko (18+) - KiraStream</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          <NekoAgeGate>
            <NekoHomeContent />
          </NekoAgeGate>
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
