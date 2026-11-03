// ─── SOCIAL FEATURES ─────────────────────────────────────────
// Pertemanan, grup, chat, share, dan stiker — semua disimpan di
// Firestore free tier dengan trik Base64 (tanpa Storage).

import {
  auth,
  db,
  resizeAndCompressImage,
} from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  documentId,
  Timestamp,
} from 'firebase/firestore'

// ─── TYPES ───────────────────────────────────────────────────

// Email TIDAK pernah disimpan/dikembalikan ke client lain. Dokumen user bisa
// dibaca user login (untuk pencarian), jadi data pribadi wajib minim.
export interface SocialUser {
  uid: string
  displayName: string
  photoURL: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface FriendRequest {
  id: string
  from: SocialUser
  to: SocialUser
  status: FriendshipStatus
  createdAt: any
}

export interface Group {
  id: string
  name: string
  description: string
  ownerId: string
  memberIds: string[]
  members?: GroupMember[]
  createdAt: any
  updatedAt: any
}

export interface GroupMember {
  uid: string
  displayName: string
  photoURL: string
  role: 'owner' | 'member'
}

export type MessageType = 'text' | 'share' | 'sticker'

export interface SharePayload {
  kind: 'anime' | 'manga' | 'webtoon' | 'novel'
  slug: string
  title: string
  image: string
  href: string
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderPhoto: string
  type: MessageType
  text?: string
  share?: SharePayload
  sticker?: string // base64 data URL
  createdAt: any
}

export interface Conversation {
  id: string
  memberIds: string[]
  lastMessage?: string
  lastMessageAt?: any
  updatedAt?: any
}

// ─── STICKER COMPRESSION (Base64 trick) ──────────────────────
// Dipakai juga di firebase.ts untuk avatar. Di-export ulang biar
// konsisten: stiker dipangkas kecil (128px) biar aman buat Firestore.

export async function compressStickerImage(file: File): Promise<string | null> {
  try {
    const attempts: [number, number][] = [
      [160, 0.7],
      [128, 0.5],
    ]
    let base64 = ''
    for (const [dimension, quality] of attempts) {
      base64 = await resizeAndCompressImage(file, dimension, quality)
      if (base64.length <= 200 * 1024) break
    }
    return base64.length <= 200 * 1024 ? base64 : null
  } catch {
    return null
  }
}

// ─── HELPER: current user info ───────────────────────────────

export function getCurrentUser() {
  return auth?.currentUser ?? null
}

export function getSocialProfile(user: any): SocialUser {
  return {
    uid: user.uid,
    displayName: user.displayName || 'KiraFan',
    photoURL: user.photoURL || '',
  }
}

// ─── USERS (lookup untuk add friend / add member) ────────────

export async function searchUsersByKeyword(keyword: string): Promise<SocialUser[]> {
  const me = getCurrentUser()
  if (!me) return []
  const q = keyword.trim().toLowerCase()
  // Minimal 2 karakter + tolak pencarian berbasis email (termasuk token lama
  // yang mungkin masih tersimpan di dokumen user versi sebelumnya).
  if (q.length < 2 || q.includes('@')) return []

  try {
    const userRef = collection(db, 'users')

    // Query 1: array-contains di `keywords` — cocok dengan kata apa pun di nama
    // (mis. cari "Santoso" ketemu "Budi Santoso").
    const [byKeyword, byPrefix] = await Promise.all([
      getDocs(query(userRef, where('keywords', 'array-contains', q), limit(10))),
      // Query 2: prefix searchName sebagai cadangan buat user lama yang belum punya `keywords`
      getDocs(
        query(
          userRef,
          where('searchName', '>=', q),
          where('searchName', '<=', q + '\uf8ff'),
          limit(10)
        )
      ),
    ])

    const seen = new Set<string>()
    const results: SocialUser[] = []

    for (const snap of [byKeyword, byPrefix]) {
      for (const d of snap.docs) {
        const u: any = d.data()
        const uid = u.uid || d.id
        if (uid === me.uid || seen.has(uid)) continue
        seen.add(uid)
        results.push({
          uid,
          displayName: u.displayName || u.searchName || 'KiraFan',
          photoURL: u.photoURL || '',
        })
      }
    }

    return results
  } catch {
    return []
  }
}

export async function getUserById(uid: string): Promise<SocialUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const u: any = snap.data()
    return {
      uid: u.uid || uid,
      displayName: u.displayName || u.searchName || 'KiraFan',
      photoURL: u.photoURL || '',
    }
  } catch {
    return null
  }
}

