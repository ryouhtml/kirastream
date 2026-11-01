import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { LanguageCode, getLanguageMeta } from '@/lib/i18n'

export type AccentKey = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan'

export interface Settings {
  accent: AccentKey
  animations: boolean
  language: LanguageCode
  readerScrollDistance: number
}

interface SettingsContextType extends Settings {
  setAccent: (accent: AccentKey) => void
  setAnimations: (animations: boolean) => void
  setLanguage: (language: LanguageCode) => void
  setReaderScrollDistance: (distance: number) => void
}

export const ACCENT_COLORS: Record<AccentKey, string> = {
  blue: '#0071E3',
  violet: '#7C3AED',
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706',
  cyan: '#0891B2',
}

const STORAGE_KEY = 'kiranime-settings'

export const DEFAULT_SETTINGS: Settings = {
  accent: 'blue',
  animations: true,
  language: 'id',
  readerScrollDistance: 90,
}

export function clampScrollDistance(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.readerScrollDistance
  return Math.min(100, Math.max(10, Math.round(n)))
}

function readStoredSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      accent: (parsed.accent as AccentKey) ?? DEFAULT_SETTINGS.accent,
      animations:
        typeof parsed.animations === 'boolean' ? parsed.animations : DEFAULT_SETTINGS.animations,
      language: (parsed.language as LanguageCode) ?? DEFAULT_SETTINGS.language,
      readerScrollDistance: clampScrollDistance(parsed.readerScrollDistance),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applySettingsToDocument(settings: Settings) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-accent', settings.accent)
  root.setAttribute('data-animations', settings.animations ? 'on' : 'off')
  root.lang = settings.language
  root.dir = getLanguageMeta(settings.language).dir
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(readStoredSettings())
  }, [])

  useEffect(() => {
    applySettingsToDocument(settings)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable (e.g. private mode) — ignore
    }
  }, [settings])

  const setAccent = (accent: AccentKey) => setSettings((s) => ({ ...s, accent }))
  const setAnimations = (animations: boolean) => setSettings((s) => ({ ...s, animations }))
  const setLanguage = (language: LanguageCode) => setSettings((s) => ({ ...s, language }))
  const setReaderScrollDistance = (readerScrollDistance: number) =>
    setSettings((s) => ({ ...s, readerScrollDistance: clampScrollDistance(readerScrollDistance) }))

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setAccent,
        setAnimations,
        setLanguage,
        setReaderScrollDistance,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
