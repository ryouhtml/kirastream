// components/AnimeGrid.tsx
import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { fetchTooltip, type Anime, type AnimeTooltip } from '@/lib/api'
import { staggerContainer, staggerItem } from './motionVariants'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { motionTokens, adaptiveDuration } from '@/lib/motionTokens'
import { useAnimationsEnabled } from '@/lib/hooks/useAnimations'

// Helper untuk proxy gambar
const imageProxy = (url: string) => `/api/mal-image?url=${encodeURIComponent(url)}`

const MotionLink = motion(Link)

// Cache tooltip per slug agar tidak fetch berulang
const tooltipCache = new Map<string, AnimeTooltip | null>()

function useTooltip(slug: string) {
  const [tip, setTip] = useState<AnimeTooltip | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const show = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    clearTimeout(timer.current)
    // Delay singkat agar tidak fetch saat kursor sekadar lewat
    timer.current = setTimeout(async () => {
      if (!tooltipCache.has(slug)) tooltipCache.set(slug, await fetchTooltip(slug))
      const data = tooltipCache.get(slug) || null
      if (!data) return
      setTip(data)
      setPos({ x: Math.min(r.right + 8, window.innerWidth - 280), y: Math.max(8, Math.min(r.top, window.innerHeight - 200)) })
    }, 400)
  }
  const hide = () => { clearTimeout(timer.current); setTip(null); setPos(null) }
  return { tip, pos, show, hide }
}

const AnimeCard = ({ anime }: { anime: Anime }) => {
  const { language } = useSettings()
  const reduce = useAnimationsEnabled()
  const t = (key: string) => translate(language, key)
  const { tip, pos, show, hide } = useTooltip(anime.slug)
  return (
    <motion.div variants={staggerItem} onMouseEnter={show} onMouseLeave={hide}>
      <MotionLink
        href={`/anime/detail/${anime.slug}`}
        className="anime-card group block"
        whileHover={reduce ? undefined : { y: -4 }}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        transition={{ duration: adaptiveDuration(motionTokens.duration.fast), ease: motionTokens.easing.smooth }}
      >
        <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)] overflow-hidden">
          <Image
            src={imageProxy(anime.image)}
            alt={anime.title}
            fill
            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {anime.episode && (
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              {t('grid.episode').replace('{n}', anime.episode)}
            </div>
          )}        </div>
        <div className="p-2.5">
          <h3 className="line-clamp-2 text-xs font-semibold sm:text-sm" style={{ color: 'var(--color-text)' }}>
            {anime.title}
          </h3>
        </div>
      </MotionLink>
      {tip && pos && (
        <div
          role="tooltip"
          className="hidden md:block fixed z-50 w-64 card p-3 shadow-lg pointer-events-none"
          style={{ left: pos.x, top: pos.y }}
        >
          <p className="font-semibold text-sm text-[var(--color-text)] line-clamp-2">{tip.title}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {[tip.type, tip.status, tip.score && `★ ${tip.score}`, tip.episodes && `${tip.episodes} eps`].filter(Boolean).join(' · ')}
          </p>
          {tip.genres && tip.genres.length > 0 && <p className="text-xs text-ocean mt-1 line-clamp-1">{tip.genres.join(', ')}</p>}
          {tip.synopsis && <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-5">{tip.synopsis}</p>}
        </div>
      )}
    </motion.div>
  )
}

export default function AnimeGrid({ animes }: { animes: Anime[] }) {
  const reduce = useAnimationsEnabled()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  if (!animes || animes.length === 0) {
    return <div className="card p-5 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('grid.noAnime')}</div>
  }

  return (
    <motion.div
      className="anime-grid"
      variants={staggerContainer}
      initial={reduce ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {animes.map((anime) => (
        <AnimeCard key={anime.slug} anime={anime} />
      ))}
    </motion.div>
  )
}
