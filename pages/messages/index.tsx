import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getConversations, getUsersByIds, formatMessageTime, type Conversation } from '@/lib/social'
import { translate } from '@/lib/i18n'

interface ConvWithUser extends Conversation {
  otherUid: string
  otherName: string
  otherPhoto: string | null
}

export default function MessagesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [convs, setConvs] = useState<ConvWithUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    setLoading(true)
    getConversations().then(async (list) => {
      const otherUids = list
        .map((c) => (c.memberIds || []).find((p) => p !== user.uid) || '')
        .filter(Boolean)
      // Satu batch read untuk semua lawan bicara, bukan N+1.
      const users = await getUsersByIds(otherUids)
      const byId = new Map(users.map((u) => [u.uid, u]))

      const enriched: ConvWithUser[] = list.map((c) => {
        const otherUid = (c.memberIds || []).find((p) => p !== user.uid) || ''
        const other = byId.get(otherUid)
        return {
          ...c,
          otherUid,
          otherName: other?.displayName || 'KiraFan',
          otherPhoto: other?.photoURL || null,
        }
      })
      setConvs(enriched)
      setLoading(false)
    })
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Head><title>{t('messages.title')}</title></Head>
      <div className="space-y-5">
        <h1 className="page-title flex items-center gap-2">
          <MessageCircle size={22} className="text-ocean" /> {t('messages.heading')}
        </h1>

        {convs.length === 0 ? (
          <div className="card p-10 text-center space-y-2">
            <p className="text-[var(--color-text-muted)]">{t('messages.empty')}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('messages.emptyHint').split('{link}')[0]}
              <Link href="/friends" className="text-ocean hover:underline">{t('friends.heading')}</Link>
              {t('messages.emptyHint').split('{link}')[1]}
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-ocean/10">
            {convs.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.otherUid}`}
                className="flex items-center gap-3 p-3.5 hover:bg-surface-dark transition-colors"
              >
                {c.otherPhoto ? (
                  <img src={c.otherPhoto} alt={c.otherName} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold shrink-0">
                    {c.otherName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-[var(--color-text)] truncate">{c.otherName}</p>
                    {c.lastMessageAt && <span className="text-[10px] text-[var(--color-text-muted)] flex-shrink-0">{formatMessageTime(c.lastMessageAt)}</span>}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] truncate mt-0.5">
                    {c.lastMessage || t('messages.noMessages')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
