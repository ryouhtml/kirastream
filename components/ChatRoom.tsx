import { useState, useRef, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { Send, ImagePlus, X, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSettings } from '@/contexts/SettingsContext'
import { translate } from '@/lib/i18n'
import {
  sendMessage,
  subscribeMessages,
  saveSticker,
  getMyStickers,
  deleteSticker,
  formatMessageTime,
  isSafeShareHref,
  type ChatMessage,
} from '@/lib/social'

interface ChatRoomProps {
  path: 'group' | 'dm'
  targetId: string
}

export default function ChatRoom({ path, targetId }: ChatRoomProps) {
  const { user } = useAuth()
  const { language } = useSettings()
  const t = (key: string) => translate(language, key)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [stickers, setStickers] = useState<{ id: string; data: string }[]>([])
  const [stickerOpen, setStickerOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!targetId) return
    const unsub = subscribeMessages(path, targetId, setMessages)
    return () => unsub()
  }, [path, targetId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    getMyStickers().then(setStickers)
  }, [])

  const handleSend = async (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    await sendMessage(path, targetId, { type: 'text', text: trimmed })
    setText('')
    setSending(false)
  }

  const sendSticker = async (sticker: { id: string; data: string }) => {
    if (sending) return
    setSending(true)
    await sendMessage(path, targetId, { type: 'sticker', sticker: sticker.data })
    setSending(false)
    setStickerOpen(false)
  }

  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = await saveSticker(file)
    if (res.success) setStickers(await getMyStickers())
  }

  const handleDeleteSticker = async (id: string) => {
    const ok = await deleteSticker(id)
    if (ok) setStickers(await getMyStickers())
  }

  return (
    <div className="flex flex-col h-[65vh] md:h-[70vh]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-text-muted)] py-10">
            {t('chat.noMessages')}
          </p>
        ) : (
          messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} isMine={msg.senderId === user?.uid} isGroup={path === 'group'} t={t} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sticker tray */}
      {stickerOpen && (
        <div className="border-t border-ocean/10 p-3 bg-surface-dark/60">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{t('chat.myStickers')}</p>
            <button onClick={() => setStickerOpen(false)} className="p-1 rounded hover:bg-pearl/10" aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {stickers.map((s) => (
              <div key={s.id} className="relative group">
                <button
                  onClick={() => sendSticker(s)}
                  className="w-full aspect-square rounded-lg bg-white/5 hover:bg-white/10 transition-colors overflow-hidden"
                  title={t('chat.sendSticker')}
                >
                  <img src={s.data} alt="Stiker" className="w-full h-full object-contain" />
                </button>
                <button
                  onClick={() => handleDeleteSticker(s.id)}
                  className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500/90 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  aria-label={t('chat.deleteSticker')}
                  title={t('chat.deleteSticker')}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-square rounded-lg border-2 border-dashed border-ocean/40 text-ocean hover:bg-ocean/10 transition-colors flex flex-col items-center justify-center gap-1"
            >
              <ImagePlus size={20} />
              <span className="text-[10px] font-semibold">{t('chat.add')}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleStickerUpload}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ocean/10 p-3">
        <button
          type="button"
          onClick={() => setStickerOpen((v) => !v)}
          className="p-2.5 rounded-lg bg-surface-dark hover:bg-surface-hover text-[var(--color-text-muted)] transition-colors"
          aria-label={t('chat.stickers')}
          title={t('chat.stickers')}
        >
          <ImagePlus size={18} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('chat.placeholder')}
          className="flex-1 input-field py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="btn-primary p-2.5"
          aria-label={t('chat.send')}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}

function MessageRow({ msg, isMine, isGroup, t }: { msg: ChatMessage; isMine: boolean; isGroup: boolean; t: (key: string) => string }) {
  const showIdentity = isGroup && !isMine
  // Jangan pernah render href yang tidak aman (mis. `javascript:` dari data lama).
  const shareHref = msg.share && isSafeShareHref(msg.share.href) ? msg.share.href : ''

  if (msg.type === 'sticker') {
    return (
      <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {showIdentity && <Avatar msg={msg} />}
        <div className={`max-w-[60%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
          {showIdentity && <SenderName msg={msg} />}
          <div className="p-2 rounded-2xl border border-ocean/10 bg-surface-dark">
            {msg.sticker ? (
              <img src={msg.sticker} alt="Stiker" className="w-24 h-24 object-contain" />
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{t('chat.stickerBroken')}</p>
            )}
          </div>
          <Time msg={msg} />
        </div>
      </div>
    )
  }

  if (msg.type === 'share') {
    return (
      <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {showIdentity && <Avatar msg={msg} />}
        <div className={`max-w-[85%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
          {showIdentity && <SenderName msg={msg} />}
          <div className={`p-3 rounded-2xl border ${isMine ? 'border-primary/20 bg-primary/10' : 'border-ocean/10 bg-surface-dark'}`}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-1">
              {t('chat.share').replace('{kind}', msg.share?.kind || '')}
            </p>
            {msg.share && shareHref ? (
              <Link href={shareHref} className="flex items-center gap-3 group">
                {msg.share.image ? (
                  <img
                    src={`/api/proxy?url=${encodeURIComponent(msg.share.image)}`}
                    alt={msg.share.title}
                    className="w-12 h-16 object-cover rounded-md"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                ) : null}
                <p className="text-sm font-semibold text-[var(--color-text)] group-hover:text-ocean transition-colors">
                  {msg.share.title}
                </p>
              </Link>
            ) : (
              <p className="text-sm font-semibold text-[var(--color-text)]">{msg.share?.title}</p>
            )}
          </div>
          <Time msg={msg} />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {showIdentity && <Avatar msg={msg} />}
      <div className={`max-w-[85%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
        {showIdentity && <SenderName msg={msg} />}
        <div
          className={`px-4 py-2 rounded-full text-sm border ${
            isMine
              ? 'bg-primary text-white dark:text-noir border-primary'
              : 'bg-surface-dark text-[var(--color-text)] border-ocean/15'
          }`}
        >
          {msg.text}
        </div>
        <Time msg={msg} />
      </div>
    </div>
  )
}

function Avatar({ msg }: { msg: ChatMessage }) {
  return msg.senderPhoto ? (
    <img src={msg.senderPhoto} alt={msg.senderName || 'KiraFan'} className="w-7 h-7 rounded-full object-cover shrink-0 mb-1" />
  ) : (
    <div className="w-7 h-7 rounded-full bg-ocean/30 text-[var(--color-text)] flex items-center justify-center text-[11px] font-bold shrink-0 mb-1">
      {(msg.senderName || '?')[0]?.toUpperCase() || '?'}
    </div>
  )
}

function SenderName({ msg }: { msg: ChatMessage }) {
  return (
    <p className="text-[11px] text-[var(--color-text-muted)] mb-1 ml-1">
      {msg.senderName || 'KiraFan'}
    </p>
  )
}

function Time({ msg }: { msg: ChatMessage }) {
  return <p className="text-[10px] text-[var(--color-text-muted)] mt-1 mx-1">{formatMessageTime(msg.createdAt)}</p>
}
