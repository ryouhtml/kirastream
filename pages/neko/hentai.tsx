import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Library, Search } from 'lucide-react'
import NekoPageShell from '@/components/NekoPageShell'
import NekoPostCard from '@/components/NekoPostCard'
import NekoPager from '@/components/NekoPager'
import { fetchNekoHentaiList, type NekoPost } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

// Endpoint /hentai-list mengembalikan seluruh seri sekaligus, jadi
// paginasi dan pencarian dilakukan di sisi klien.
const PAGE_SIZE = 36

function NekoHentaiListContent() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [items, setItems] = useState<NekoPost[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    fetchNekoHentaiList(1).then((res) => {
      if (cancelled) return
      setItems(res.items)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.title.toLowerCase().includes(q))
  }, [items, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const changePage = (next: number) => {
    setPage(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="space-y-6">
      <Link href="/neko" className="inline-flex items-center gap-1 text-sm text-ocean">
        <ArrowLeft size={14} aria-hidden="true" /> {t('neko.backHome')}
      </Link>

      <div>
        <h1 className="page-title flex items-center gap-2">
          <Library size={22} className="text-ocean" aria-hidden="true" /> {t('neko.allHentai')}
          <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold leading-none text-red-400">18+</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.allHentai.sub')}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('neko.searchInList')}
            aria-label={t('neko.searchInList')}
            className="input-field w-full pl-9"
          />
        </div>
        {!loading && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('neko.itemsCount').replace('{count}', String(filtered.length))}
          </p>
        )}
      </div>

      {loading ? (
        <div className="anime-grid">
          {[...Array(18)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('neko.noResult')}
        </div>
      ) : (
        <div className="anime-grid">
          {visible.map((item) => (
            <NekoPostCard key={item.slug} item={item} href={`/neko/detail/${encodeURIComponent(item.slug)}`} />
          ))}
        </div>
      )}

      <NekoPager
        page={safePage}
        totalPages={totalPages}
        onChange={changePage}
        disabled={loading}
      />

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
    </div>
  )
}

export default function NekoHentaiListPage() {
  return (
    <NekoPageShell title="All Hentai">
      <NekoHentaiListContent />
    </NekoPageShell>
  )
}
