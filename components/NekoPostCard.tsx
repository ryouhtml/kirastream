import Link from 'next/link'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { nekoPostHref, type NekoPost } from '@/lib/neko'

const imageProxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`

/**
 * Kartu konten Neko. Link otomatis diarahkan ke detail (seri) atau
 * episode sesuai bentuk URL Nekopoi, kecuali `href` diberikan.
 */
export default function NekoPostCard({ item, href }: { item: NekoPost; href?: string }) {
  return (
    <Link href={href || nekoPostHref(item)} className="anime-card group">
      <div className="relative aspect-[3/4] bg-[var(--color-surface-alt)]">
        {item.thumbnail ? (
          <Image
            src={imageProxy(item.thumbnail)}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 30vw, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
            <ImageOff size={20} aria-hidden="true" />
          </div>
        )}
        {item.date && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium leading-snug text-white backdrop-blur-sm line-clamp-1">
            {item.date}
          </div>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-medium">{item.title}</p>
    </Link>
  )
}
