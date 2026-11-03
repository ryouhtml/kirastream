import Link from 'next/link'
import { useRouter } from 'next/router'
import { Home, Flame, PlayCircle, CheckCircle, Calendar, Tags, Clapperboard, BookOpen, ScrollText, BookMarked, CalendarClock, Package, Film, Sparkles, Shield, Compass, SlidersHorizontal } from 'lucide-react'
import AZList from './AZList'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const MENU_ITEMS = [
  { labelKey: 'nav.home', href: '/', icon: Home },
  { labelKey: 'section.popular', href: '/popular', icon: Flame },
  { labelKey: 'section.ongoing', href: '/ongoing', icon: PlayCircle },
  { labelKey: 'footer.completed', href: '/completed', icon: CheckCircle },
  { labelKey: 'footer.movies', href: '/movies', icon: Clapperboard },
  { labelKey: 'footer.schedule', href: '/schedule', icon: Calendar },
  { labelKey: 'footer.genres', href: '/genres', icon: Tags },
  { labelKey: 'ak.upcoming', href: '/upcoming', icon: CalendarClock },
  { labelKey: 'ak.batch', href: '/batch', icon: Package },
  { labelKey: 'ak.liveaction', href: '/live-action', icon: Film },
  { labelKey: 'ak.donghua', href: '/donghua', icon: Sparkles },
  { labelKey: 'ak.tokusatsu', href: '/tokusatsu', icon: Shield },
  { labelKey: 'ak.explore', href: '/explore', icon: Compass },
  { labelKey: 'ak.filter', href: '/filter', icon: SlidersHorizontal },
]

const OTHER_LINKS = [
  { labelKey: 'nav.manga', href: '/manga', icon: BookOpen },
  { labelKey: 'nav.webtoon', href: '/webtoon', icon: ScrollText },
  { labelKey: 'nav.novel', href: '/novel', icon: BookMarked },
]

export default function AnimeMenuAside() {
  const router = useRouter()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  return (
    <aside className="hidden xl:block w-64 shrink-0 space-y-4 sticky top-[calc(6rem+env(safe-area-inset-top))] self-start">
      {/* Menu Anime */}
      <div className="card p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clapperboard size={16} className="text-ocean" /> {t('menu.anime')}
        </h3>
        <div className="space-y-1">
          {MENU_ITEMS.map(({ labelKey, href, icon: Icon }) => {
            const active = href === '/' ? router.pathname === '/' : router.pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent'
                    : 'text-[var(--color-text-muted)] hover:bg-pearl/10 hover:text-primary dark:hover:text-accent'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {t(labelKey)}
              </Link>
            )
          })}
        </div>
      </div>

      {/* A-Z List */}
      <div className="card p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
          <Home size={16} className="text-ocean" /> {t('footer.azList')}
        </h3>
        <AZList compact />
      </div>

      {/* Komik & Lainnya */}
      <div className="card p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3">{t('menu.explore')}</h3>
        <div className="space-y-1">
          {OTHER_LINKS.map(({ labelKey, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-pearl/10 hover:text-primary dark:hover:text-accent transition-colors"
            >
              <Icon size={16} aria-hidden="true" />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
