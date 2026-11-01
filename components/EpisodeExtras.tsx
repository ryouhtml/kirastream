import { useEffect, useState } from 'react'
import { MessageSquare, SmilePlus, Zap } from 'lucide-react'
import { fetchEpisodeComments, fetchEpisodeReactions, fetchEpisodeDanmaku, type EpisodeComment, type DanmakuItem } from '@/lib/api'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'

type Tab = 'comments' | 'reactions' | 'danmaku'

function Comment({ c, depth = 0 }: { c: EpisodeComment; depth?: number }) {
  return (
    <div className={depth ? 'ml-6 border-l border-[var(--color-border)] pl-3' : ''}>
      <div className="bg-surface-dark rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-[var(--color-text)]">{c.author}</span>
          {c.date && <span className="text-xs text-[var(--color-text-muted)]">{c.date}</span>}
        </div>
        <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-line break-words">{c.content}</p>
      </div>
      {c.replies?.map((r) => <div key={r.id} className="mt-2"><Comment c={r} depth={depth + 1} /></div>)}
    </div>
  )
}

// Komentar, reaksi, dan danmaku untuk satu episode
export default function EpisodeExtras({ episodeSlug }: { episodeSlug: string }) {
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [tab, setTab] = useState<Tab>('comments')
  const [comments, setComments] = useState<EpisodeComment[] | null>(null)
  const [reactions, setReactions] = useState<{ label: string; count: number }[] | null>(null)
  const [danmaku, setDanmaku] = useState<DanmakuItem[] | null>(null)

  useEffect(() => { setComments(null); setReactions(null); setDanmaku(null) }, [episodeSlug])

  // Muat data tab aktif saat dibutuhkan
  useEffect(() => {
    if (tab === 'comments' && comments === null) fetchEpisodeComments(episodeSlug).then(setComments)
    if (tab === 'reactions' && reactions === null) fetchEpisodeReactions(episodeSlug).then(setReactions)
    if (tab === 'danmaku' && danmaku === null) fetchEpisodeDanmaku(episodeSlug).then(setDanmaku)
  }, [tab, episodeSlug, comments, reactions, danmaku])

  const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
    { id: 'comments', label: t('ak.comments'), icon: MessageSquare },
    { id: 'reactions', label: t('ak.reactions'), icon: SmilePlus },
    { id: 'danmaku', label: t('ak.danmaku'), icon: Zap },
  ]
  const data = tab === 'comments' ? comments : tab === 'reactions' ? reactions : danmaku

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 mb-3" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-ocean text-white' : 'bg-surface-dark text-[var(--color-text-muted)] hover:bg-surface-hover'}`}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      {data === null ? (
        <div className="py-6 text-center"><div className="w-6 h-6 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto" /></div>
      ) : data.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] py-3">{t('ak.noData')}</p>
      ) : tab === 'comments' ? (
        <div className="space-y-3 max-h-96 overflow-auto">{comments!.map((c) => <Comment key={c.id} c={c} />)}</div>
      ) : tab === 'reactions' ? (
        <div className="flex flex-wrap gap-2">
          {reactions!.map((r) => (
            <span key={r.label} className="px-3 py-1.5 rounded-full bg-surface-dark text-sm text-[var(--color-text)]">
              {r.label} <span className="ml-1 font-semibold">{r.count}</span>
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-1 max-h-72 overflow-auto">
          {danmaku!.map((d, i) => (
            <li key={i} className="text-sm text-[var(--color-text-muted)] bg-surface-dark rounded px-3 py-1.5 break-words" style={d.color ? { color: d.color } : undefined}>
              {d.time != null && <span className="mr-2 text-xs opacity-60">{Math.floor(d.time / 60)}:{String(Math.floor(d.time % 60)).padStart(2, '0')}</span>}
              {d.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
