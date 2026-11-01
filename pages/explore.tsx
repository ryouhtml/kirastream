import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import { fetchGenres, fetchSeasons, fetchStudios, fetchStatuses, fetchTypes, fetchOrders, fetchPublicSettings, type TaxonomyItem, type PublicSettings } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

type Kind = 'genre' | 'season' | 'studio' | 'status' | 'type' | 'order'
const TABS: { kind: Kind; key: string }[] = [
  { kind: 'genre', key: 'ak.genre' },
  { kind: 'season', key: 'ak.season' },
  { kind: 'studio', key: 'ak.studio' },
  { kind: 'status', key: 'ak.status' },
  { kind: 'type', key: 'ak.type' },
  { kind: 'order', key: 'ak.order' },
]

export default function ExplorePage() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [tab, setTab] = useState<Kind>('genre')
  const [data, setData] = useState<Partial<Record<Kind, TaxonomyItem[]>>>({})
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<PublicSettings | null>(null)

  useEffect(() => { fetchPublicSettings().then(setSettings) }, [])

  useEffect(() => {
    if (data[tab]) return
    setLoading(true)
    const loaders: Record<Kind, () => Promise<TaxonomyItem[]>> = {
      genre: async () => (await fetchGenres()).map((g) => ({ ...g })),
      season: async () => (await fetchSeasons()).map((s) => ({ ...s })),
      studio: fetchStudios,
      status: fetchStatuses,
      type: fetchTypes,
      order: fetchOrders,
    }
    loaders[tab]().then((list) => {
      setData((d) => ({ ...d, [tab]: list }))
      setLoading(false)
    })
  }, [tab, data])

  const items = data[tab] || []
  // Kelompokkan (mis. season per tahun)
  const groups = items.reduce<Record<string, TaxonomyItem[]>>((acc, i) => {
    const g = i.group || ''
    ;(acc[g] ||= []).push(i)
    return acc
  }, {})

  return (
    <>
      <Head><title>{t('ak.explore')} - KiraStream</title></Head>
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="page-title flex items-center gap-2"><Compass size={22} className="text-ocean" aria-hidden="true" /> {t('ak.explore')}</h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('ak.explore.sub')}</p>
            </div>
            <Link href="/filter" className="btn-secondary">{t('ak.filter')}</Link>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist">
            {TABS.map(({ kind, key }) => (
              <button
                key={kind}
                role="tab"
                aria-selected={tab === kind}
                onClick={() => setTab(kind)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === kind ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'}`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          {loading && !items.length ? (
            <div className="text-center py-12"><div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" /></div>
          ) : items.length === 0 ? (
            <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('ak.noData')}</div>
          ) : (
            Object.entries(groups).map(([group, list]) => (
              <section key={group} className="space-y-2">
                {group && <h2 className="font-bold text-sm uppercase tracking-wider">{group}</h2>}
                <div className="flex flex-wrap gap-2">
                  {list.map((i) => (
                    <Link
                      key={`${i.group}-${i.slug}`}
                      href={`/browse/${tab}/${encodeURIComponent(i.slug)}`}
                      className="px-3 py-1.5 rounded-full text-sm bg-surface-dark hover:bg-surface-hover text-[var(--color-text)] transition-colors"
                    >
                      {i.name}{i.count ? <span className="ml-1.5 text-xs opacity-60">{i.count}</span> : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}

          {settings && (
            <p className="text-xs pt-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('ak.backend')}: {settings.status || 'OK'}{settings.version ? ` · ${settings.version}` : ''}
            </p>
          )}
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
