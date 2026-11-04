// ─── EMBED PLAYER ────────────────────────────────────────────
// iframe embed tidak memicu event `error`, dan kalau navigasinya gagal
// browser justru menampilkan halaman error-nya sendiri lalu tetap memicu
// `load`. Jadi status server dicek lewat probe `fetch` no-cors: kalau
// jaringan/ISP memblokir host tersebut, probe gagal dan parent bisa
// pindah ke server berikutnya.

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ExternalLink, RotateCw } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

const LOAD_TIMEOUT = 8000

type Reachability = 'ok' | 'blocked' | 'unknown'

// `unknown` dipakai kalau probe diblokir CSP situs ini sendiri (bukan oleh
// jaringan), supaya player tidak salah menandai semua server gagal.
async function checkReachability(url: string, signal: AbortSignal): Promise<Reachability> {
  let cspBlocked = false
  const onViolation = (event: SecurityPolicyViolationEvent) => {
    if (event.violatedDirective?.includes('connect-src')) cspBlocked = true
  }
  document.addEventListener('securitypolicyviolation', onViolation)
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', redirect: 'follow', signal })
    return 'ok'
  } catch {
    return cspBlocked ? 'unknown' : 'blocked'
  } finally {
    document.removeEventListener('securitypolicyviolation', onViolation)
  }
}

interface Props {
  url: string
  title?: string
  /** Dipanggil sekali per percobaan saat server tidak bisa dijangkau. */
  onUnreachable?: () => void
}

export default function EmbedPlayer({ url, title, onUnreachable }: Props) {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [attempt, setAttempt] = useState(0)

  // Callback disimpan di ref supaya perubahan identitas fungsi dari parent
  // tidak memicu effect berulang.
  const onUnreachableRef = useRef(onUnreachable)
  onUnreachableRef.current = onUnreachable
  const reportedRef = useRef('')

  useEffect(() => {
    setStatus('loading')
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), LOAD_TIMEOUT)
    let cancelled = false

    checkReachability(url, controller.signal).then((result) => {
      if (cancelled) return
      setStatus(result === 'blocked' ? 'failed' : 'ready')
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [url, attempt])

  useEffect(() => {
    if (status !== 'failed') return
    const key = `${url}#${attempt}`
    if (reportedRef.current === key) return
    reportedRef.current = key
    onUnreachableRef.current?.()
  }, [status, url, attempt])

  return (
    <div className="mb-4">
      <div className="video-container">
        <iframe
          key={`${url}#${attempt}`}
          src={url}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          // Batasi kemampuan halaman embed: tanpa akses ke parent/top,
          // tanpa form/popup, dan referer tidak dikirim.
          sandbox="allow-scripts allow-same-origin allow-presentation allow-orientation-lock"
          referrerPolicy="no-referrer"
          frameBorder="0"
          title={title || 'Video'}
        />

        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
          </div>
        )}

        {status === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface-alt)] p-4 text-center">
            <AlertTriangle size={24} className="text-amber-400" aria-hidden="true" />
            <p className="max-w-md text-sm" style={{ color: 'var(--color-text)' }}>{t('player.blocked')}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <RotateCw size={14} aria-hidden="true" /> {t('player.retry')}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                <ExternalLink size={14} aria-hidden="true" /> {t('player.openTab')}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Jalur keluar kalau player memblokir embedding tanpa error jaringan. */}
      <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {t('player.trouble')}{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ocean"
        >
          {t('player.openTab')}
        </a>
      </p>
    </div>
  )
}
