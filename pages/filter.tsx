import { useEffect, useState } from 'react'
import Head from 'next/head'
import { SlidersHorizontal } from 'lucide-react'
import AnimeGrid from '@/components/AnimeGrid'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import { fetchFilterList, fetchAdvancedSearch, type FilterList, type Anime } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const FIELDS: { param: string; list: keyof FilterList; key: string; multi?: boolean }[] = [
  { param: 'genre[]', list: 'genres', key: 'ak.genre', multi: true },
  { param: 'season[]', list: 'seasons', key: 'ak.season', multi: true },
  { param: 'studio[]', list: 'studios', key: 'ak.studio', multi: true },
  { param: 'status', list: 'statuses', key: 'ak.status' },
  { param: 'type', list: 'types', key: 'ak.type' },
  { param: 'order', list: 'orders', key: 'ak.order' },
]

// Advanced filter: /filter?genre[]=action&order=popular
export default function FilterPage() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [opts, setOpts] = useState<FilterList | null>(null)
  const [sel, setSel] = useState<Record<string, string[]>>({})
  const [animes, setAnimes] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => { fetchFilterList().then(setOpts) }, [])

  const toggle = (param: string, value: string, multi?: boolean) =>
    setSel((s) => {
      const cur = s[param] || []
      if (!multi) return { ...s, [param]: cur[0] === value ? [] : [value] }
      return { ...s, [param]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })

  const apply = async () => {
    setLoading(true)
    setSearched(true)
    // Nilai ganda (genre[]=a&genre[]=b) dikirim lewat URLSearchParams
    const qs = new URLSearchParams()
    Object.entries(sel).forEach(([k, vals]) => vals.forEach((v) => qs.append(k, v)))
    const data = await fetchAdvancedSearch({}, qs)
    setAnimes(data)
    setLoading(false)
  }

  const reset = () => { setSel({}); setAnimes([]); setSearched(false) }

  return (
    <>
      <Head><title>{t('ak.filter')} - KiraStream</title></Head>
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <h1 className="page-title flex items-center gap-2"><SlidersHorizontal size={22} className="text-ocean" aria-hidden="true" /> {t('ak.filter')}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('ak.filter.sub')}</p>
          </div>

          <div className="card p-4 space-y-4">
            {!opts ? (
              <div className="text-center py-6"><div className="w-8 h-8 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" /></div>
            ) : (
              FIELDS.map(({ param, list, key, multi }) => {
                const items = opts[list]
                if (!items.length) return null
                return (
                  <fieldset key={param}>
                    <legend className="font-bold text-sm uppercase tracking-wider mb-2">{t(key)}</legend>
                    <div className="flex flex-wrap gap-2">
                      {items.map((i) => {
                        const active = (sel[param] || []).includes(i.slug)
                        return (
                          <button
                            key={i.slug}
                            type="button"
                            aria-pressed={active}
                            onClick={() => toggle(param, i.slug, multi)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${active ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'}`}
                          >
                            {i.name}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                )
              })
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={apply} disabled={loading} className="btn-primary">{loading ? t('common.loading') : t('ak.apply')}</button>
              <button onClick={reset} className="btn-secondary">{t('ak.reset')}</button>
            </div>
          </div>

          {searched && !loading && (animes.length ? <AnimeGrid animes={animes} /> : <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('ak.empty')}</div>)}
        </div>
        <AnimeMenuAside />
      </div>
    </>
  )
}