/**
 * Ambil banyak user sekaligus dengan `documentId() in` (maks 10 per query),
 * supaya daftar teman/percakapan tidak memicu N+1 read.
 */
export async function getUsersByIds(uids: string[]): Promise<SocialUser[]> {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  if (unique.length === 0) return []

  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10))

  try {
    const snaps = await Promise.all(
      chunks.map((chunk) =>
        getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)))
      )
    )
    const byId = new Map<string, SocialUser>()
    for (const snap of snaps) {
      for (const d of snap.docs) {
        const u: any = d.data()
        byId.set(d.id, {
          uid: u.uid || d.id,
          displayName: u.displayName || u.searchName || 'KiraFan',
          photoURL: u.photoURL || '',
        })
      }
    }
    // Pertahankan urutan input supaya tampilan stabil.
    return unique.map((uid) => byId.get(uid)).filter((u): u is SocialUser => Boolean(u))
  } catch {
    return []
  }
}

// ─── FRIENDSHIP ──────────────────────────────────────────────
// Pakai koleksi top-level `friendships/{reqId_to_uid}`:
//  - doc A_B = request dari A ke B, status pending
//  - setelah diterima, tulis juga doc B_A dengan status accepted
// Jadi tiap user gampang query "pending buat aku" dan "daftar teman".

function friendshipId(a: string, b: string) {
  return `${a}_to_${b}`
}

export async function sendFriendRequest(toUid: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  if (me.uid === toUid) return { success: false, error: 'Gak bisa temenan sama diri sendiri~' }

  try {
    const myInfo = getSocialProfile(me)
    const toUser = await getUserById(toUid)
    if (!toUser) return { success: false, error: 'User tidak ditemukan' }

    const reqId = friendshipId(me.uid, toUid)
    const reqRef = doc(db, 'friendships', reqId)
    const existing = await getDoc(reqRef)
    if (existing.exists()) {
      const d = existing.data()
      if (d.status === 'accepted') return { success: false, error: 'Kamu sudah berteman~' }
      return { success: false, error: 'Permintaan sudah terkirim' }
    }

    await setDoc(reqRef, {
      from: myInfo,
      to: toUser,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('sendFriendRequest failed:', error)
    const msg =
      (error as any)?.code === 'permission-denied'
        ? 'Firestore rules menolak: collection friendships belum diizinkan di rules'
        : (error as any)?.code === 'not-found'
          ? 'Teman tidak ditemukan di Firestore'
          : 'Gagal kirim permintaan: ' + ((error as any)?.message || 'error tak dikenal')
    return { success: false, error: msg }
  }
}

export async function acceptFriendRequest(fromUid: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }

  try {
    const myInfo = getSocialProfile(me)
    const fromUser = await getUserById(fromUid)
    if (!fromUser) return { success: false, error: 'User tidak ditemukan' }

    const reqRef = doc(db, 'friendships', friendshipId(fromUid, me.uid))
    const reqSnap = await getDoc(reqRef)
    if (!reqSnap.exists() || reqSnap.data().status !== 'pending') {
      return { success: false, error: 'Permintaan tidak ditemukan' }
    }

    // Tandai accepted di dua arah biar dua-duanya gampang query.
    await updateDoc(reqRef, { status: 'accepted', acceptedAt: serverTimestamp() })
    await setDoc(doc(db, 'friendships', friendshipId(me.uid, fromUid)), {
      from: myInfo,
      to: fromUser,
      status: 'accepted',
      acceptedAt: serverTimestamp(),
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menerima permintaan' }
  }
}

export async function declineFriendRequest(fromUid: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId(fromUid, me.uid)))
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menolak permintaan' }
  }
}

