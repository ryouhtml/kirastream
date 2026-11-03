import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Users, UserPlus, Search, MessageCircle, Check, X, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import {
  getFriends,
  getIncomingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsersByKeyword,
  type SocialUser,
  type FriendRequest,
} from '@/lib/social'

type Tab = 'friends' | 'requests' | 'add'

export default function FriendsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<SocialUser[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SocialUser[]>([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const [f, r] = await Promise.all([getFriends(), getIncomingRequests()])
    setFriends(f)
    setRequests(r)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    loadAll()
  }, [user, authLoading, router, loadAll])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const res = await searchUsersByKeyword(query)
      setResults(res)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const runAction = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id)
    setError('')
    const res = await fn()
    if (res && res.success === false && res.error) {
      setError(res.error)
    }
    setBusyId('')
    await loadAll()
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Head><title>{t('friends.title')}</title></Head>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Users size={22} className="text-ocean" /> {t('friends.heading')}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('friends.subtitle')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-ocean/10 pb-3 overflow-x-auto">
          {(['friends', 'requests', 'add'] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`tab flex-shrink-0 capitalize ${tab === tb ? 'active' : ''}`}
            >
              {tb === 'friends' ? t('friends.tabFriends') : tb === 'requests' ? `${t('friends.tabRequests')} (${requests.length})` : t('friends.tabAdd')}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Friends */}
        {tab === 'friends' && (
          <div className="card p-4 space-y-2">
            {friends.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-muted)] py-8">
                {t('friends.noFriends')}
              </p>
            ) : (
              friends.map((f) => (
                <div key={f.uid} className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl hover:bg-surface-dark transition-colors">
                  {f.photoURL ? (
                    <img src={f.photoURL} alt={f.displayName} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold shrink-0">
                      {f.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text)] truncate">{f.displayName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/messages/${f.uid}`} className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5">
                      <MessageCircle size={14} /> {t('friends.chat')}
                    </Link>
                    <button
                      onClick={() => runAction(f.uid, () => removeFriend(f.uid))}
                      disabled={busyId === f.uid}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {busyId === f.uid ? <Loader2 size={14} className="animate-spin" /> : t('friends.remove')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div className="card p-4 space-y-2">
            {requests.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-muted)] py-8">{t('friends.noRequests')}</p>
            ) : (
              requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl hover:bg-surface-dark transition-colors">
                  {r.from.photoURL ? (
                    <img src={r.from.photoURL} alt={r.from.displayName} className="w-11 h-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold shrink-0">
                      {r.from.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text)] truncate">{r.from.displayName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{t('friends.requestHint')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => runAction(r.from.uid, () => acceptFriendRequest(r.from.uid))}
                      disabled={busyId === r.from.uid}
                      className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                    >
                      {busyId === r.from.uid ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> {t('friends.accept')}</>}
                    </button>
                    <button
                      onClick={() => runAction(r.from.uid, () => declineFriendRequest(r.from.uid))}
                      disabled={busyId === r.from.uid}
                      className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                    >
                      <X size={14} /> {t('friends.decline')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add friend */}
        {tab === 'add' && (
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-dark">
              <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('friends.searchPlaceholder')}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
              />
            </div>

            {searching && (
              <p className="text-center text-sm text-[var(--color-text-muted)]">{t('friends.searching')}</p>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <p className="text-center text-sm text-[var(--color-text-muted)] py-4">
                {t('friends.searchEmpty')}
              </p>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((u) => (
                  <div key={u.uid} className="flex flex-wrap items-center gap-3 p-2.5 rounded-xl hover:bg-surface-dark transition-colors">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold shrink-0">
                        {u.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--color-text)] truncate">{u.displayName}</p>
                    </div>
                    <button
                      onClick={() => runAction(u.uid, () => sendFriendRequest(u.uid))}
                      disabled={busyId === u.uid || friends.some((f) => f.uid === u.uid)}
                      className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                    >
                      {busyId === u.uid ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : friends.some((f) => f.uid === u.uid) ? (
                        t('friends.alreadyFriends')
                      ) : (
                        <><UserPlus size={14} /> {t('friends.sendRequest')}</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
