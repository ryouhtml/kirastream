import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Cat, Search } from 'lucide-react'
import NekoPageShell from '@/components/NekoPageShell'
import NekoPostCard from '@/components/NekoPostCard'
import { fetchNekoHome, fetchNekoSearch, nekoPostHref, type NekoHomeData, type NekoPost } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="section-title">{title}</h2>
        {action && (
          <Link href={action.href} className="shrink-0 text-sm font-medium text-ocean">
            {action.label} →
          </Link>
        )}
      </div>
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

      <div className="flex flex-wrap gap-2">
        <Link href="/neko/hentai" className="tag">{t('neko.allHentai')}</Link>
        <Link href="/neko/genres" className="tag">{t('neko.genres')}</Link>
        <Link href="/neko/latest-hentai" className="tag">{t('neko.latestHentai')}</Link>
        <Link href="/neko/latest-jav" className="tag">{t('neko.latestJav')}</Link>
        <Link href="/neko/category/3d-hentai" className="tag">{t('neko.category.3d-hentai')}</Link>
        <Link href="/neko/category/jav-cosplay" className="tag">{t('neko.category.jav-cosplay')}</Link>
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
                <NekoPostCard key={item.slug} item={item} />
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
            <Section title={t('neko.recommended')} action={{ href: '/neko/hentai', label: t('neko.viewAll') }}>
              <div className="flex flex-wrap gap-2">
                {home.recommended.map((item) => (
                  <Link
                    key={item.slug}
                    href={nekoPostHref(item)}
                    className="rounded-full bg-surface-dark px-3 py-1.5 text-sm text-[var(--color-text)] transition-colors hover:bg-surface-hover"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {home.latestHentai.length > 0 && (
            <Section title={t('neko.latestHentai')} action={{ href: '/neko/latest-hentai', label: t('neko.viewAll') }}>
              <div className="anime-grid">
                {home.latestHentai.map((item) => (
                  <NekoPostCard key={item.slug} item={item} />
                ))}
              </div>
            </Section>
          )}

          {home.latestEpisodes.length > 0 && (
            <Section title={t('neko.latestEpisodes')}>
              <div className="anime-grid">
                {home.latestEpisodes.map((item) => (
                  <NekoPostCard key={item.slug} item={item} />
                ))}
              </div>
            </Section>
          )}

          {home.latestJav.length > 0 && (
            <Section title={t('neko.latestJav')} action={{ href: '/neko/latest-jav', label: t('neko.viewAll') }}>
              <div className="anime-grid">
                {home.latestJav.map((item) => (
                  <NekoPostCard key={item.slug} item={item} />
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
    <NekoPageShell>
      <NekoHomeContent />
    </NekoPageShell>
  )
}