export async function removeFriend(friendUid: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId(me.uid, friendUid)))
    await deleteDoc(doc(db, 'friendships', friendshipId(friendUid, me.uid)))
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menghapus teman' }
  }
}

export async function getIncomingRequests(): Promise<FriendRequest[]> {
  const me = getCurrentUser()
  if (!me) return []
  try {
    const reqRef = collection(db, 'friendships')
    const snap = await getDocs(
      query(reqRef, where('to.uid', '==', me.uid), where('status', '==', 'pending'), limit(30))
    )
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  } catch {
    return []
  }
}

export async function getFriendIds(): Promise<string[]> {
  const me = getCurrentUser()
  if (!me) return []
  try {
    const reqRef = collection(db, 'friendships')
    const snap = await getDocs(
      query(reqRef, where('from.uid', '==', me.uid), where('status', '==', 'accepted'))
    )
    return snap.docs.map((d) => (d.data() as any).to?.uid).filter(Boolean)
  } catch {
    return []
  }
}

export async function getFriends(): Promise<SocialUser[]> {
  const ids = await getFriendIds()
  if (ids.length === 0) return []
  // Satu kali batch read, bukan satu read per teman.
  return getUsersByIds(ids.slice(0, 30))
}

// ─── GROUPS ──────────────────────────────────────────────────

export async function createGroup(
  name: string,
  description: string,
  memberUids: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }

  try {
    const myInfo = getSocialProfile(me)
    // Batasi jumlah member agar sesuai rules dan tidak dipakai untuk spam.
    const memberIds = Array.from(new Set([me.uid, ...memberUids])).slice(0, 50)
    const members: GroupMember[] = [
      { uid: me.uid, displayName: myInfo.displayName, photoURL: myInfo.photoURL, role: 'owner' },
    ]
    for (const uid of memberIds) {
      if (uid === me.uid) continue
      const u = await getUserById(uid)
      if (u) members.push({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, role: 'member' })
    }

    const groupRef = await addDoc(collection(db, 'groups'), {
      name: name.trim().slice(0, 60),
      description: description.trim().slice(0, 300),
      ownerId: me.uid,
      memberIds: members.map((m) => m.uid),
      members,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { success: true, id: groupRef.id }
  } catch {
    return { success: false, error: 'Gagal membuat grup' }
  }
}

export async function getMyGroups(): Promise<Group[]> {
  const me = getCurrentUser()
  if (!me) return []
  try {
    // Group membership disimpan di dokumen grup (bukan mirror per user),
    // jadi cukup satu query array-contains.
    const snap = await getDocs(
      query(
        collection(db, 'groups'),
        where('memberIds', 'array-contains', me.uid),
        orderBy('updatedAt', 'desc'),
        limit(50)
      )
    )
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  } catch {
    return []
  }
}

export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const snap = await getDoc(doc(db, 'groups', groupId))
    return snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null
  } catch {
    return null
  }
}

export async function addGroupMembers(
  groupId: string,
  memberUids: string[]
): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  if (memberUids.length === 0) return { success: true }

  try {
    const group = await getGroup(groupId)
    if (!group) return { success: false, error: 'Grup tidak ditemukan' }
    if (group.ownerId !== me.uid) return { success: false, error: 'Hanya owner yang bisa menambah member' }

    const existingIds = group.memberIds || []
    const newMemberIds = memberUids
      .filter((u) => u && !existingIds.includes(u))
      .slice(0, Math.max(0, 50 - existingIds.length))
    if (newMemberIds.length === 0) return { success: true }

    const members = [...(group.members || [])]
    for (const uid of newMemberIds) {
      const u = await getUserById(uid)
      if (u) members.push({ uid: u.uid, displayName: u.displayName, photoURL: u.photoURL, role: 'member' })
    }

    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayUnion(...newMemberIds),
      members,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menambah member' }
  }
}

