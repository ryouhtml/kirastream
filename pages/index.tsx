import { useEffect, useState, FormEvent } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { BookOpen, Clapperboard, ImageOff, ScrollText, Search, BookMarked } from 'lucide-react'
import AnimeGrid from '@/components/AnimeGrid'
import Section from '@/components/Section'
import LandscapeSpotlight from '@/components/LandscapeSpotlight'
import { fetchLatest, fetchPopular, fetchSchedule, fetchMALSeason, fetchCompleted } from '@/lib/api'
import type { Anime, MALAnime } from '@/lib/api'
import { motionTokens, adaptiveDuration } from '@/lib/motionTokens'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { useAnimationsEnabled } from '@/lib/hooks/useAnimations'

const MotionLink = motion(Link)

interface WebtoonItem {
  title: string
  thumbnail?: string
  url: string
}

interface HomeData {
  latest: Anime[]
  popular: Anime[]
  completed: Anime[]
  schedule: Record<string, Anime[]>
  malSeason: MALAnime[]
  webtoons: WebtoonItem[]
  completedWebtoons: WebtoonItem[]
}

function textStyle(muted = false) {
  return { color: muted ? 'var(--color-text-muted)' : 'var(--color-text)' }
}

export default function Home() {
  const router = useRouter()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [data, setData] = useState<HomeData>({ latest: [], popular: [], completed: [], schedule: {}, malSeason: [], webtoons: [], completedWebtoons: [] })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [latest, popular, completed, schedule, malSeason, webtoonRes, webtoonCompletedRes] = await Promise.allSettled([
          fetchLatest(),
          fetchPopular(),
          fetchCompleted(),
          fetchSchedule(),
          fetchMALSeason(),
          fetch('/api/webtoon?action=trending&day=trending').then((res) => res.json()),
          fetch('/api/webtoon?action=trending&day=completed').then((res) => res.json()),
        ])

        setData({
          latest: latest.status === 'fulfilled' ? latest.value : [],
          popular: popular.status === 'fulfilled' ? popular.value : [],
          completed: completed.status === 'fulfilled' ? completed.value : [],
          schedule: schedule.status === 'fulfilled' ? schedule.value : {},
          malSeason: malSeason.status === 'fulfilled' ? malSeason.value : [],
          webtoons: webtoonRes.status === 'fulfilled' ? webtoonRes.value.items || [] : [],
          completedWebtoons: webtoonCompletedRes.status === 'fulfilled' ? webtoonCompletedRes.value.items || [] : [],
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const reduce = useAnimationsEnabled()
  const heroStagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : 0.09,
        delayChildren: reduce ? 0 : 0.1,
      },
    },
  }
  const heroItem = {
    hidden: { opacity: 0, y: reduce ? 0 : motionTokens.distance.md },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: adaptiveDuration(motionTokens.duration.normal), ease: motionTokens.easing.smooth },
    },
  }

  const quickLinks = [
    { href: '/anime', label: t('nav.anime'), Icon: Clapperboard },
    { href: '/manga', label: t('nav.manga'), Icon: BookOpen },
    { href: '/webtoon', label: t('nav.webtoon'), Icon: ScrollText },
    { href: '/novel', label: t('nav.novel'), Icon: BookMarked },
  ]

  return (
    <>
      <Head>
        <title>KiraStream - Streaming Anime Subtitle Indonesia</title>
        <meta name="description" content="Streaming anime subtitle Indonesia dengan UI modern, manga, webtoon, dan jadwal rilis." />
      </Head>

      <div className="space-y-12 md:space-y-16">
        {/* Hero / Landing */}
        <section className="hero-panel relative overflow-hidden rounded-3xl border px-6 py-16 md:px-10 md:py-24">
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-br from-ocean/10 via-transparent to-accent/10 dark:from-ocean/15 dark:via-transparent dark:to-accent/15" />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/60 to-surface dark:from-noir/70 dark:via-noir/50 dark:to-noir" />
          </div>

          <motion.div
            className="relative z-10 flex flex-col items-center text-center"
            variants={heroStagger}
            initial={reduce ? false : 'hidden'}
            animate="visible"
          >
            <motion.span variants={heroItem} className="badge mb-5">{t('hero.badge')}</motion.span>

            <motion.h1
              variants={heroItem}
              className="text-5xl font-extrabold tracking-tighter md:text-7xl text-primary dark:text-[var(--color-text)]"
            >
              Kira<span className="text-ocean dark:text-accent">Stream</span>
            </motion.h1>

            <motion.p variants={heroItem} className="mt-5 max-w-2xl text-sm leading-7 md:text-base" style={textStyle(true)}>
              {t('hero.tagline')}
            </motion.p>

            {/* Search */}
            <motion.form variants={heroItem} onSubmit={handleSearch} className="mt-9 w-full max-w-xl">
              <div className="relative z-10">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  autoComplete="off"
                  aria-label={t('hero.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="input-field w-full appearance-none py-3.5 pl-12 pr-28 text-sm rounded-full [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                />
                <button type="submit" className="btn-primary absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2 text-xs rounded-full">
                  {t('nav.search')}
                </button>
              </div>
            </motion.form>

            {/* Quick category links */}
            <motion.div variants={heroItem} className="mt-9 grid w-full max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-4">
              {quickLinks.map(({ href, label, Icon }) => (
                <MotionLink
                  key={href}
                  href={href}
                  className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] bg-surface px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] dark:bg-surface-dark transition-colors hover:border-ocean hover:text-ocean dark:hover:border-accent dark:hover:text-accent"
                  whileHover={reduce ? undefined : { scale: 1.03 }}
                  whileTap={reduce ? undefined : { scale: 0.97 }}
                  transition={{ duration: adaptiveDuration(motionTokens.duration.fast), ease: motionTokens.easing.smooth }}
                >
                  <Icon size={16} className="text-ocean dark:text-accent" aria-hidden="true" />
                  {label}
                </MotionLink>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <Section title={t('section.latest')} jp="新着" viewAll="/ongoing">
          {loading ? <div className="anime-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div> : <AnimeGrid animes={data.latest.slice(0, 8)} />}
        </Section>

        {data.completed.length > 0 && (
          <Section title={t('section.completedAiring')} jp="完結" viewAll="/completed">
            {loading ? (
              <div className="skeleton min-h-[200px] rounded-3xl" />
            ) : (
              <LandscapeSpotlight
                kind="anime"
                title={data.completed[0].title}
                href={`/anime/${data.completed[0].slug}`}
                image={data.completed[0].image}
                imageProxy={(url) => `/api/mal-image?url=${encodeURIComponent(url)}`}
                score={data.completed[0].score}
                type={data.completed[0].type}
                episode={data.completed[0].episode}
                genres={data.completed[0].genres}
              />
            )}
          </Section>
        )}

        {data.completedWebtoons.length > 0 && (
          <Section title={t('section.finishedReading')} jp="読了" viewAll="/webtoon?day=completed">
            <div className="grid gap-4 sm:grid-cols-2">
              {data.completedWebtoons.slice(0, 2).map((item) => (
                <LandscapeSpotlight
                  key={item.url}
                  kind="comic"
                  title={item.title}
                  href={`/webtoon/${encodeURIComponent(item.url)}`}
                  image={item.thumbnail || ''}
                  imageProxy={(url) => `/api/proxy?url=${encodeURIComponent(url)}`}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title={t('section.popular')} jp="人気" viewAll="/popular">
          {loading ? <div className="anime-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div> : <AnimeGrid animes={data.popular.slice(0, 8)} />}
        </Section>

        <Section title={t('nav.webtoon')} jp="漫画" viewAll="/webtoon">
          {loading ? (
            <div className="anime-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>
          ) : data.webtoons.length === 0 ? (
            <div className="card p-5 text-sm" style={textStyle(true)}>{t('home.webtoonError')}</div>
          ) : (
            <div className="anime-grid">
              {data.webtoons.slice(0, 8).map((item) => (
                <MotionLink key={item.url} href={`/webtoon/${encodeURIComponent(item.url)}`} className="anime-card group"
                  whileHover={reduce ? undefined : { y: -4 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  transition={{ duration: adaptiveDuration(motionTokens.duration.fast), ease: motionTokens.easing.smooth }}
                >
                  <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)]">
                    {item.thumbnail ? (
                      <Image src={`/api/proxy?url=${encodeURIComponent(item.thumbnail || '')}`} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={textStyle(true)}>
                        <ImageOff size={20} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <h3 className="line-clamp-2 text-xs font-semibold sm:text-sm" style={textStyle()}>{item.title}</h3>
                  </div>
                </MotionLink>
              ))}
            </div>
          )}
        </Section>

        {Object.keys(data.schedule).length > 0 && (
          <Section title={t('section.schedule')} jp="放送予定" viewAll="/schedule">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(data.schedule).slice(0, 6).map(([day, animes]) => (
                <div key={day} className="card p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-bold capitalize" style={textStyle()}>{day}</h3>
                    <span className="text-xs font-semibold" style={textStyle(true)}>{animes.length} anime</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {animes.slice(0, 3).map((anime) => (
                      <MotionLink key={anime.slug} href={`/anime/${anime.slug}`} className="group"
                        whileHover={reduce ? undefined : { y: -4 }}
                        whileTap={reduce ? undefined : { scale: 0.98 }}
                        transition={{ duration: adaptiveDuration(motionTokens.duration.fast), ease: motionTokens.easing.smooth }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
                          <Image src={`/api/mal-image?url=${encodeURIComponent(anime.image || '')}`} alt={anime.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                          {anime.episode && <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-1 py-1 text-center text-xs font-bold text-white">Ep {anime.episode}</div>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-center text-xs font-medium" style={textStyle()}>{anime.title}</p>
                      </MotionLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {data.malSeason.length > 0 && (
          <Section title={t('section.seasonal')} jp="今期" viewAll="/seasonal">
            <div className="anime-grid">
              {data.malSeason.slice(0, 8).map((anime) => (
                <MotionLink key={anime.mal_id} href={`/mal/${anime.mal_id}`} className="anime-card group"
                  whileHover={reduce ? undefined : { y: -4 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  transition={{ duration: adaptiveDuration(motionTokens.duration.fast), ease: motionTokens.easing.smooth }}
                >
                  <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)]">
                    <Image src={`/api/mal-image?url=${encodeURIComponent(anime.images.jpg.large_image_url || anime.images.jpg.image_url || '')}`} alt={anime.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute right-2 top-2 rounded-full bg-primary/90 dark:bg-accent/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">{anime.score?.toFixed(1) || 'N/A'}</div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="truncate text-sm font-semibold" style={textStyle()}>{anime.title}</h3>
                  </div>
                </MotionLink>
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  )
}
