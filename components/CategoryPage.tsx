import { useState, useEffect } from 'react'
import Head from 'next/head'
import type { LucideIcon } from 'lucide-react'
import AnimeGrid from '@/components/AnimeGrid'
import CategorySearchBar from '@/components/CategorySearchBar'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import type { Anime } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

interface Props {
  titleKey: string
  subtitleKey?: string
  title?: string
  subtitle?: string
  icon: LucideIcon
  fetcher: (page: number) => Promise<Anime[]>
  deps?: any[]
}

// Halaman daftar anime generik dengan "muat lebih banyak"
export default function CategoryPage({ titleKey, subtitleKey, title, subtitle, icon: Icon, fetcher, deps = [] }: Props) {
  const [animes, setAnimes] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const heading = title || t(titleKey)
  const sub = subtitle ?? (subtitleKey ? t(subtitleKey) : '')

  useEffect(() => { setPage(1) }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const data = await fetcher(page)
      if (cancelled) return
      setAnimes((prev) => (page === 1 ? data : [...prev, ...data.filter((d) => !prev.some((p) => p.slug === d.slug))]))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [page, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head><title>{heading} - KiraStream</title></Head>
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="page-title flex items-center gap-2"><Icon size={22} className="text-ocean" aria-hidden="true" /> {heading}</h1>
              {sub && <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
            </div>
            <CategorySearchBar type="anime" placeholder={t('search.placeholderAnime')} />
          </div>
          {loading && page === 1 ? (
            <div className="text-center py-12"><div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" /></div>
          ) : (
            <>
              <AnimeGrid animes={animes} />
              {animes.length > 0 && (
                <div className="text-center pt-2">
                  <button onClick={() => setPage((p) => p + 1)} disabled={loading} className="btn-secondary">
                    {loading ? t('common.loading') : t('common.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
