import Head from 'next/head'
import { Palette, Sparkles, Languages, MoveVertical, Settings as SettingsIcon, Check } from 'lucide-react'
import { ACCENT_COLORS, AccentKey, useSettings } from '@/contexts/SettingsContext'
import { LANGUAGES, translate } from '@/lib/i18n'

const ACCENTS: AccentKey[] = ['blue', 'violet', 'emerald', 'rose', 'amber', 'cyan']
const SCROLL_DISTANCES = [25, 50, 75, 90, 100]

function SectionCard({
  icon,
  title,
  desc,
  badge,
  children,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card relative p-6">
      {badge && <div className="absolute top-4 right-4">{badge}</div>}
      <div className={`flex items-start gap-3 mb-5 ${badge ? 'pr-16' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-ocean/10 text-ocean flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-[var(--color-text)]">{title}</h2>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {desc}
          </p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function SettingsPage() {
  const {
    accent,
    animations,
    language,
    readerScrollDistance,
    setAccent,
    setAnimations,
    setLanguage,
    setReaderScrollDistance,
  } = useSettings()
  const t = (key: string) => translate(language, key)

  return (
    <>
      <Head>
        <title>{t('settings.title')} - KiraStream</title>
      </Head>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="page-title flex items-center gap-2">
            <SettingsIcon size={22} className="text-ocean" aria-hidden="true" /> {t('settings.title')}
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('settings.subtitle')}
        </p>

        <SectionCard
          icon={<Palette size={20} aria-hidden="true" />}
          title={t('settings.accent')}
          desc={t('settings.accentDesc')}
        >
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ACCENTS.map((key) => {
              const selected = accent === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccent(key)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary dark:border-accent dark:bg-accent/15 dark:text-accent'
                      : 'border-pearl/10 bg-pearl/[0.03] text-[var(--color-text-muted)] hover:border-ocean/40'
                  }`}
                >
                  <span
                    className="w-9 h-9 rounded-full border-2 border-pearl/20 shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: ACCENT_COLORS[key] }}
                  >
                    {selected && <Check size={18} className="text-white" aria-hidden="true" />}
                  </span>
                  <span className="text-xs font-semibold">{t(`accent.${key}`)}</span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon={<Sparkles size={20} aria-hidden="true" />}
          title={t('settings.animation')}
          desc={t('settings.animationDesc')}
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {animations ? t('settings.on') : t('settings.off')}
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={animations}
              aria-label={t('settings.animation')}
              onClick={() => setAnimations(!animations)}
              className={`relative h-8 w-14 shrink-0 rounded-full p-0 transition-colors ${
                animations ? 'bg-ocean' : 'bg-pearl/20'
              }`}
            >
              <span
                className={`absolute top-1 left-1 block h-6 w-6 aspect-square rounded-full bg-white shadow transition-transform ${
                  animations ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Languages size={20} aria-hidden="true" />}
          title={t('settings.language')}
          desc={t('settings.languageDesc')}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {LANGUAGES.map((lang) => {
              const selected = language === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  aria-pressed={selected}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary dark:border-accent dark:bg-accent/15 dark:text-accent'
                      : 'border-pearl/10 bg-pearl/[0.03] text-[var(--color-text-muted)] hover:border-ocean/40'
                  }`}
                >
                  <span className="text-sm font-semibold text-[var(--color-text)]">{lang.nativeName}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {lang.englishName}
                  </span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          icon={<MoveVertical size={20} aria-hidden="true" />}
          title={t('settings.readerScroll')}
          desc={t('settings.readerScrollDesc')}
        >
          <div className="grid grid-cols-5 gap-2 max-w-md">
            {SCROLL_DISTANCES.map((value) => {
              const selected = readerScrollDistance === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReaderScrollDistance(value)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary dark:border-accent dark:bg-accent/15 dark:text-accent'
                      : 'border-pearl/10 bg-pearl/[0.03] text-[var(--color-text-muted)] hover:border-ocean/40'
                  }`}
                >
                  <span className="text-sm font-semibold">{t('settings.percent').replace('{n}', String(value))}</span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <Check size={14} className="text-ocean" aria-hidden="true" /> {t('settings.saved')}
        </p>
      </div>
    </>
  )
}
