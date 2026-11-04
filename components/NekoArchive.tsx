import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import NekoPostCard from './NekoPostCard'
import NekoPager from './NekoPager'
import type { NekoListResult, NekoPagination, NekoPost } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

interface Props {
  title: string
  subtitle?: string
  icon?: LucideIcon
  fetcher: (page: number) => Promise<NekoListResult>
}

const EMPTY_PAGINATION: NekoPagination = {
  currentPage: 1,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
}

/**
 * Daftar Neko dengan paginasi dari API (latest-hentai, latest-jav,
 * genre, category). Halaman di-reset lewat `key` saat slug berubah.
 */
export default function NekoArchive({ title, subtitle, icon: Icon, fetcher }: Props) {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [items, setItems] = useState<NekoPost[]>([])
  const [pagination, setPagination] = useState<NekoPagination>(EMPTY_PAGINATION)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Simpan fetcher di ref supaya arrow function dari parent tidak memicu
  // effect berulang setiap render.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetcherRef.current(page).then((res) => {
      if (cancelled) return
      setItems(res.items)
      setPagination(res.pagination)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [page])

  const changePage = (next: number) => {
    if (next < 1 || next > pagination.totalPages || next === page) return
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
          {Icon && <Icon size={22} className="text-ocean" aria-hidden="true" />} {title}
          <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold leading-none text-red-400">18+</span>
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
        )}
      </div>

      {loading ? (
        <div className="anime-grid">
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('neko.noResult')}
        </div>
      ) : (
        <div className="anime-grid">
          {items.map((item, i) => (
            <NekoPostCard key={`${item.slug}-${i}`} item={item} />
          ))}
        </div>
      )}

      <NekoPager
        page={pagination.currentPage}
        totalPages={pagination.totalPages}
        onChange={changePage}
        disabled={loading}
      />

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
    </div>
  )
}
