import { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'
import TopNavbar from './TopNavbar'
import Footer from './Footer'
import MobileNav from './MobileNav'
import InstallPwaPrompt from './InstallPwaPrompt'
import { motionTokens, adaptiveDuration } from '@/lib/motionTokens'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const appShell = (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t('a11y.skipToContent')}
      </a>
      <TopNavbar />
      <main id="main-content" className="flex-1 pt-[calc(5rem+env(safe-area-inset-top))] md:pt-[calc(6rem+env(safe-area-inset-top))] scroll-mt-[calc(5rem+env(safe-area-inset-top))] md:scroll-mt-[calc(6rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 pb-24 lg:pb-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={router.asPath}
              initial={{ opacity: 0, y: motionTokens.distance.sm }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: motionTokens.distance.sm }}
              transition={{ duration: adaptiveDuration(motionTokens.duration.normal), ease: motionTokens.easing.smooth }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
      <MobileNav />
      <InstallPwaPrompt />
    </>
  )

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-[var(--color-text)] transition-colors duration-300 flex flex-col">
      {appShell}
    </div>
  )
}
