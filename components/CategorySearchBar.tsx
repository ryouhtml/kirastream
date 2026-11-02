import { useState, useEffect, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Search } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import { fetchSearchSuggest } from '@/lib/api'

interface CategorySearchBarProps {
  type: 'anime' | 'manga' | 'webtoon' | 'novel'
  placeholder?: string
  className?: string
}

export default function CategorySearchBar({ type, placeholder, className }: CategorySearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const fallbackPlaceholder = t('searchbar.placeholder')
  const [suggestions, setSuggestions] = useState<{ title: string; slug: string; image?: string; kind: 'anime' | 'episode' }[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLFormElement>(null)

  // Autocomplete (anime & episode) — hanya untuk pencarian anime, dengan debounce
  useEffect(() => {
    if (type !== 'anime' || query.trim().length < 2) { setSuggestions([]); return }
    let cancelled = false
    const id = setTimeout(async () => {
      const list = await fetchSearchSuggest(query)
      if (!cancelled) { setSuggestions(list); setOpen(list.length > 0) }
    }, 300)
    return () => { cancelled = true; clearTimeout(id) }
  }, [query, type])

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}&type=${type}`)
    }
  }

  return (
    <form ref={boxRef} onSubmit={handleSubmit} className={`relative w-full sm:w-72 shrink-0 ${className || ''}`}>
      <input
        type="search"
        name="q"
        autoComplete="off"
        aria-label={placeholder?.replace(/\u2026$/, '') || t('searchbar.searchTitle')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || fallbackPlaceholder}
        className="input-field py-2.5 pr-11 text-sm"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-ocean hover:bg-oceanAccent-secondary rounded-full transition-colors"
        aria-label={t('search.submit')}
      >
        <Search size={14} className="text-white" aria-hidden="true" />
      </button>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-50 card p-1 max-h-80 overflow-auto shadow-lg" role="listbox">
          {suggestions.map((s) => (
            <li key={`${s.kind}-${s.slug}`}>
              <Link
                href={s.kind === 'anime' ? `/anime/detail/${s.slug}` : `/search?q=${encodeURIComponent(s.title)}&type=anime`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-text)] hover:bg-pearl/10"
              >
                <span className="line-clamp-1">{s.title}</span>
                {s.kind === 'episode' && <span className="text-[10px] uppercase opacity-60 shrink-0">{t('ak.suggest.episode')}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
