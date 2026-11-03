import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowLeft, Users, Loader2, X, UserMinus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import {
  getGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  getFriends,
  type Group,
  type GroupMember,
  type SocialUser,
} from '@/lib/social'
import ChatRoom from '@/components/ChatRoom'

export default function GroupDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { user, loading: authLoading } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  const [group, setGroup] = useState<Group | null>(null)
  const [friends, setFriends] = useState<SocialUser[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!id) return

    const load = async () => {
      const [g, f] = await Promise.all([getGroup(String(id)), getFriends()])
      if (!g) {
        setLoading(false)
        return
      }
      setGroup(g)
      const memberIds = new Set(g.memberIds || [])
      setFriends(f.filter((fr) => !memberIds.has(fr.uid)))
      setLoading(false)
    }
    load()
  }, [id, user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-[var(--color-text-muted)]">{t('groups.notFound')}</p>
        <Link href="/groups" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {t('groups.backToGroups')}
        </Link>
      </div>
    )
  }

  const isOwner = group.ownerId === user?.uid
  const isMember = (group.memberIds || []).includes(user?.uid || '')

  if (!isMember) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-[var(--color-text-muted)]">{t('groups.notMember')}</p>
        <Link href="/groups" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> {t('common.back')}
        </Link>
      </div>
    )
  }

  const toggleSelect = (uid: string) => {
    setSelected((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]))
  }

  const handleInvite = async () => {
    if (selected.length === 0 || saving) return
    setSaving(true)
    const res = await addGroupMembers(group.id, selected)
    setSaving(false)
    if (res.success) {
      const g = await getGroup(group.id)
      if (g) setGroup(g)
      setInviteOpen(false)
      setSelected([])
    }
  }

  const handleKick = async (uid: string, name: string) => {
    if (!confirm(t('groups.confirmKick').replace('{name}', name))) return
    const res = await removeGroupMember(group.id, uid)
    if (res.success) {
      const g = await getGroup(group.id)
      if (g) setGroup(g)
    }
  }

  const handleLeave = async () => {
    if (!user) return
    if (!confirm(t('groups.confirmLeave'))) return
    const res = await leaveGroup(group.id)
    if (res.success) router.push('/groups')
  }

  const members = (group.members || []) as GroupMember[]

  return (
    <>
      <Head><title>{t('groups.detailTitle').replace('{name}', group.name)}</title></Head>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/groups" className="btn-secondary p-2" aria-label={t('common.back')}>
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-[var(--color-text)] truncate flex items-center gap-2">
              <Users size={18} className="text-ocean shrink-0" /> {group.name}
            </h1>
            {group.description && <p className="text-xs text-[var(--color-text-muted)] truncate">{group.description}</p>}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Users size={16} className="text-ocean" /> {t('groups.memberCount').replace('{n}', String(members.length))}
            </h2>
            <button onClick={() => setInviteOpen(true)} className="btn-secondary text-xs px-3 py-1.5">
              {t('groups.invite')}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {members.map((m) => (
              <div key={m.uid} className="flex items-center gap-2 p-2 rounded-xl bg-surface-dark">
                {m.photoURL ? (
                  <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold text-xs shrink-0">
                    {m.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate">{m.displayName}</p>
                  {m.uid === group.ownerId && <p className="text-[10px] text-ocean">{t('groups.owner')}</p>}
                </div>
                {isOwner && m.uid !== user?.uid && (
                  <button
                    onClick={() => handleKick(m.uid, m.displayName)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400"
                    aria-label={t('groups.kickAria').replace('{name}', m.displayName)}
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner ? null : (
            <button onClick={handleLeave} className="text-xs text-red-400 hover:text-red-300 mt-3">
              {t('groups.leave')}
            </button>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <ChatRoom path="group" targetId={group.id} />
        </div>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-noir/60 backdrop-blur-sm"
            onClick={() => setInviteOpen(false)}
            aria-label={t('common.close')}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md card p-5 max-h-[85vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[var(--color-text)] flex items-center gap-2">
                <Users size={18} className="text-ocean" /> {t('groups.inviteTitle')}
              </h2>
              <button onClick={() => setInviteOpen(false)} className="p-2 rounded-lg hover:bg-pearl/10" aria-label={t('common.close')}>
                <X size={18} />
              </button>
            </div>

            {friends.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                {t('groups.inviteEmpty')}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1 mb-4">
                {friends.map((f) => {
                  const active = selected.includes(f.uid)
                  return (
                    <button
                      key={f.uid}
                      onClick={() => toggleSelect(f.uid)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${
                        active ? 'bg-ocean/20' : 'hover:bg-surface-dark'
                      }`}
                    >
                      {f.photoURL ? (
                        <img src={f.photoURL} alt={f.displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center font-bold shrink-0">
                          {f.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="flex-1 text-sm text-[var(--color-text)] truncate text-left">{f.displayName}</span>
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 ${
                          active ? 'bg-ocean border-ocean text-white' : 'border-pearl/30'
                        }`}
                      >
                        {active && '✓'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleInvite}
              disabled={selected.length === 0 || saving}
              className="btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : t('groups.inviteBtn')}
            </button>
          </div>
        </>
      )}
    </>
  )
}
