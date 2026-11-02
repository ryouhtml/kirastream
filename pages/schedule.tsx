import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar } from 'lucide-react'
import { fetchSchedule, type Anime } from '@/lib/api'
import AnimeMenuAside from '@/components/AnimeMenuAside'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Record<string, Anime[]>>({})
  const [loading, setLoading] = useState(true)
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await fetchSchedule()
        setSchedule(data)
      } catch (error) {
        console.error('Failed to load schedule:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [])

  const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']
  const imageProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`

  return (
    <>
      <Head>
        <title>{t('schedule.title')}</title>
      </Head>

      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0 space-y-8">
        <div>
          <h1 className="page-title flex items-center gap-2"><Calendar size={22} className="text-ocean" /> {t('schedule.heading')}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('schedule.subtitle')}</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="card p-6">
                <div className="skeleton h-6 w-32 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="skeleton h-32" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const dayAnimes = schedule[day] || []
              if (dayAnimes.length === 0) return null
              return (
                <div key={day} className="card p-6">
                  <h2 className="text-lg font-bold mb-4 capitalize flex items-center gap-2 text-[var(--color-text)]">
                    <span className="w-2 h-8 bg-[var(--color-accent)] rounded-full" />
                    {t('day.' + day)}
                    <span className="text-sm text-[var(--color-text-muted)] font-normal ml-2">
                      ({t('schedule.count').replace('{n}', String(dayAnimes.length))})
                    </span>
                  </h2>
                  <div className="anime-grid">
                    {dayAnimes.map((anime) => (
                      <Link key={anime.slug} href={`/anime/detail/${anime.slug}`} className="anime-card group">
                        <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)]">
                          <Image src={imageProxy(anime.image)} alt={anime.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                          {anime.episode && <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs text-center py-1">{t('schedule.episode').replace('{n}', anime.episode)}</div>}
                        </div>
                        <div className="p-2.5 min-h-[3.5rem] flex items-start">
                          <h3 className="text-xs font-semibold line-clamp-2 leading-tight text-[var(--color-text)]">{anime.title}</h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>

        <AnimeMenuAside />
      </div>
    </>
  )
}