export async function removeGroupMember(
  groupId: string,
  memberUid: string
): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  try {
    const group = await getGroup(groupId)
    if (!group) return { success: false, error: 'Grup tidak ditemukan' }
    if (group.ownerId !== me.uid) return { success: false, error: 'Hanya owner yang bisa menghapus member' }
    if (memberUid === group.ownerId) {
      return { success: false, error: 'Owner tidak bisa dikeluarkan. Hapus grup saja ya~' }
    }

    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayRemove(memberUid),
      members: (group.members || []).filter((m: GroupMember) => m.uid !== memberUid),
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menghapus member' }
  }
}

/**
 * Keluar dari grup. Owner tidak bisa keluar — harus menghapus grup agar tidak
 * ada grup tanpa pemilik.
 */
export async function leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  try {
    const group = await getGroup(groupId)
    if (!group) return { success: false, error: 'Grup tidak ditemukan' }
    if (!(group.memberIds || []).includes(me.uid)) {
      return { success: false, error: 'Kamu bukan member grup ini' }
    }
    if (group.ownerId === me.uid) {
      return { success: false, error: 'Owner tidak bisa keluar. Hapus grup saja ya~' }
    }

    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayRemove(me.uid),
      members: (group.members || []).filter((m: GroupMember) => m.uid !== me.uid),
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal keluar dari grup' }
  }
}

export async function deleteGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  try {
    const group = await getGroup(groupId)
    if (!group) return { success: false, error: 'Grup tidak ditemukan' }
    if (group.ownerId !== me.uid) return { success: false, error: 'Hanya owner yang bisa menghapus grup' }
    await deleteDoc(doc(db, 'groups', groupId))
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menghapus grup' }
  }
}

// ─── MESSAGES (group + DM) ───────────────────────────────────
// Path chat:
//   - DM:  conversations/{convId}/messages/{msgId}
//   - Grup: groups/{groupId}/messages/{msgId}

export function conversationId(a: string, b: string) {
  return [a, b].sort().join('_')
}

