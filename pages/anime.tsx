import { useEffect, useState } from 'react'
import Head from 'next/head'
import { PlayCircle } from 'lucide-react'
import AnimeGrid from '@/components/AnimeGrid'
import Section from '@/components/Section'
import LandscapeSlider from '@/components/LandscapeSlider'
import LandscapeSpotlight from '@/components/LandscapeSpotlight'
import CategorySearchBar from '@/components/CategorySearchBar'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import { fetchLatest, fetchPopular, fetchCompleted, type Anime } from '@/lib/api'
import type { SpotlightItem } from '@/components/LandscapeSpotlight'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const imageProxy = (url: string) => `/api/mal-image?url=${encodeURIComponent(url)}`

function toSpotlight(anime: Anime): SpotlightItem {
  return {
    kind: 'anime',
    title: anime.title,
    href: `/anime/detail/${anime.slug}`,
    image: anime.image,
    score: anime.score,
    type: anime.type,
    episode: anime.episode,
    genres: anime.genres,
  }
}

export default function AnimeHomePage() {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [latest, setLatest] = useState<Anime[]>([])
  const [popular, setPopular] = useState<Anime[]>([])
  const [completed, setCompleted] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([fetchLatest(), fetchPopular(), fetchCompleted()]).then(([l, p, c]) => {
      if (cancelled) return
      setLatest(l.status === 'fulfilled' ? l.value : [])
      setPopular(p.status === 'fulfilled' ? p.value : [])
      setCompleted(c.status === 'fulfilled' ? c.value : [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const spotlightPool = [...popular, ...latest].filter(
    (a, i, arr) => arr.findIndex((x) => x.slug === a.slug) === i
  )
  const slides = spotlightPool.slice(0, 6).map(toSpotlight)

  return (
    <>
      <Head><title>Anime - KiraStream</title></Head>
      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-12 md:space-y-16">
          {/* Header + Search */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="page-title flex items-center gap-2">
                <PlayCircle size={24} className="text-ocean" aria-hidden="true" /> Anime
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {t('page.anime.subtitle')}
              </p>
            </div>
            <CategorySearchBar type="anime" placeholder={t('hero.searchPlaceholder')} />
          </div>

          {/* Slider geser */}
          {loading ? (
            <div className="skeleton min-h-[220px] rounded-3xl" />
          ) : slides.length > 0 ? (
            <LandscapeSlider kind="anime" items={slides} imageProxy={imageProxy} />
          ) : null}

          <Section title={t('section.ongoing')} jp="放送中" viewAll="/ongoing">
            {loading
              ? <div className="anime-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>
              : <AnimeGrid animes={latest.slice(0, 8)} />}
          </Section>

          <Section title={t('section.popular')} jp="人気" viewAll="/popular">
            {loading
              ? <div className="anime-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>
              : <AnimeGrid animes={popular.slice(0, 8)} />}
          </Section>

          {!loading && completed.length > 0 && (
            <Section title={t('section.completedAiring')} jp="完結" viewAll="/completed">
              <div className="grid gap-4 md:grid-cols-2">
                {completed.slice(0, 2).map((a) => (
                  <LandscapeSpotlight key={a.slug} {...toSpotlight(a)} imageProxy={imageProxy} />
                ))}
              </div>
            </Section>
          )}
        </div>

        <AnimeMenuAside />
      </div>
    </>
  )
}
