// ─── NEKO AGE GATE (18+) ─────────────────────────────────────
// Gerbang konfirmasi sebelum konten Nekopoi ditampilkan. Anak (children)
// tidak di-mount sebelum user menekan "Ya", jadi request ke API Neko juga
// tidak jalan sebelum konfirmasi.
//
// Konfirmasi disimpan di sessionStorage supaya pindah antar halaman Neko
// tidak bertanya terus. Tombol menu "Neko" memanggil resetNekoAgeGate()
// agar setiap kali masuk dari menu konfirmasi tetap muncul.

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import { ShieldAlert } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

export const NEKO_AGE_KEY = 'kira-neko-age-ok'

export function resetNekoAgeGate() {
  try {
    sessionStorage.removeItem(NEKO_AGE_KEY)
  } catch {
    /* storage bisa diblokir — abaikan */
  }
}

export default function NekoAgeGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    try {
      setAllowed(sessionStorage.getItem(NEKO_AGE_KEY) === '1')
    } catch {
      setAllowed(false)
    }
    setReady(true)
  }, [])

  const confirm = () => {
    try {
      sessionStorage.setItem(NEKO_AGE_KEY, '1')
    } catch {
      /* tetap izinkan untuk sesi ini */
    }
    setAllowed(true)
  }

  const deny = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (allowed) return <>{children}</>

  return (
    <div className="flex justify-center py-10">
      <div
        className="card w-full max-w-lg p-6 sm:p-8 text-center space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="neko-age-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <ShieldAlert size={28} className="text-red-400" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-red-400">18+</p>
          <h1 id="neko-age-title" className="text-xl font-bold">{t('neko.gate.title')}</h1>
        </div>

        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {t('neko.gate.question')}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {t('neko.gate.note')}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button type="button" onClick={confirm} className="btn-primary flex-1">
            {t('neko.gate.yes')}
          </button>
          <button type="button" onClick={deny} className="btn-secondary flex-1">
            {t('neko.gate.no')}
          </button>
        </div>
      </div>
    </div>
  )
}