export async function getOrCreateConversation(otherUid: string): Promise<string | null> {
  const me = getCurrentUser()
  if (!me || !otherUid || otherUid === me.uid) return null
  const convId = conversationId(me.uid, otherUid)
  try {
    const convRef = doc(db, 'conversations', convId)
    const snap = await getDoc(convRef)
    if (!snap.exists()) {
      await setDoc(convRef, {
        memberIds: [me.uid, otherUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: '',
      })
    }
    return convId
  } catch {
    return null
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const me = getCurrentUser()
  if (!me) return []
  try {
    const convRef = collection(db, 'conversations')
    const snap = await getDocs(
      query(convRef, where('memberIds', 'array-contains', me.uid), orderBy('updatedAt', 'desc'), limit(20))
    )
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  } catch {
    return []
  }
}

/**
 * Href share hanya boleh path internal (diawali "/" tapi bukan "//") atau URL
 * https. Ini mencegah `javascript:`/`data:` XSS saat link dirender.
 */
export function isSafeShareHref(href: unknown): boolean {
  if (typeof href !== 'string') return false
  const value = href.trim()
  if (!value) return false
  // Backslash bisa dinormalisasi browser menjadi "//" (open redirect).
  if (value.includes('\\')) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeSharePayload(share: SharePayload): SharePayload | null {
  if (!share || !isSafeShareHref(share.href)) return null
  if (typeof share.image !== 'string' || !/^https?:\/\//i.test(share.image)) return null
  const kind = ['anime', 'manga', 'webtoon', 'novel'].includes(share.kind) ? share.kind : 'anime'
  return {
    kind,
    slug: String(share.slug || '').slice(0, 200),
    title: String(share.title || 'Tanpa judul').slice(0, 200),
    image: share.image,
    href: share.href,
  }
}

export async function sendMessage(
  path: 'group' | 'dm',
  targetId: string,
  msg: { type: MessageType; text?: string; share?: SharePayload; sticker?: string }
): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }

  let share = msg.share || null
  if (msg.type === 'share') {
    share = share ? sanitizeSharePayload(share) : null
    if (!share) return { success: false, error: 'Data share tidak valid' }
  }

  try {
    const myInfo = getSocialProfile(me)
    const base =
      path === 'group'
        ? collection(db, 'groups', targetId, 'messages')
        : collection(db, 'conversations', targetId, 'messages')

    await addDoc(base, {
      senderId: me.uid,
      senderName: myInfo.displayName,
      senderPhoto: myInfo.photoURL,
      type: msg.type,
      text: (msg.text || '').slice(0, 2000),
      share,
      sticker: msg.sticker || '',
      createdAt: serverTimestamp(),
    })

    const summary =
      msg.type === 'text' ? (msg.text || '').slice(0, 120) : msg.type === 'share' ? `📺 ${share?.title}` : '🖼 Stiker'
    if (path === 'group') {
      await updateDoc(doc(db, 'groups', targetId), {
        updatedAt: serverTimestamp(),
        lastMessage: summary,
        lastMessageAt: serverTimestamp(),
      })
    } else {
      await updateDoc(doc(db, 'conversations', targetId), {
        updatedAt: serverTimestamp(),
        lastMessage: summary,
        lastMessageAt: serverTimestamp(),
      })
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal mengirim pesan' }
  }
}

export function subscribeMessages(
  path: 'group' | 'dm',
  targetId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const base =
    path === 'group'
      ? collection(db, 'groups', targetId, 'messages')
      : collection(db, 'conversations', targetId, 'messages')
  const q = query(base, orderBy('createdAt', 'asc'), limit(200))
  return onSnapshot(
    q,
    (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      callback(msgs)
    },
    (error) => {
      // Jangan biarkan listener error (mis. permission-denied) memicu unhandled rejection.
      console.warn('subscribeMessages error:', error?.code || error?.message || error)
      callback([])
    }
  )
}

// ─── STICKERS (per user, base64) ─────────────────────────────

export async function saveSticker(file: File): Promise<{ success: boolean; error?: string }> {
  const me = getCurrentUser()
  if (!me) return { success: false, error: 'Login dulu ya~' }
  const base64 = await compressStickerImage(file)
  if (!base64) return { success: false, error: 'Stiker terlalu besar, coba gambar lain ya~' }

  try {
    await addDoc(collection(db, 'users', me.uid, 'stickers'), {
      data: base64,
      createdAt: serverTimestamp(),
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Gagal menyimpan stiker' }
  }
}

export async function getMyStickers(): Promise<{ id: string; data: string }[]> {
  const me = getCurrentUser()
  if (!me) return []
  try {
    const snap = await getDocs(query(collection(db, 'users', me.uid, 'stickers'), orderBy('createdAt', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, data: d.data().data || '' }))
  } catch {
    return []
  }
}

export async function deleteSticker(stickerId: string): Promise<boolean> {
  const me = getCurrentUser()
  if (!me) return false
  try {
    await deleteDoc(doc(db, 'users', me.uid, 'stickers', stickerId))
    return true
  } catch {
    return false
  }
}

// ─── TIME FORMAT ─────────────────────────────────────────────

export function formatMessageTime(t: any): string {
  if (!t) return ''
  if (t instanceof Timestamp) t = t.toDate()
  else if (t?.seconds) t = new Date(t.seconds * 1000)
  else if (typeof t === 'string' || typeof t === 'number') t = new Date(t)
  if (!(t instanceof Date) || isNaN(t.getTime())) return ''
  const now = new Date()
  const sameDay = t.toDateString() === now.toDateString()
  const time = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return time
  return t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + time
}

// Kadang field createdAt dari serverTimestamp butuh delay render; helper biar aman.
export function toDate(value: any): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value?.seconds) return new Date(value.seconds * 1000)
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date()
}
