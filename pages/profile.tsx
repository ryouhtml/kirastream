import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Pencil, Clapperboard, Clock, Star, BookmarkPlus, PlayCircle, CheckCircle, Ban, Sparkles, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { getUserFirestore, uploadAvatarBase64, updateUserFirestore } from '@/lib/firebase'
import { getHistory, getFavorites, getWatchlistByStatus, getContinueWatching } from '@/lib/firebase'
import { translate } from '@/lib/i18n'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, updateProfile, refreshProfile, loading: authLoading } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)

  // Helpers untuk history multi-tipe (anime/manga/webtoon/novel)
  const getDetailHref = (item: any) => {
    switch (item.type) {
      case 'manga': return `/manga/${item.slug}`
      case 'webtoon': return `/webtoon/${item.slug}`
      case 'novel': return `/novel/${item.slug}`
      default: return `/anime/detail/${item.slug}`
    }
  }

  const getHistoryImage = (item: any) => {
    if (!item.image) return '/default.jpg'
    if (item.type === 'manga' || item.type === 'webtoon') {
      return `/api/proxy?url=${encodeURIComponent(item.image)}`
    }
    return item.image
  }

  const getTypeLabel = (item: any) => {
    switch (item.type) {
      case 'manga': return t('nav.manga')
      case 'webtoon': return t('nav.webtoon')
      case 'novel': return t('nav.novel')
      default: return t('nav.anime')
    }
  }
  
  const [profile, setProfile] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [watchlist, setWatchlist] = useState<any[]>([])
  const [continueWatching, setContinueWatching] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'favorites' | 'watchlist'>('overview')
  
  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (authLoading) return
    
    if (!user) {
      router.push('/login')
      return
    }

    const loadProfile = async () => {
      try {
        const userData = await getUserFirestore(user.uid)
        setProfile(userData)
        setEditName(userData?.displayName || '')
        setEditBio(userData?.bio || '')
        
        const [hist, favs, wl, cw] = await Promise.all([
          getHistory(20),
          getFavorites(),
          getWatchlistByStatus(),
          getContinueWatching(),
        ])
        
        setHistory(hist)
        setFavorites(favs)
        setWatchlist(wl)
        setContinueWatching(cw)
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, authLoading, router])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({ displayName: editName })
      await updateUserFirestore(user!.uid, { displayName: editName, bio: editBio })
      setProfile({ ...profile, displayName: editName, bio: editBio })
      await refreshProfile()
      setEditMode(false)
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      router.push('/')
    } finally {
      setLoggingOut(false)
    }
  }

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset input biar bisa pilih file yang sama lagi kalau gagal
    if (!file || !user) return

    setAvatarUploading(true)
    setAvatarError('')
    try {
      const result = await uploadAvatarBase64(file, user.uid)
      if (result.success) {
        setProfile((prev: any) => ({ ...prev, photoURL: result.url }))
        await refreshProfile()
      } else {
        setAvatarError(typeof result.error === 'string' ? result.error : t('profile.avatarError'))
      }
    } catch {
      setAvatarError(t('profile.avatarError'))
    } finally {
      setAvatarUploading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Calculate stats
  const stats = {
    watchedEpisodes: profile?.stats?.watchedEpisodes || history.length * 3 || 0,
    totalHours: profile?.stats?.totalHours || Math.round(history.length * 0.4) || 0,
    favorites: favorites.length,
    watchlist: watchlist.length,
    continueWatching: continueWatching.length,
  }

  return (
    <>
      <Head>
        <title>{t('profile.title')}</title>
      </Head>

      <div className="space-y-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          {/* Banner */}
          <div 
            className="h-32 md:h-48"
            style={{ 
              background: profile?.bannerColor || 'linear-gradient(135deg, #1a237e, #5B88B2, #A8C7FA)' 
            }}
          />

          {/* Profile Info */}
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-12 md:-mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-ocean border-4 border-surface-card flex items-center justify-center overflow-hidden">
                  {profile?.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {(profile?.displayName || '?')[0].toUpperCase()}
                    </span>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary dark:bg-accent rounded-full cursor-pointer hover:opacity-90 transition-colors">
                  <svg className="w-4 h-4 text-white dark:text-noir" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={handleAvatarUpload}
                  />
                </label>
                {avatarError && (
                  <p className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-max max-w-[200px] text-center text-xs text-red-400">
                    {avatarError}
                  </p>
                )}
              </div>

              {/* Name & Bio */}
              <div className="flex-1 text-center md:text-left pb-2">
                {editMode ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input-field text-xl font-bold"
                      placeholder={t('profile.name')}
                    />
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="input-field text-sm"
                      placeholder={t('profile.bioPlaceholder')}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="btn-primary text-sm"
                      >
                        {saving ? t('profile.saving') : t('profile.save')}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="btn-secondary text-sm"
                      >
                        {t('profile.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-display font-bold text-[var(--color-text)]">
                      {profile?.displayName || 'KiraFan'}
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm mb-2">{user.email}</p>
                    {profile?.bio && (
                      <p className="text-[var(--color-text)] text-sm">{profile.bio}</p>
                    )}
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-2 text-sm text-ocean hover:text-oceanAccent-secondary transition-colors inline-flex items-center gap-1.5"
                    >
                      <Pencil size={14} aria-hidden="true" /> {t('profile.edit')}
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="mt-2 ml-4 text-sm text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <LogOut size={14} aria-hidden="true" />
                      {loggingOut ? t('profile.loggingOut') : t('profile.logout')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-ocean">{stats.watchedEpisodes}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('profile.episodesWatched')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-ocean">{stats.totalHours}h</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('profile.hours')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-ocean">{stats.favorites}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('profile.favorites')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-ocean">{stats.watchlist}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('profile.watchlist')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-ocean">{stats.continueWatching}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{t('profile.continueWatching')}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-ocean/20 overflow-x-auto">
            {(['overview', 'history', 'favorites', 'watchlist'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab flex-shrink-0 capitalize ${
                  activeTab === tab ? 'active' : ''
                }`}
              >
                {tab === 'overview' ? t('profile.tabOverview') :
                 tab === 'history' ? t('profile.tabHistory') :
                 tab === 'favorites' ? t('profile.favorites') : t('profile.watchlist')}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recap */}
                {history.length > 0 && (
                  <div className="rounded-xl p-4"
                    style={{ background: 'var(--color-surface-alt)' }}
                  >
                    <h3 className="font-bold text-[var(--color-text)] mb-3 flex items-center gap-2"><Sparkles size={18} className="text-ocean" /> {t('profile.recap')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="card p-3 text-center">
                        <div className="text-xl font-bold text-ocean">{history.length}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{t('profile.watchedTitles')}</div>
                      </div>
                      <div className="card p-3 text-center">
                        <div className="text-xl font-bold text-ocean">{favorites.length}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{t('profile.favorites')}</div>
                      </div>
                      <div className="card p-3 text-center">
                        <div className="text-xl font-bold text-ocean">
                          {watchlist.filter((w: any) => w.status === 'completed').length}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">{t('profile.watchedCompleted')}</div>
                      </div>
                      <div className="card p-3 text-center">
                        <div className="text-xl font-bold text-ocean">
                          {(() => {
                            const counts: Record<string, number> = {}
                            history.forEach((h: any) => {
                              const k = h.slug
                              counts[k] = (counts[k] || 0) + 1
                            })
                            const most = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]
                            return most ? (most[1] as number) : 0
                          })()}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">{t('profile.mostWatched')}</div>
                      </div>
                    </div>
                    {history.length > 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-3">
                        {t('profile.lastWatched').replace('{title}', history[0]?.title || '')}
                      </p>
                    )}
                  </div>
                )}

                {/* Continue Watching */}
                {continueWatching.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[var(--color-text)] mb-3 flex items-center gap-2"><Clapperboard size={18} className="text-ocean" /> {t('profile.continueWatching')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {continueWatching.slice(0, 4).map((item) => (
                        <a
                          key={item.slug}
                          href={getDetailHref(item)}
                          className="group"
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
                            <img
                              src={getHistoryImage(item)}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-dark">
                              <div 
                                className="h-full bg-ocean"
                                style={{ width: `${item.progress || 0}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-[var(--color-text)] truncate">{item.title}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent History */}
                {history.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[var(--color-text)] mb-3 flex items-center gap-2"><Clock size={18} className="text-ocean" /> {t('profile.recentHistory')}</h3>
                    <div className="space-y-2">
                      {history.slice(0, 5).map((item) => (
                        <a
                          key={item.slug || item.timestamp}
                          href={getDetailHref(item)}
                          className="flex items-center gap-3 p-2 hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <img
                            src={getHistoryImage(item)}
                            alt={item.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-[var(--color-text)] text-sm">{item.title}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {new Date(item.timestamp || item.lastWatchedAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                {history.length > 0 ? (
                  history.map((item) => (
                    <a
                      key={item.slug || item.timestamp}
                      href={getDetailHref(item)}
                      className="flex items-center gap-4 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                    >
                      <img
                        src={getHistoryImage(item)}
                        alt={item.title}
                        referrerPolicy={item.type === 'novel' ? 'no-referrer' : undefined}
                        className="w-16 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--color-text)]">{item.title}</p>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-ocean/20 text-[var(--color-text)] capitalize shrink-0">
                            {getTypeLabel(item)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {new Date(item.timestamp || item.lastWatchedAt).toLocaleString('id-ID')}
                        </p>
                        {item.progress > 0 && (
                          <div className="mt-1 h-1 bg-surface-dark rounded">
                            <div className="h-full bg-ocean rounded" style={{ width: `${item.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    {t('profile.noHistory')}
                  </div>
                )}
              </div>
            )}

            {/* Favorites */}
            {activeTab === 'favorites' && (
              <div className="space-y-2">
                {favorites.length > 0 ? (
                  favorites.map((item) => (
                    <a
                      key={item.slug}
                      href={`/anime/detail/${item.slug}`}
                      className="flex items-center gap-4 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                    >
                      <img
                        src={item.image || '/default.jpg'}
                        alt={item.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)]">{item.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1"><Star size={12} className="fill-[var(--color-accent)] text-[var(--color-accent)]" /> {item.score || 'N/A'}</p>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    {t('profile.noFavorites')}
                  </div>
                )}
              </div>
            )}

            {/* Watchlist */}
            {activeTab === 'watchlist' && (
              <div className="space-y-4">
                {watchlist.length > 0 ? (
                  watchlist.map((item) => (
                    <a
                      key={item.slug}
                      href={`/anime/detail/${item.slug}`}
                      className="flex items-center gap-4 p-3 hover:bg-surface-hover rounded-lg transition-colors"
                    >
                      <img
                        src={item.image || '/default.jpg'}
                        alt={item.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-text)]">{item.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)] capitalize inline-flex items-center gap-1.5">
                          {item.status === 'planning' && (<><BookmarkPlus size={14} /> {t('anime.wlPlanning')}</>)}
                          {item.status === 'watching' && (<><PlayCircle size={14} /> {t('anime.wlWatching')}</>)}
                          {item.status === 'completed' && (<><CheckCircle size={14} /> {t('anime.wlCompleted')}</>)}
                          {item.status === 'dropped' && (<><Ban size={14} /> {t('anime.wlDropped')}</>)}
                        </p>
                        {item.totalEpisodes > 0 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {t('profile.episodeProgress').replace('{progress}', String(item.progress || 0)).replace('{total}', String(item.totalEpisodes))}
                          </p>
                        )}
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    {t('profile.watchlistEmpty')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
