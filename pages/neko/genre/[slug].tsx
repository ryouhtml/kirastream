import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Tag } from 'lucide-react'
import NekoArchive from '@/components/NekoArchive'
import NekoPageShell from '@/components/NekoPageShell'
import { fetchNekoByGenre, fetchNekoGenres, prettyNekoSlug } from '@/lib/neko'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

function NekoGenreContent() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [name, setName] = useState('')

  useEffect(() => {
    if (!slug) return
    setName(prettyNekoSlug(slug))
    let cancelled = false
    // Ambil nama genre yang rapi dari daftar genre (mis. "big-oppai" → "Big Oppai").
    fetchNekoGenres().then((list) => {
      if (cancelled) return
      const found = list.find((genre) => genre.slug === slug)
      if (found?.name) setName(found.name)
    })
    return () => { cancelled = true }
  }, [slug])

  if (!slug) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-44" />
        <div className="anime-grid">
          {[...Array(12)].map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
        </div>
      </div>
    )
  }

  const label = name || prettyNekoSlug(slug)

  return (
    <NekoArchive
      key={slug}
      title={label}
      subtitle={t('neko.genre.sub').replace('{name}', label)}
      icon={Tag}
      fetcher={(page) => fetchNekoByGenre(slug, page)}
    />
  )
}

export default function NekoGenrePage() {
  return (
    <NekoPageShell title="Genre">
      <NekoGenreContent />
    </NekoPageShell>
  )
}
