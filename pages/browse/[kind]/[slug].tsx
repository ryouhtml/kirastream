import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Tags } from 'lucide-react'
import CategoryPage from '@/components/CategoryPage'
import { fetchByGenre, fetchByStatus, fetchByOrder, fetchByType, fetchByStudio, fetchBySeason, fetchGenreDetail, type Anime } from '@/lib/api'

const FETCHERS: Record<string, (slug: string, page: number) => Promise<Anime[]>> = {
  genre: fetchByGenre,
  status: fetchByStatus,
  order: fetchByOrder,
  type: fetchByType,
  studio: fetchByStudio,
  season: (slug, page) => fetchBySeason(slug, undefined, page),
}

const pretty = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// /browse/{genre|status|order|type|studio|season}/:slug
export default function BrowsePage() {
  const router = useRouter()
  const kind = String(router.query.kind || '')
  const slug = String(router.query.slug || '')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    setDesc('')
    if (kind === 'genre' && slug) fetchGenreDetail(slug).then((g) => g && setDesc(g.description))
  }, [kind, slug])

  if (!router.isReady || !FETCHERS[kind]) return null
  const fetcher = FETCHERS[kind]

  return (
    <CategoryPage
      titleKey="ak.explore"
      title={`${pretty(kind)}: ${pretty(slug)}`}
      subtitle={desc}
      icon={Tags}
      fetcher={(p) => fetcher(slug, p)}
      deps={[kind, slug]}
    />
  )
}
