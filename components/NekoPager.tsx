import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
  disabled?: boolean
}

/** Navigasi halaman sederhana untuk daftar Neko. */
export default function NekoPager({ page, totalPages, onChange, disabled }: Props) {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  if (totalPages <= 1) return null

  const prevDisabled = disabled || page <= 1
  const nextDisabled = disabled || page >= totalPages

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={prevDisabled}
        className="btn-secondary inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" /> {t('neko.prev')}
      </button>

      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {t('neko.page')
          .replace('{page}', String(page))
          .replace('{total}', String(totalPages))}
      </span>

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={nextDisabled}
        className="btn-secondary inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('neko.next')} <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
