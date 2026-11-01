import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Home, Clapperboard, BookOpen, ScrollText, BookMarked, User } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { motionTokens, adaptiveDuration } from '@/lib/motionTokens'
import { useAnimationsEnabled } from '@/lib/hooks/useAnimations'

const MotionLink = motion.create(Link)

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: motionTokens.distance.sm },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: adaptiveDuration(motionTokens.duration.normal),
      ease: motionTokens.easing.smooth,
    },
  },
}

export default function MobileNav() {
  const router = useRouter()
  const { language } = useSettings()
  const reduce = useAnimationsEnabled()
  const t = (key: string) => translate(language, key)

  const ITEMS = [
    { label: t('nav.home'), href: '/', icon: Home },
    { label: t('nav.anime'), href: '/anime', icon: Clapperboard },
    { label: t('nav.manga'), href: '/manga', icon: BookOpen },
    { label: t('nav.webtoon'), href: '/webtoon', icon: ScrollText },
    { label: t('nav.novel'), href: '/novel', icon: BookMarked },
    { label: t('nav.profile'), href: '/profile', icon: User },
  ]

  const isActive = (href: string) => {
    if (href === '/') return router.pathname === '/'
    return router.pathname === href || router.pathname.startsWith(`${href}/`)
  }

  return (
    <nav
      className="site-mobile-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/90 dark:bg-surface-dark/90 backdrop-blur-md border-t border-pearl/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label={t('a11y.bottomNav')}
    >
      <motion.div
        className="grid grid-cols-6"
        initial={reduce ? false : 'hidden'}
        animate={reduce ? false : 'visible'}
        variants={containerVariants}
      >
        {ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <MotionLink
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? 'text-primary dark:text-accent' : 'text-[var(--color-text-muted)]'
              }`}
              variants={itemVariants}
              {...(reduce
                ? {}
                : {
                    whileTap: { scale: 0.9 },
                    whileHover: { scale: 1.06 },
                    transition: {
                      duration: adaptiveDuration(motionTokens.duration.fast),
                      ease: motionTokens.easing.smooth,
                    },
                  })}
            >
              {active && (
                <motion.div
                  layoutId={reduce ? undefined : 'mobile-nav-active'}
                  className="pointer-events-none absolute inset-0 rounded-lg bg-primary/10 dark:bg-accent/15"
                  aria-hidden="true"
                  transition={
                    reduce ? undefined : { type: 'spring', stiffness: 400, damping: 30 }
                  }
                />
              )}
              <Icon size={20} className={active ? 'scale-110' : ''} aria-hidden="true" />
              {label}
            </MotionLink>
          )
        })}
      </motion.div>
    </nav>
  )
}
