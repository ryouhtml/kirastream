import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, Tags } from 'lucide-react'
import NekoPageShell from '@/components/NekoPageShell'
import { fetchNekoGenres, type NekoGenre } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const CATEGORY_LINKS = [
  { slug: '3d-hentai', labelKey: 'neko.category.3d-hentai' },
  { slug: 'jav-cosplay', labelKey: 'neko.category.jav-cosplay' },
]

function NekoGenresContent() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [genres, setGenres] = useState<NekoGenre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchNekoGenres().then((list) => {
      if (cancelled) return
      setGenres(list)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <Link href="/neko" className="inline-flex items-center gap-1 text-sm text-ocean">
        <ArrowLeft size={14} aria-hidden="true" /> {t('neko.backHome')}
      </Link>

      <div>
        <h1 className="page-title flex items-center gap-2">
          <Tags size={22} className="text-ocean" aria-hidden="true" /> {t('neko.genres')}
          <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold leading-none text-red-400">18+</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.genres.sub')}</p>
      </div>

      <div className="card p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-wrap gap-2">
            {[...Array(24)].map((_, i) => <div key={i} className="skeleton h-8 w-24" />)}
          </div>
        ) : genres.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('neko.noResult')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link
                key={genre.slug}
                href={`/neko/genre/${encodeURIComponent(genre.slug)}`}
                className="tag"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <FolderOpen size={20} aria-hidden="true" /> {t('neko.categories')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_LINKS.map((category) => (
            <Link
              key={category.slug}
              href={`/neko/category/${encodeURIComponent(category.slug)}`}
              className="tag"
            >
              {t(category.labelKey)}
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t('neko.externalNote')}</p>
    </div>
  )
}

export default function NekoGenresPage() {
  return (
    <NekoPageShell title="Genre">
      <NekoGenresContent />
    </NekoPageShell>
  )
}
