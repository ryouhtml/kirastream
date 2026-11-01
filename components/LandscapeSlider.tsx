import { useEffect, useState, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LandscapeSpotlight, { type SpotlightItem } from './LandscapeSpotlight'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { useAnimationsEnabled } from '@/lib/hooks/useAnimations'

interface LandscapeSliderProps {
  kind: 'anime' | 'comic'
  items: SpotlightItem[]
  imageProxy: (url: string) => string
  interval?: number
}

export default function LandscapeSlider({ items, imageProxy, interval = 2000 }: LandscapeSliderProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useAnimationsEnabled()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const goTo = useCallback((i: number) => {
    setIndex(((i % items.length) + items.length) % items.length)
  }, [items.length])

  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const next = useCallback(() => goTo(index + 1), [goTo, index])

  useEffect(() => {
    if (items.length <= 1 || paused || reduceMotion) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [items.length, paused, reduceMotion, interval])

  const gesture = useRef({
    x0: 0,
    y0: 0,
    lastX: 0,
    lastT: 0,
    active: false,
    swiping: false,
  })

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    const g = gesture.current
    g.x0 = g.lastX = e.clientX
    g.y0 = e.clientY
    g.lastT = performance.now()
    g.active = true
    g.swiping = false
    e.currentTarget.setPointerCapture(e.pointerId)
    setPaused(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g.active) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    if (!g.swiping && Math.hypot(dx, dy) > 10) {
      if (Math.abs(dx) > Math.abs(dy)) {
        g.swiping = true
      } else {
        g.active = false
      }
    }
    g.lastX = e.clientX
    g.lastT = performance.now()
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (g.swiping) {
      const dx = e.clientX - g.x0
      const vx = (e.clientX - g.lastX) / Math.max(1, performance.now() - g.lastT)
      if (dx > 40) {
        prev()
      } else if (dx < -40) {
        next()
      } else if (Math.abs(vx) > 0.4) {
        if (vx > 0) prev()
        else next()
      }
    }
    g.active = false
    g.swiping = false
    setPaused(false)
  }

  if (items.length === 0) return null

  const item = items[index]

  return (
    <div
      className="relative group select-none touch-pan-y"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <LandscapeSpotlight {...item} imageProxy={imageProxy} />
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <>
          {/* Prev / Next */}
          <button
            onClick={prev}
            aria-label={t('slider.previous')}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/20 hover:bg-black/75 hover:scale-105 focus-visible:opacity-100 transition-[opacity,transform,background-color] opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            onClick={next}
            aria-label={t('slider.next')}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white border border-white/20 hover:bg-black/75 hover:scale-105 focus-visible:opacity-100 transition-[opacity,transform,background-color] opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-5 z-20 flex items-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={t('slider.slideAria').replace('{n}', String(i + 1))}
                aria-current={i === index}
                className={`p-2 -m-2 flex items-center transition-[width,background-color] duration-300 ${
                  i === index ? 'w-6' : 'w-1.5'
                }`}
              >
                <span
                  className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                    i === index ? 'bg-white' : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
